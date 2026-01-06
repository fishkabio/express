import { randomUUID } from 'crypto';
import { NextFunction } from 'express';
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
  return async (_req: ExpressRequest, _res: ExpressResponse, next: NextFunction): Promise<void> => {
    const requestId = randomUUID();

    // Run the next handler within the TLS context
    await runWithRequestTlsData(
      {
        requestId,
      },
      () =>
        new Promise<void>((resolve, reject) => {
          next((err?: unknown) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }),
    );
  };
}
