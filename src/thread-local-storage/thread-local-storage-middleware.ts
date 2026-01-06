import { randomUUID } from 'crypto';
import { NextFunction } from 'express';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { runWithFishkaTlsData } from './thread-local-storage.private';

/**
 * Configuration for thread-local storage middleware.
 */
export interface TlsMiddlewareConfig {
  /** Optional function to extract country code from request */
  extractCountryCode?: (req: ExpressRequest) => string | undefined;

  /** Optional function to extract IP address from request */
  extractIpAddress?: (req: ExpressRequest) => string | undefined;
}

/**
 * Creates middleware that initializes thread-local storage for each request.
 * Automatically generates a unique request ID and makes it available throughout
 * the request lifecycle.
 *
 * @param config - Middleware configuration (optional)
 * @returns Express middleware function
 */
export function createFishkaTlsMiddleware(config?: TlsMiddlewareConfig): ExpressFunction {
  return async (req: ExpressRequest, _res: ExpressResponse, next: NextFunction): Promise<void> => {
    const requestId = randomUUID();

    // Extract optional context data
    const countryCode = config?.extractCountryCode?.(req);
    const ipAddress = config?.extractIpAddress?.(req) || req.ip;

    // Run the next handler within the TLS context
    await runWithFishkaTlsData(
      {
        requestId,
        countryCode,
        ipAddress,
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

/**
 * Extracts the country code from CloudFront header.
 * Can be used in createFishkaTlsMiddleware config.
 */
export function extractCountryCodeFromCloudFront(req: ExpressRequest): string | undefined {
  return req.header('CloudFront-Viewer-Country');
}
