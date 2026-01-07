import { randomUUID } from 'crypto';
import { NextFunction } from 'express';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { runWithRequestTlsData } from './thread-local-storage';
import { getExpressApiConfig } from '../config/config';

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
    const headerId = config.trustRequestIdHeader ? req.headers['x-request-id'] : undefined;
    const existingId = (req as any).requestId || headerId;
    const requestId = typeof existingId === 'string' ? existingId : randomUUID();

    // Run the next handler within the TLS context
    runWithRequestTlsData(
      {
        requestId,
      },
      async () => {
        next();
      },
    );
  };
}
