import { getMessageFromError } from '@fishka/assertions';
import { NextFunction } from 'express';
import { ApiResponse, HttpError } from './api.types';
import { BAD_REQUEST_STATUS, INTERNAL_ERROR_STATUS } from './http.types';
import { getRequestLocalStorage } from './thread-local/thread-local-storage';
import { wrapAsApiResponse } from './utils/conversion.utils';
import { ExpressFunction, ExpressRequest, ExpressResponse } from './utils/express.utils';

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
      status: INTERNAL_ERROR_STATUS,
    };
  }

  if (requestId) {
    response.requestId = requestId;
  }
  return response;
}

/** Catches all kinds of unprocessed exceptions thrown from a single route. */
export function catchRouteErrors(fn: ExpressFunction): ExpressFunction {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const apiResponse = buildApiResponse(error);
      if (apiResponse.status >= INTERNAL_ERROR_STATUS) {
        console.error(`catchRouteErrors: ${req.path}`, error);
      } else {
        console.log(`catchRouteErrors: ${req.path}`, error);
      }
      res.status(apiResponse.status);
      res.send(apiResponse);
    }
  };
}

/**
 * Catches all errors in Express.js and is installed as global middleware.
 * Note that individual routes are wrapped with 'catchRouteErrors' middleware.
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
      ? buildApiResponse(`${BAD_REQUEST_STATUS}: Failed to parse request: ${error.message}`)
      : buildApiResponse(error);
  res.status(apiResponse.status);
  res.send(apiResponse);
}
