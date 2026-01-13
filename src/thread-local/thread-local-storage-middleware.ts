import { randomUUID } from 'crypto';
import { NextFunction } from 'express';
import { getExpressApiConfig } from '../config';
import { HEADER_REQUEST_ID } from '../http-headers';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { runWithRequestTlsData } from './thread-local-storage';

/**
 * Creates middleware that initializes thread-local storage for each request.
 * Automatically generates a unique request ID and makes it available throughout
 * the request lifecycle.
 *
 * @returns Express middleware function
 */
export function createTlsMiddleware(): ExpressFunction {
  return async (req: ExpressRequest, _res: ExpressResponse, next: NextFunction): Promise<void> => {
    const config = getExpressApiConfig();
    const headerId = config.trustRequestIdHeader ? req.headers[HEADER_REQUEST_ID] : undefined;
    const existingId = (req as { requestId?: unknown }).requestId || headerId;
    const requestId = typeof existingId === 'string' ? existingId : randomUUID();

    // Run the next handler within the TLS context
    await runWithRequestTlsData(
      {
        requestId,
      },
      async () => {
        next();
      },
    );
  };
}
