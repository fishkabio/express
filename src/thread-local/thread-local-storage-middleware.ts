import { randomUUID } from 'crypto';
import { NextFunction } from 'express';
import { getExpressApiConfig } from '../config';
import { ExpressFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { getRequestLocalStorage, runWithRequestTlsData } from './thread-local-storage';

/**
 * Creates middleware that initializes thread-local storage for each request.
 * Automatically generates a unique request ID and makes it available throughout
 * the request lifecycle. Also adds the request ID to response headers.
 *
 * @returns Express middleware function
 */
export function createTlsMiddleware(): ExpressFunction {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    const config = getExpressApiConfig();
    const headerName = config.requestIdHeader;

    // If requestIdHeader is not set, skip request ID generation entirely
    if (!headerName) {
      next();
      return;
    }

    const headerId = config.trustRequestIdHeader ? req.headers[headerName] : undefined;
    const existingId = (req as { requestId?: unknown }).requestId || headerId;
    const requestId = typeof existingId === 'string' ? existingId : randomUUID();

    // Add response hook to set request ID header before response is sent
    const originalSend = res.send.bind(res);
    res.send = function (body: unknown): ExpressResponse {
      // Only set header if not already set
      if (!res.getHeader(headerName)) {
        const tls = getRequestLocalStorage();
        if (tls?.requestId) {
          res.setHeader(headerName, tls.requestId);
        }
      }
      return originalSend(body);
    };

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
