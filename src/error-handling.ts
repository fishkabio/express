import { getMessageFromError } from '@fishka/assertions';
import { NextFunction } from 'express';
import { ApiResponse, HttpError } from './api.types';
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR } from './http-status-codes';
import { getRequestLocalStorage } from './thread-local/thread-local-storage';
import { wrapAsApiResponse } from './utils/conversion.utils';
import { ExpressFunction, ExpressRequest, ExpressResponse } from './utils/express.utils';

/**
 * Converts any error into a standardized API response format.
 * - HttpError: Uses the error's status code and message
 * - Other errors: Returns 500 with the error message or 'Internal error'
 * Attaches requestId from thread-local storage if available.
 */
function buildApiResponse(error: unknown): ApiResponse & { status: number } {
  const tls = getRequestLocalStorage();
  const requestId = tls?.requestId;
  let response: ApiResponse & { status: number };

  if (error instanceof HttpError) {
    response = {
      ...wrapAsApiResponse(undefined),
      error: error.message,
      status: error.status,
      details: error.details,
    };
  } else {
    const errorMessage = getMessageFromError(error, '');
    response = {
      ...wrapAsApiResponse(undefined),
      error: errorMessage && errorMessage.length > 0 ? errorMessage : 'Internal error',
      status: HTTP_INTERNAL_SERVER_ERROR,
    };
  }

  if (requestId) {
    response.requestId = requestId;
  }
  return response;
}

/**
 * @Internal
 * Wraps a route handler to catch and convert errors to API responses.
 * Applied automatically to all routes registered via createRouteTable().
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

/** Options for installProcessErrorHandlers(). */
export interface ProcessErrorHandlerOptions {
  /** Custom handler for uncaught exceptions. Called before default logging. */
  onUncaughtException?: (error: Error) => void;
  /** Custom handler for unhandled promise rejections. Called before default logging. */
  onUnhandledRejection?: (reason: unknown) => void;
}

/**
 * Installs process-level error handlers to prevent server crashes from unhandled errors.
 * Call once at application startup, before app.listen().
 *
 * Catches:
 * - Uncaught exceptions (sync throws outside Express middleware)
 * - Unhandled promise rejections (forgotten await, missing .catch())
 *
 * @example
 * installProcessErrorHandlers({
 *   onUncaughtException: (error) => sendToMonitoring(error),
 *   onUnhandledRejection: (reason) => sendToMonitoring(reason),
 * });
 */
export function installProcessErrorHandlers(options?: ProcessErrorHandlerOptions): void {
  process.on('uncaughtException', (error: Error) => {
    options?.onUncaughtException?.(error);
    console.error('CRITICAL - Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    options?.onUnhandledRejection?.(reason);
    console.error('CRITICAL - Unhandled Rejection:', reason);
  });
}
