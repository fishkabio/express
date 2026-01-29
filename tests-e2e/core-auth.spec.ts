import { assertString, assertTruthy } from '@fishka/assertions';
import {
  BasicAuthStrategy,
  BearerAuthStrategy,
  body,
  createAuthMiddleware,
  getAuthUser,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
  matches,
  min,
  minLength,
  pathParam,
  queryParam,
  range,
  toInt,
  transform,
} from '../src';
import { addErrorHandling, getApiResult, getTestApp, makeRequest } from './test-setup';

describe('Core + Auth E2E Integration', () => {
  describe('Core routing (top-level paths, no version)', () => {
    it('should handle GET requests at top-level path', async () => {
      const app = getTestApp();
      app.get('/health', async (_req, res) => {
        res.json({ value: 'healthy' });
      });
      addErrorHandling(app);

      const response = await makeRequest('GET', '/health');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('healthy');
    });

    it('should handle POST requests at top-level path', async () => {
      const app = getTestApp();
      app.post('/items', async (req, res) => {
        const requestBody = body(req, { name: assertString });
        res.json({ value: requestBody.name });
      });
      addErrorHandling(app);

      const response = await makeRequest('POST', '/items', { body: { name: 'Test' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('Test');
    });

    it('should handle PUT requests at top-level path', async () => {
      const app = getTestApp();
      app.put('/items/:id', async (req, res) => {
        res.json({ value: req.params['id'] });
      });
      addErrorHandling(app);

      const response = await makeRequest('PUT', '/items/123', { body: { name: 'Updated' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('123');
    });

    it('should handle PATCH requests at top-level path', async () => {
      const app = getTestApp();
      app.patch('/items/:id', async (_req, res) => {
        res.json({ value: 'none' });
      });
      addErrorHandling(app);

      const response = await makeRequest('PATCH', '/items/456', { body: { name: 'Patched' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('none');
    });

    it('should handle DELETE requests at top-level path', async () => {
      const app = getTestApp();
      app.delete('/items/:id', async (_req, res) => {
        res.json({});
      });
      addErrorHandling(app);

      const response = await makeRequest('DELETE', '/items/789');
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid request body', async () => {
      const app = getTestApp();
      app.post('/validate-test', async (req, res) => {
        const requestBody = body(req, { name: (v: unknown) => assertString(v, '400: name required') });
        res.json({ value: requestBody.name });
      });
      addErrorHandling(app);

      const response = await makeRequest('POST', '/validate-test', { body: { name: 1 } });
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should deny request without Authorization header', async () => {
      const app = getTestApp();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'admin' && p === 'secret' ? { id: '1', username: u } : null,
      );

      app.get('/protected', createAuthMiddleware(strategy), async (req, res) => {
        const user = getAuthUser(req) as { id: string };
        res.json({ value: user.id });
      });
      addErrorHandling(app);

      const response = await makeRequest('GET', '/protected');
      expect(response.status).toBe(HTTP_UNAUTHORIZED);
    });

    it('should allow request with valid credentials', async () => {
      const app = getTestApp();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'user' && p === 'pass' ? { id: 'user-1', username: u } : null,
      );

      app.get('/secure', createAuthMiddleware(strategy), async (req, res) => {
        const user = getAuthUser(req) as { id: string };
        res.json({ value: user.id });
      });
      addErrorHandling(app);

      const credentials = Buffer.from('user:pass').toString('base64');
      const response = await makeRequest('GET', '/secure', {
        headers: { Authorization: `Basic ${credentials}` },
      });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('user-1');
    });

    it('should authenticate with Bearer token', async () => {
      const app = getTestApp();
      const strategy = new BearerAuthStrategy(async token =>
        token === 'valid-token' ? { id: 'user-2', username: 'bearer-user' } : null,
      );

      app.get('/bearer-protected', createAuthMiddleware(strategy), async (req, res) => {
        const user = getAuthUser(req) as { id: string };
        res.json({ value: user.id });
      });
      addErrorHandling(app);

      const response = await makeRequest('GET', '/bearer-protected', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('user-2');
    });

    it('should reject invalid Bearer token', async () => {
      const app = getTestApp();
      const strategy = new BearerAuthStrategy(async () => null);

      app.get('/bearer-invalid', createAuthMiddleware(strategy), async (_req, res) => {
        res.json({});
      });
      addErrorHandling(app);

      const response = await makeRequest('GET', '/bearer-invalid', {
        headers: { Authorization: 'Bearer invalid' },
      });
      expect(response.status).toBe(HTTP_UNAUTHORIZED);
    });
  });

  describe('Parameter validation', () => {
    it('should validate path parameters with pathParam()', async () => {
      const app = getTestApp();
      app.get('/validate-path/:id', async (req, res) => {
        res.json({
          id: pathParam(req, 'id', transform(minLength(3, 'ID too short'))),
        });
      });
      addErrorHandling(app);

      // Valid request
      const validResponse = await makeRequest('GET', '/validate-path/abc123');
      expect(validResponse.status).toBe(200);
      expect(getApiResult<{ id: string }>(validResponse).id).toBe('abc123');

      // Invalid request - too short ID
      const invalidResponse = await makeRequest('GET', '/validate-path/ab');
      expect(invalidResponse.status).toBe(400);
      const errorBody = invalidResponse.body as { error: string };
      expect(errorBody.error).toContain('ID too short');
    });

    it('should validate query parameters with queryParam()', async () => {
      const app = getTestApp();
      app.get('/validate-query', async (req, res) => {
        res.json({
          page: queryParam(req, 'page', transform(toInt('page must be a number'), min(1, 'page must be >= 1'))),
        });
      });
      addErrorHandling(app);

      // Valid request
      const validResponse = await makeRequest('GET', '/validate-query?page=5');
      expect(validResponse.status).toBe(200);
      expect(getApiResult<{ page: number }>(validResponse).page).toBe(5);

      // Invalid request - not a number
      const invalidResponse1 = await makeRequest('GET', '/validate-query?page=abc');
      expect(invalidResponse1.status).toBe(400);
      const errorBody1 = invalidResponse1.body as { error: string };
      expect(errorBody1.error).toContain('page must be a number');

      // Invalid request - page < 1
      const invalidResponse2 = await makeRequest('GET', '/validate-query?page=0');
      expect(invalidResponse2.status).toBe(400);
      const errorBody2 = invalidResponse2.body as { error: string };
      expect(errorBody2.error).toContain('page must be >= 1');

      // Missing required parameter
      const invalidResponse3 = await makeRequest('GET', '/validate-query');
      expect(invalidResponse3.status).toBe(400);
      const errorBody3 = invalidResponse3.body as { error: string };
      expect(errorBody3.error).toContain('Parameter validation failed: page. Expected string, got undefined');
    });

    it('should validate both path and query parameters together', async () => {
      const app = getTestApp();
      app.get('/validate-both/:id', async (req, res) => {
        res.json({
          id: pathParam(req, 'id', transform(matches(/^[a-z0-9]+$/, 'ID must be alphanumeric'))),
          limit: queryParam(
            req,
            'limit',
            transform(toInt('limit must be a number'), range(1, 100, 'limit must be between 1 and 100')),
          ),
        });
      });
      addErrorHandling(app);

      // Valid request
      const validResponse = await makeRequest('GET', '/validate-both/abc123?limit=50');
      expect(validResponse.status).toBe(200);
      const validResult = getApiResult<{ id: string; limit: number }>(validResponse);
      expect(validResult.id).toBe('abc123');
      expect(validResult.limit).toBe(50);

      // Invalid path parameter
      const invalidPathResponse = await makeRequest('GET', '/validate-both/ABC!?limit=50');
      expect(invalidPathResponse.status).toBe(400);
      const errorPathBody = invalidPathResponse.body as { error: string };
      expect(errorPathBody.error).toContain('ID must be alphanumeric');

      // Invalid query parameter
      const invalidQueryResponse = await makeRequest('GET', '/validate-both/abc123?limit=150');
      expect(invalidQueryResponse.status).toBe(400);
      const errorQueryBody = invalidQueryResponse.body as { error: string };
      expect(errorQueryBody.error).toContain('limit must be between 1 and 100');
    });

    it('should work with validation in handler', async () => {
      const app = getTestApp();
      app.get('/short-validate/:id', async (req, res) => {
        const id = req.params['id']!;
        assertTruthy(id.length >= 5, 'ID must be at least 5 characters');
        res.json({ id });
      });
      addErrorHandling(app);

      // Valid request
      const validResponse = await makeRequest('GET', '/short-validate/abcde');
      expect(validResponse.status).toBe(200);
      expect(getApiResult<{ id: string }>(validResponse).id).toBe('abcde');

      // Invalid request
      const invalidResponse = await makeRequest('GET', '/short-validate/abc');
      expect(invalidResponse.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
      const errorBody = invalidResponse.body as { error: string };
      expect(errorBody.error).toContain('ID must be at least 5 characters');
    });
  });
});
