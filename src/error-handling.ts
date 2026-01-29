import { getMessageFromError } from '@fishka/assertions';
import { NextFunction } from 'express';
import { ApiResponse, HttpError } from './api.types';
import { getExpressApiConfig } from './config';
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR } from './http-status-codes';
import { getRequestLocalStorage } from './thread-local/thread-local-storage';

import { ExpressFunction, ExpressRequest, ExpressResponse } from './utils/express.utils';

// Track if async errors patch is already applied
let asyncErrorsPatchApplied = false;

/**
 * Converts any error into a standardized API response format.
 * - HttpError: Uses the error's status code and message
 * - Other errors: Returns 500 with the error message or 'Internal error'
 */
function buildApiResponse(error: unknown): ApiResponse & { status: number } {
  let response: ApiResponse & { status: number };

  if (error instanceof HttpError) {
    response = {
      error: error.message,
      status: error.status,
      details: error.details,
    } as ApiResponse & { status: number };
  } else {
    const errorMessage = getMessageFromError(error, '');
    response = {
      error: errorMessage && errorMessage.length > 0 ? errorMessage : 'Internal error',
      status: HTTP_INTERNAL_SERVER_ERROR,
    } as ApiResponse & { status: number };
  }

  return response;
}

/**
 * @Internal
 * Wraps a route handler to catch and convert errors to API responses.
 * Applied automatically to all routes registered via RouteTable.
 *
 * Catches:
 * - Errors thrown in validators ($path, $query, $body)
 * - Errors thrown in the run() handler
 * - Errors thrown in endpoint middlewares
 *
 * Logs errors to console (error level for 5xx).
 */
export function catchRouteErrors(fn: ExpressFunction): ExpressFunction {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const apiResponse = buildApiResponse(error);
      if (apiResponse.status >= HTTP_INTERNAL_SERVER_ERROR) {
        console.error(`catchRouteErrors: ${req.path}`, error);
      }

      // Добавляем requestId в заголовки, если он есть и функция включена
      const tls = getRequestLocalStorage();
      const headerName = getExpressApiConfig().requestIdHeader;
      if (tls?.requestId && headerName) {
        res.setHeader(headerName, tls.requestId);
      }

      res.status(apiResponse.status);
      res.send(apiResponse);
    }
  };
}

/**
 * Express error-handling middleware (4 parameters) for catching errors.
 * Can be mounted at any level - global, path-specific, or router-specific.
 *
 * @example
 * // Global
 * app.use(catchAllMiddleware);
 *
 * // Path-specific
 * app.use('/api', catchAllMiddleware);
 *
 * // Router-specific
 * const router = express.Router();
 * router.use(catchAllMiddleware);
 *
 * Catches:
 * - Errors from Express middleware (passed via next(error))
 * - JSON parsing errors (SyntaxError) - returns 400
 * - Any errors that escape catchRouteErrors
 *
 * Note: Individual routes are already wrapped with catchRouteErrors(),
 * so this middleware primarily catches middleware and parsing errors.
 */
export async function catchAllMiddleware(
  error: unknown,
  _: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction,
): Promise<void> {
  if (!error) {
    next();
    return;
  }
  // Report as critical. This kind of error should never happen.
  console.error('catchAllMiddleware:', getMessageFromError(error));
  const apiResponse =
    error instanceof SyntaxError // JSON body parsing error.
      ? buildApiResponse(new HttpError(HTTP_BAD_REQUEST, `Failed to parse request: ${error.message}`))
      : buildApiResponse(error);
  res.status(apiResponse.status);
  res.send(apiResponse);
}

/**
 * Patches Express to automatically catch errors from async route handlers.
 * Call this once at application startup, before defining routes.
 *
 * After patching, you can use async handlers without try/catch:
 * @example
 * patchExpressAsyncErrors();
 *
 * const app = express();
 *
 * app.get('/users', async (req, res) => {
 *   const user = await getUser(); // если упадёт - catchAllMiddleware поймает
 *   res.json(user);
 * });
 *
 * app.use(catchAllMiddleware);
 *
 * Note: This patches Express internal API. Works with Express 4.x and 5.x.
 * Safe to call multiple times - patch applies only once.
 */
