import { assertString } from '@fishka/assertions';
import {
  BasicAuthStrategy,
  BearerAuthStrategy,
  buildFishkaSchemaJsonResponse,
  createAuthMiddleware,
  getAuthUser,
  registerUrlParameter,
  RequestContext,
} from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

registerUrlParameter('id', {
  doc: {
    type: 'string',
    text: 'ID',
    description: 'Resource ID.',
  },
});

describe('Fishka Core + Auth E2E Integration', () => {
  describe('Core routing (top-level paths, no version)', () => {
    it('should handle GET requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'health',
        run: async () => ({ value: 'healthy' }),
      });

      const response = await makeRequest('GET', '/health');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('healthy');
    });

    it('should handle POST requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.post({
        path: 'items',
        validator: {
          name: v => assertString(v, '400: bad'),
        },
        run: async (ctx: RequestContext<{ name: string }>) => ({ value: ctx.request.name }),
      });

      const response = await makeRequest('POST', '/items', { body: { name: 'Test' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('Test');
    });

    it('should handle PUT requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.put({
        path: 'items/:id',
        validator: { name: assertString },
        run: async (ctx: RequestContext<{ name: string }>) => ({ value: ctx.params.get('id') }),
      });

      const response = await makeRequest('PUT', '/items/123', { body: { name: 'Updated' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('123');
    });

    it('should handle PATCH requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.patch({
        path: 'items/:id',
        validator: { name: assertString },
        run: async (ctx: RequestContext<{ name?: string }>) => ({ value: ctx.request.name || 'none' }),
      });

      const response = await makeRequest('PATCH', '/items/456', { body: { name: 'Patched' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('Patched');
    });

    it('should handle DELETE requests at top-level path', async () => {
      const routes = getTestRoutes();
      routes.delete({
        path: 'items/:id',
        run: async () => {},
      });

      const response = await makeRequest('DELETE', '/items/789');
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid request body', async () => {
      const routes = getTestRoutes();
      routes.post({
        path: 'validate-test',
        validator: {
          name: v => assertString(v, '400: name required'),
        },
        run: async (ctx: RequestContext<{ name: string }>) => ({ value: ctx.request.name }),
      });

      const response = await makeRequest('POST', '/validate-test', { body: { name: 1 } });
      expect(response.status).toBe(400);
    });
  });

  describe('API versioning', () => {
    it('should handle version: "1" with /v1/ prefix', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'versioned',
        version: '1',
        run: async () => ({ value: 'v1' }),
      });

      const response = await makeRequest('GET', '/v1/versioned');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('v1');
    });

    it('should handle version: "2" with /v2/ prefix', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'versioned',
        version: '2',
        run: async () => ({ value: 'v2' }),
      });

      const response = await makeRequest('GET', '/v2/versioned');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('v2');
    });

    it('should allow both versioned and top-level endpoints simultaneously', async () => {
      const routes = getTestRoutes();

      routes.get({
        path: 'mixed',
        run: async () => ({ value: 'top-level' }),
      });

      routes.get({
        path: 'mixed',
        version: '1',
        run: async () => ({ value: 'v1' }),
      });

      const topResponse = await makeRequest('GET', '/mixed');
      expect(getApiResult<{ value: string }>(topResponse).value).toBe('top-level');

      const v1Response = await makeRequest('GET', '/v1/mixed');
      expect(getApiResult<{ value: string }>(v1Response).value).toBe('v1');
    });
  });

  describe('Authentication', () => {
    it('should deny request without Authorization header', async () => {
      const routes = getTestRoutes();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'admin' && p === 'secret' ? { id: '1', username: u } : null,
      );

      routes.get<{ value: string }>({
        path: 'protected',
        middlewares: [createAuthMiddleware(strategy)],
        run: async (ctx: RequestContext) => {
          const user = getAuthUser(ctx) as { id: string };
          return { value: user.id };
        },
      });

      const response = await makeRequest('GET', '/protected');
      expect(response.status).toBe(401);
    });

    it('should allow request with valid credentials', async () => {
      const routes = getTestRoutes();
      const strategy = new BasicAuthStrategy(async (u, p) =>
        u === 'user' && p === 'pass' ? { id: 'user-1', username: u } : null,
      );

      routes.get<{ value: string }>({
        path: 'secure',
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

      routes.get<{ value: string }>({
        path: 'bearer-protected',
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

      routes.get({
        path: 'bearer-invalid',
        middlewares: [createAuthMiddleware(strategy)],
        run: async () => ({}),
      });

      const response = await makeRequest('GET', '/bearer-invalid', {
        headers: { Authorization: 'Bearer invalid' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('OpenAPI documentation generation', () => {
    it('should document top-level endpoint (no version)', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'docs-top-level',
        doc: {
          summary: 'Top level endpoint',
          description: 'An endpoint without version prefix.',
          response: { message: { text: 'Message', type: 'string' }, $name: 'DocsTopLevelRes' },
        },
        run: async () => ({ message: 'ok' }),
      });

      const schema = JSON.parse(buildFishkaSchemaJsonResponse());
      expect(schema.openapi).toBe('3.0.1');
      expect(schema.paths['/docs-top-level']).toBeDefined();
      expect(schema.paths['/docs-top-level'].get.summary).toBe('Top level endpoint');
    });

    it('should document versioned endpoint with /v1/ prefix', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'docs-versioned',
        version: '1',
        doc: {
          summary: 'Versioned v1 endpoint',
          description: 'An endpoint with v1 prefix.',
          response: { message: { text: 'Message', type: 'string' }, $name: 'DocsVersionedRes' },
        },
        run: async () => ({ message: 'v1' }),
      });

      const schema = JSON.parse(buildFishkaSchemaJsonResponse());
      const v = schema.paths['/v1/docs-versioned'];
      expect(v).toBeDefined();
      expect(v.get.summary).toBe('Versioned v1 endpoint');
    });

    it('should document POST request/response bodies', async () => {
      const routes = getTestRoutes();
      routes.post<{ title: string }, { id: string }>({
        path: 'docs-post',
        doc: {
          summary: 'Create resource',
          description: 'Creates a new resource',
          request: { title: { text: 'Title', type: 'string', isRequired: true }, $name: 'DocsPostReq' },
          response: { id: { text: 'ID', type: 'string' }, $name: 'DocsPostRes' },
        },
        validator: { title: v => assertString(v, '400: title required') },
        run: async () => ({ id: '1' }),
      });

      const schema = JSON.parse(buildFishkaSchemaJsonResponse());
      const v = schema.paths['/docs-post'].post;
      expect(v.requestBody).toBeDefined();
      expect(v.responses['200']).toBeDefined();
      expect(v.responses['400']).toBeDefined();
    });
  });
});
