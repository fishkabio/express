import { assertString } from '@fishka/assertions';
import { HTTP_FORBIDDEN, HttpError, catchAllMiddleware, check, validator } from '../src';
import { getTestApp, getTestRoutes, makeRawRequest, makeRequest } from './test-setup';

describe('Structured Error Handling', () => {
  // 1. Test Validator Error -> 404
  describe('Validator Errors', () => {
    it('should return 400 when URL parameter validation fails', async () => {
      const routes = getTestRoutes();
      routes.get('test-validation/:id', async ctx => ({ 
        id: ctx.path('id', check(validator(s => s === 'valid' ? undefined : 'Invalid ID'))) 
      }));

      const response = await makeRequest('GET', '/test-validation/invalid');
      expect(response.status).toBe(400);
      expect(response.body?.['error']).toContain('Invalid ID');
    });

    it('should return 400 when Body validation fails', async () => {
      const routes = getTestRoutes();
      routes.post('test-body-validation', async ctx => {
        ctx.body({ name: (v: unknown) => assertString(v, 'Name must be string') });
        return { success: true };
      });

      // Pass invalid body (number instead of string)
      const response = await makeRequest('POST', '/test-body-validation', { body: { name: 123 } });
      expect(response.status).toBe(400);
      expect(response.body?.['error']).toContain('Name must be string');
    });
  });

  // 2. Test Handler Body Error -> 500
  describe('Handler Execution Errors', () => {
    it('should return 500 when handler throws a regular error', async () => {
      const routes = getTestRoutes();
      routes.get('test-handler-error', async () => {
        throw new Error('Something went wrong in the handler');
      });

      const response = await makeRequest('GET', '/test-handler-error');
      expect(response.status).toBe(500);
      expect(response.body?.['error']).toBe('Something went wrong in the handler');
    });

    it('should return HttpError with separate details field', async () => {
      const routes = getTestRoutes();
      routes.get('test-http-error-details', async () => {
        throw new HttpError(HTTP_FORBIDDEN, 'Forbidden action', {
          reason: 'Insufficient permissions',
          code: 'PRO-001',
        });
      });

      const response = await makeRequest('GET', '/test-http-error-details');
      expect(response.status).toBe(HTTP_FORBIDDEN);
      expect(response.body?.['error']).toBe('Forbidden action');
      expect(response.body?.['details']).toEqual({ reason: 'Insufficient permissions', code: 'PRO-001' });
    });
  });

  describe('Global catchAllMiddleware', () => {
    it('should catch errors passed via next() from middleware', async () => {
      const app = getTestApp();

      // Add a middleware that passes error via next()
      app.use('/test-next-error', (_req, _res, next) => {
        next(new Error('Error via next()'));
      });

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-next-error');
      expect(response.status).toBe(500);
      expect(response.body?.['error']).toBe('Error via next()');
    });

    it('should catch JSON parsing errors (SyntaxError) with 400 status', async () => {
      const app = getTestApp();
      const routes = getTestRoutes();

      routes.post('test-json-parse-error', async ctx => {
        ctx.body({ data: (v: unknown) => assertString(v) });
        return { success: true };
      });

      app.use(catchAllMiddleware);

      // Send malformed JSON
      const response = await makeRawRequest('POST', '/test-json-parse-error', {
        rawBody: '{ invalid json syntax }',
      });

      expect(response.status).toBe(400);
      expect(response.body?.['error']).toContain('Failed to parse request');
    });

    it('should catch HttpError thrown in middleware and preserve status code', async () => {
      const app = getTestApp();

      app.use('/test-http-error-middleware', (_req, _res, next) => {
        next(new HttpError(HTTP_FORBIDDEN, 'Access denied by middleware'));
      });

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-http-error-middleware');
      expect(response.status).toBe(HTTP_FORBIDDEN);
      expect(response.body?.['error']).toBe('Access denied by middleware');
    });

    it('should catch errors from async middleware that rejects', async () => {
      const app = getTestApp();

      // Async middleware that returns a rejected promise
      app.use('/test-async-reject', async (_req, _res, _next) => {
        throw new Error('Async middleware rejection');
      });

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-async-reject');
      expect(response.status).toBe(500);
      expect(response.body?.['error']).toBe('Async middleware rejection');
    });

    it('should handle errors with no message gracefully', async () => {
      const app = getTestApp();

      app.use('/test-empty-error', (_req, _res, next) => {
        next(new Error());
      });

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-empty-error');
      expect(response.status).toBe(500);
      expect(response.body?.['error']).toBe('Internal error');
    });

    it('should handle non-Error objects thrown as errors', async () => {
      const app = getTestApp();

      app.use('/test-string-error', (_req, _res, next) => {
        next('String error message');
      });

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-string-error');
      expect(response.status).toBe(500);
      expect(response.body?.['error']).toBe('String error message');
    });

    it('should handle null/undefined error objects', async () => {
      const app = getTestApp();

      app.use('/test-null-error', (_req, _res, next) => {
        next(null); // Should pass through (no error)
      });

      // Add a route that responds after the middleware
      const routes = getTestRoutes();
      routes.get('test-null-error', async () => ({ passed: true }));

      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-null-error');
      // null error means "no error" in Express, should reach the route
      expect(response.status).toBe(200);
      expect(response.body?.['result']).toEqual({ passed: true });
    });
  });

  describe('Error isolation (server stability)', () => {
    it('should not crash server when route throws synchronously', async () => {
      const routes = getTestRoutes();
      const app = getTestApp();

      routes.get('test-sync-throw-stability', async () => {
        throw new Error('Sync throw in route');
      });

      app.use(catchAllMiddleware);

      // First request should fail but not crash
      const response1 = await makeRequest('GET', '/test-sync-throw-stability');
      expect(response1.status).toBe(500);

      // Second request should still work (server is alive)
      const response2 = await makeRequest('GET', '/test-sync-throw-stability');
      expect(response2.status).toBe(500);
      expect(response2.body?.['error']).toBe('Sync throw in route');
    });

    it('should handle multiple concurrent errors without crashing', async () => {
      const routes = getTestRoutes();
      const app = getTestApp();

      routes.get('test-concurrent-errors', async () => {
        throw new Error('Concurrent error');
      });

      app.use(catchAllMiddleware);

      // Fire multiple requests concurrently
      const promises = Array.from({ length: 5 }, () => makeRequest('GET', '/test-concurrent-errors'));

      const responses = await Promise.all(promises);

      // All should fail gracefully
      responses.forEach(response => {
        expect(response.status).toBe(500);
        expect(response.body?.['error']).toBe('Concurrent error');
      });
    });

    it('should continue serving requests after error in one request', async () => {
      const routes = getTestRoutes();
      const app = getTestApp();

      let requestCount = 0;
      routes.get('test-intermittent-errors', async () => {
        requestCount++;
        if (requestCount % 2 === 1) {
          throw new Error('Odd request error');
        }
        return { count: requestCount };
      });

      app.use(catchAllMiddleware);

      // First request fails
      const response1 = await makeRequest('GET', '/test-intermittent-errors');
      expect(response1.status).toBe(500);

      // Second request succeeds
      const response2 = await makeRequest('GET', '/test-intermittent-errors');
      expect(response2.status).toBe(200);

      // Third request fails
      const response3 = await makeRequest('GET', '/test-intermittent-errors');
      expect(response3.status).toBe(500);

      // Fourth request succeeds
      const response4 = await makeRequest('GET', '/test-intermittent-errors');
      expect(response4.status).toBe(200);
    });
  });
});
