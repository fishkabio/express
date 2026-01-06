import { NextFunction } from 'express';
import { ApiResponse } from '../protocol/fishka.types';
import { BAD_REQUEST, INTERNAL_ERROR_STATUS, parseStatusCodeFromErrorMessageToken } from '../utils/common.private';
import { wrapAsFishkaResponse } from '../utils/conversion.private';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';

function buildFishkaResponse(error: unknown): ApiResponse & { status: number } {
  const errorMessage =
    typeof error === 'object' ? (error as Error).message : typeof error === 'string' ? error : undefined;
  const status = parseStatusCodeFromErrorMessageToken(errorMessage);
  const publicErrorMessage = status === INTERNAL_ERROR_STATUS || !errorMessage ? 'Internal error' : errorMessage;
  return { ...wrapAsFishkaResponse(undefined), error: publicErrorMessage, status };
}

/** Catches all kinds of unprocessed exceptions thrown from a single route. */
export function catchRouteErrors(fn: ExpressFunction): ExpressFunction {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const fishkaResponse = buildFishkaResponse(error);
      if (fishkaResponse.status >= 500) {
        console.error(`catchRouteErrors: ${req.path}`, error);
      } else {
        console.log(`catchRouteErrors: ${req.path}`, error);
      }
      res.status(fishkaResponse.status);
      res.send(fishkaResponse);
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
  const fishkaResponse =
    error instanceof SyntaxError // JSON body parsing error.
      ? buildFishkaResponse(`${BAD_REQUEST}: Failed to parse request: ${error.message}`)
      : buildFishkaResponse(error);
  res.status(fishkaResponse.status);
  res.send(fishkaResponse);
}
