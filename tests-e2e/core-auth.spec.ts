import { assertString, assertTruthy } from '@fishka/assertions';
import {
  BasicAuthStrategy,
  BearerAuthStrategy,
  createAuthMiddleware,
  getAuthUser,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
  matches,
  min,
  minLength,
  check,
  range,
  RequestContext,
  toInt,
} from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

describe('Core + Auth E2E Integration', () => {
  describe('Core routing (top-level paths, no version)', () => {
    it('should handle GET requests at top-level path with object syntax', async () => {
      const routes = getTestRoutes();
      routes.get('health', {
        run: async () => ({ value: 'healthy' }),
      });

      const response = await makeRequest('GET', '/health');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('healthy');
    });

    it('should handle GET requests at top-level path with function shorthand', async () => {
      const routes = getTestRoutes();
      routes.get<{ value: string }>('health-short', async () => ({ value: 'healthy-short' }));

      const response = await makeRequest('GET', '/health-short');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('healthy-short');
    });

    it('should handle POST requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.post('items', async ctx => ({ 
        value: ctx.body({ name: assertString }).name 
      }));

      const response = await makeRequest('POST', '/items', { body: { name: 'Test' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('Test');
    });

    it('should handle PUT requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.put('items/:id', async ctx => ({ 
        value: ctx.req.params['id'] 
      }));

      const response = await makeRequest('PUT', '/items/123', { body: { name: 'Updated' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('123');
    });

    it('should handle PATCH requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.patch('items/:id', async () => ({ 
        value: 'none' 
      }));

      const response = await makeRequest('PATCH', '/items/456', { body: { name: 'Patched' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('none');
    });

    it('should handle DELETE requests at top-level path with object syntax', async () => {
      const routes = getTestRoutes();
      routes.delete('items/:id', {
        run: async () => {},
      });

      const response = await makeRequest('DELETE', '/items/789');
      expect(response.status).toBe(200);
    });

    it('should handle DELETE requests at top-level path with function shorthand', async () => {
      const routes = getTestRoutes();
      routes.delete('items-short/:id', async () => {});

      const response = await makeRequest('DELETE', '/items-short/789');
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid request body', async () => {
      const routes = getTestRoutes();
      routes.post('validate-test', async ctx => ({ 
        value: ctx.body({ name: v => assertString(v, '400: name required') }).name 
      }));

      const response = await makeRequest('POST', '/validate-test', { body: { name: 1 } });
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should deny request without Authorization header', async () => {
      const routes = getTestRoutes();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'admin' && p === 'secret' ? { id: '1', username: u } : null,
      );

      routes.get<{ value: string }>('protected', {
        middlewares: [createAuthMiddleware(strategy)],
        run: async (ctx: RequestContext) => {
          const user = getAuthUser(ctx) as { id: string };
          return { value: user.id };
        },
      });

      const response = await makeRequest('GET', '/protected');
      expect(response.status).toBe(HTTP_UNAUTHORIZED);
    });

    it('should allow request with valid credentials', async () => {
      const routes = getTestRoutes();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'user' && p === 'pass' ? { id: 'user-1', username: u } : null,
      );

      routes.get<{ value: string }>('secure', {
        middlewares: [createAuthMiddleware(strategy)],
        run: async (ctx: RequestContext) => {
          const user = getAuthUser(ctx) as { id: string };
          return { value: user.id };
        },
      });

      const credentials = Buffer.from('user:pass').toString('base64');
      const response = await makeRequest('GET', '/secure', {
        headers: { Authorization: `Basic ${credentials}` },
      });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('user-1');
    });

    it('should authenticate with Bearer token', async () => {
      const routes = getTestRoutes();
      const strategy = new BearerAuthStrategy(async token =>
        token === 'valid-token' ? { id: 'user-2', username: 'bearer-user' } : null,
      );

      routes.get<{ value: string }>('bearer-protected', {
        middlewares: [createAuthMiddleware(strategy)],
        run: async ctx => {
          const user = getAuthUser(ctx) as { id: string };
          return { value: user.id };
        },
      });

      const response = await makeRequest('GET', '/bearer-protected', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('user-2');
    });

    it('should reject invalid Bearer token', async () => {
      const routes = getTestRoutes();
      const strategy = new BearerAuthStrategy(async () => null);

      routes.get('bearer-invalid', {
        middlewares: [createAuthMiddleware(strategy)],
        run: async () => ({}),
      });

      const response = await makeRequest('GET', '/bearer-invalid', {
        headers: { Authorization: 'Bearer invalid' },
      });
      expect(response.status).toBe(HTTP_UNAUTHORIZED);
    });
  });

  describe('Parameter validation', () => {
    it('should validate path parameters with ctx.path()', async () => {
      const routes = getTestRoutes();
      routes.get('validate-path/:id', async ctx => ({ 
        id: ctx.path('id', check(minLength(3, 'ID too short'))) 
      }));

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

    it('should validate query parameters with ctx.query()', async () => {
      const routes = getTestRoutes();
      routes.get('validate-query', async ctx => ({ 
        page: ctx.query('page', check(toInt('page must be a number'), min(1, 'page must be >= 1'))) 
      }));

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
      expect(errorBody3.error).toContain('Expected string, got undefined');
    });

    it('should validate both path and query parameters together', async () => {
      const routes = getTestRoutes();
      routes.get('validate-both/:id', async ctx => ({
        id: ctx.path('id', check(matches(/^[a-z0-9]+$/, 'ID must be alphanumeric'))),
        limit: ctx.query('limit', check(toInt('limit must be a number'), range(1, 100, 'limit must be between 1 and 100'))),
      }));

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

    it('should work with function shorthand and validation', async () => {
      const routes = getTestRoutes();
      routes.get<{ id: string }>('short-validate/:id', async ctx => {
        const id = ctx.req.params['id']!;
        assertTruthy(id.length >= 5, 'ID must be at least 5 characters');
        return { id };
      });

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
