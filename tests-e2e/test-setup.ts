import { assertTruthy, truthy } from '@fishka/assertions';
import express, { Express } from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import {
  catchAllMiddleware,
  configureExpressApi,
  createTlsMiddleware,
  HTTP_INTERNAL_SERVER_ERROR,
  patchExpressAsyncErrors,
} from '../src';

/**
 * Shared test server that is created once and reused across all e2e tests.
 * This significantly improves test performance by avoiding server startup/teardown overhead.
 */
let testApp: Express | undefined;
let testServer: http.Server | undefined;
let testPort: number | undefined;
let initialized = false;

/**
 * Initialize the shared test server. Called once during test setup.
 */
export async function initializeTestServer(): Promise<void> {
  if (initialized) {
    return;
  }

  // Patch Express to handle async errors automatically
  patchExpressAsyncErrors();

  // Configure request ID for tests (enabled by default for backward compatibility)
  configureExpressApi({ requestIdHeader: 'x-request-id' });

  const app = express();
  app.use(express.json());
  app.use(createTlsMiddleware());

  // Add error handling middleware at the end (will be last after all routes)
  // We use a trick: add it now, and it will be moved to the end by Express
  // when other routes are added. Actually, we need to add it AFTER routes.
  // So we don't add it here - tests should add routes and then call app.use(catchAllMiddleware)

  testApp = app;

  await new Promise<void>(resolve => {
    testServer = app.listen(0, '127.0.0.1', () => {
      const address = testServer?.address() as AddressInfo;
      testPort = address.port;
      initialized = true;
      resolve();
    });
  });
}

/**
 * Teardown the shared test server. Called once after all tests.
 */
export async function teardownTestServer(): Promise<void> {
  const server = testServer;
  if (initialized && server) {
    await new Promise<void>(resolve => {
      server.close(() => {
        initialized = false;
        resolve();
      });
    });
  }
}

/** Get the shared Express app for registering routes. */
export function getTestApp(): Express {
  return truthy(testApp, 'Test server not initialized. Call initializeTestServer first.');
}

/**
 * Adds error handling middleware to the app.
 * Call this after all routes are registered.
 */
export function addErrorHandling(app: Express): void {
  app.use(catchAllMiddleware);
}

/** Get the port the test server is running on. */
export function getTestPort(): number {
  assertTruthy(testPort, 'Test server not initialized. Call initializeTestServer first.');
  return testPort;
}

/**
 * Type-safe response body accessor for test assertions.
 */
export function getResponseBody(response: {
  status: number;
  body: Record<string, unknown> | undefined;
}): Record<string, unknown> {
  assertTruthy(response.body, 'Response body is empty');
  return response.body;
}

/**
 * Get the result field from an API response safely with typed access to nested properties.
 */
export function getApiResult<T = unknown>(response: { status: number; body: Record<string, unknown> | undefined }): T {
  const body = getResponseBody(response);
  return body as T;
}

/** Makes HTTP requests to the test server. */
export function makeRequest(
  method: string,
  path: string,
  options?: { body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; body: Record<string, unknown> | undefined; headers: Record<string, string | string[]> }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method,
        hostname: '127.0.0.1',
        port: getTestPort(),
        path,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          let parsedBody: Record<string, unknown> | undefined;
          try {
            parsedBody = data ? JSON.parse(data) : undefined;
          } catch {
            parsedBody = { raw: data };
          }
          resolve({
            status: res.statusCode || HTTP_INTERNAL_SERVER_ERROR,
            body: parsedBody,
            headers: res.headers as Record<string, string | string[]>,
          });
        });
      },
    );

    req.on('error', reject);

    if (options?.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/** Makes HTTP requests with raw string body (for testing malformed JSON, etc). */
export function makeRawRequest(
  method: string,
  path: string,
  options?: { rawBody?: string; headers?: Record<string, string> },
): Promise<{ status: number; body: Record<string, unknown> | undefined; headers: Record<string, string | string[]> }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method,
        hostname: '127.0.0.1',
        port: getTestPort(),
        path,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          let parsedBody: Record<string, unknown> | undefined;
          try {
            parsedBody = data ? JSON.parse(data) : undefined;
          } catch {
            parsedBody = { raw: data };
          }
          resolve({
            status: res.statusCode || HTTP_INTERNAL_SERVER_ERROR,
            body: parsedBody,
            headers: res.headers as Record<string, string | string[]>,
          });
        });
      },
    );

    req.on('error', reject);

    if (options?.rawBody) {
      req.write(options.rawBody);
    }

    req.end();
  });
}
