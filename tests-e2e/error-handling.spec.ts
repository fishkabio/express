import { assertString } from '@fishka/assertions';
import { getTestApp, getTestRoutes, makeRequest } from './test-setup';
import { HttpError, FORBIDDEN_STATUS, catchAllMiddleware } from '../src';

describe('Structured Error Handling', () => {
  
  // 1. Test Validator Error -> 404
  describe('Validator Errors', () => {
    
    it('should return 400 when URL parameter validation fails', async () => {
      const routes = getTestRoutes();
      routes.get<{ id: string }>('test-validation/:id', {
        $path: {
          id: (v) => { 
            // Throws a regular Error
            assertString(v);
            if (v !== 'valid') throw new Error('Invalid ID'); 
          }
        },
        run: async ctx => ({ id: ctx.params.get('id') })
      });

      const response = await makeRequest('GET', '/test-validation/invalid');
      expect(response.status).toBe(400);
      expect(response.body?.error).toContain('Invalid ID');
    });

    it('should return 400 when Body validation fails', async () => {
      const routes = getTestRoutes();
      routes.post<{ name: string }, { success: boolean }>('test-body-validation', {
        $body: {
          name: (v) => assertString(v, 'Name must be string')
        },
        run: async () => ({ success: true })
      });

      // Pass invalid body (number instead of string)
      const response = await makeRequest('POST', '/test-body-validation', { body: { name: 123 } });
      expect(response.status).toBe(400);
      expect(response.body?.error).toContain('Name must be string');
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
      expect(response.body?.error).toBe('Something went wrong in the handler');
    });

    it('should return HttpError with separate details field', async () => {
      const routes = getTestRoutes();
      routes.get('test-http-error-details', async () => {
        throw new HttpError(FORBIDDEN_STATUS, 'Forbidden action', { reason: 'Insufficient permissions', code: 'PRO-001' });
      });

      const response = await makeRequest('GET', '/test-http-error-details');
      expect(response.status).toBe(FORBIDDEN_STATUS);
      expect(response.body?.error).toBe('Forbidden action');
      expect(response.body?.details).toEqual({ reason: 'Insufficient permissions', code: 'PRO-001' });
    });
  });

  describe('Global catchAllMiddleware', () => {
    it('should catch errors from middleware before routes', async () => {
      const app = getTestApp();
      
      // Add a middleware that throws
      app.use('/test-global-error', (_req, _res, next) => {
        next(new Error('Global failure'));
      });

      // Ensure catchAllMiddleware is at the end (test-setup doesn't add it)
      app.use(catchAllMiddleware);

      const response = await makeRequest('GET', '/test-global-error');
      expect(response.status).toBe(500);
      expect(response.body?.error).toBe('Global failure');
    });
  });
});