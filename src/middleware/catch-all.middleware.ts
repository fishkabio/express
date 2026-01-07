import { NextFunction } from 'express';
import { ApiResponse } from '../protocol/api.types';
import { INTERNAL_ERROR_STATUS, BAD_REQUEST_STATUS } from '../utils/common';
import { wrapAsApiResponse } from '../utils/conversion';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { HttpError } from '../utils/http-error';
import { getRequestLocalStorage } from '../thread-local-storage/thread-local-storage';

function buildApiResponse(error: unknown): ApiResponse & { status: number } {
  const tls = getRequestLocalStorage();
  const requestId = tls?.requestId;
  let response: ApiResponse & { status: number };

  if (error instanceof HttpError) {
    response = { 
      ...wrapAsApiResponse(undefined), 
      error: error.message, 
      status: error.status,
      details: error.details
    };
  } else {
    const errorMessage =
      typeof error === 'object' ? (error as Error).message : typeof error === 'string' ? error : undefined;
    
    response = { 
      ...wrapAsApiResponse(undefined), 
      error: errorMessage && errorMessage.length > 0 ? errorMessage : 'Internal error', 
      status: INTERNAL_ERROR_STATUS 
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
      if (apiResponse.status >= 500) {
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
  console.error('catchAllMiddleware:', (error as Error).message || typeof error);
  const apiResponse =
    error instanceof SyntaxError // JSON body parsing error.
      ? buildApiResponse(`${BAD_REQUEST_STATUS}: Failed to parse request: ${error.message}`)
      : buildApiResponse(error);
  res.status(apiResponse.status);
  res.send(apiResponse);
}