export function patchExpressAsyncErrors(): void {
  if (asyncErrorsPatchApplied) {
    return;
  }
  asyncErrorsPatchApplied = true;

  // We use require here to access Express internals
  // This is the only way to patch the Layer prototype
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');

  // Get the Layer constructor from Express internals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Layer = (express as any).Router?.constructor || getLayerFromExpress();

  if (!Layer || !Layer.prototype) {
    console.warn('patchExpressAsyncErrors: Could not find Express Layer prototype');
    return;
  }

  const originalHandle = Layer.prototype.handle_request;

  Layer.prototype.handle_request = function handle_request(
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ): unknown {
    const result = originalHandle.call(this, req, res, next);

    // If result is a Promise, catch errors and pass to next()
    if (result !== null && typeof result === 'object' && typeof result.catch === 'function') {
      result.catch(next);
    }

    return result;
  };
}

/**
 * Helper function to get Layer from Express internals.
 * This is needed because Express doesn't export Layer directly.
 */
function getLayerFromExpress(): unknown {
  try {
    // Try to require the layer module directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const layerModule = require('express/lib/router/layer');
    return layerModule.default || layerModule;
  } catch {
    return undefined;
  }
}

/** Options for installProcessHandlers(). */
export interface ProcessHandlersOptions {
  /** Custom handler for uncaught exceptions. Called before default logging. */
  onUncaughtException?: (error: Error) => void;
  /** Custom handler for unhandled promise rejections. Called before default logging. */
  onUnhandledRejection?: (reason: unknown) => void;
  /** Async cleanup function called on shutdown signals. */
  onShutdown?: () => Promise<void>;
  /** Force exit timeout in ms if shutdown hangs. Default: 10000 */
  shutdownTimeout?: number;
  /** Signals to handle for graceful shutdown. Default: ['SIGTERM', 'SIGINT'] */
  shutdownSignals?: NodeJS.Signals[];
}

/**
 * Installs process-level handlers for errors and graceful shutdown.
 * Call once at application startup, before app.listen().
 *
 * Error handling:
 * - Uncaught exceptions (sync throws outside Express middleware)
 * - Unhandled promise rejections (forgotten await, missing .catch())
 *
 * Graceful shutdown:
 * - SIGTERM (Docker/K8s/systemd stop)
 * - SIGINT (Ctrl+C)
 * - Timeout protection (force exit if shutdown hangs)
 * - Double-shutdown prevention
 *
 * @example
 * installProcessHandlers({
 *   onUncaughtException: (error) => sendToMonitoring(error),
 *   onUnhandledRejection: (reason) => sendToMonitoring(reason),
 *   onShutdown: async () => {
 *     await database.close();
 *     await server.close();
 *   },
 *   shutdownTimeout: 15000,
 * });
 */
export function installProcessHandlers(options?: ProcessHandlersOptions): void {
  // Error handlers
  process.on('uncaughtException', (error: Error) => {
    options?.onUncaughtException?.(error);
    console.error('CRITICAL - Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    options?.onUnhandledRejection?.(reason);
    console.error('CRITICAL - Unhandled Rejection:', reason);
  });

  // Graceful shutdown
  const onShutdown = options?.onShutdown;
  if (onShutdown) {
    let isShuttingDown = false;
    const signals = options?.shutdownSignals ?? ['SIGTERM', 'SIGINT'];
    const timeout = options?.shutdownTimeout ?? 10000;

    const shutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`${signal} received, shutting down gracefully...`);

      const timer = setTimeout(() => {
        console.error('Shutdown timeout, forcing exit');
        process.exit(1);
      }, timeout);

      try {
        await onShutdown();
        clearTimeout(timer);
        process.exit(0);
      } catch (err) {
        console.error('Shutdown error:', err);
        clearTimeout(timer);
        process.exit(1);
      }
    };

    for (const signal of signals) {
      process.on(signal, () => shutdown(signal));
    }
  }
}
