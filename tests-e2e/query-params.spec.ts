import { describe, expect, it } from '@jest/globals';
import express from 'express';
import { assertHttp, HTTP_BAD_REQUEST, HTTP_OK, mount } from '../src';
import { getTestApp, makeRequest } from './test-setup';

describe('Query parameters tests', () => {
  it('should handle query parameters in simple routes', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'simple-test',
      endpoint: {
        run: async ctx => ({
          page: ctx.query('page'),
          limit: ctx.query('limit'),
        }),
      },
    });

    const response = await makeRequest('GET', '/simple-test?page=1&limit=20');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ page: '1', limit: '20' });
  });

  it('should handle query parameters with path parameters', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'users/:userId',
      endpoint: {
        run: async ctx => ({
          userId: ctx.path('userId'),
          page: ctx.query('page'),
          limit: ctx.query('limit'),
        }),
      },
    });

    const response = await makeRequest('GET', '/users/123?page=5&limit=10');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123', page: '5', limit: '10' });
  });

  it('should handle query parameters in mounted Express routers (bug scenario)', async () => {
    const app = getTestApp();

    // Create a router that will be mounted (simulating API versioning or nested routes)
    const apiRouter = express.Router();

    mount(apiRouter, {
      method: 'get',
      path: 'monitoring',
      endpoint: {
        run: async ctx => ({
          page: ctx.query('page'),
          limit: ctx.query('limit'),
          sort: ctx.query('sort'),
        }),
      },
    });

    // Mount the router at /api path
    app.use('/api', apiRouter);

    const response = await makeRequest('GET', '/api/monitoring?page=2&limit=50&sort=desc');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ page: '2', limit: '50', sort: 'desc' });
  });

  it('should handle query parameters with path params in mounted routers', async () => {
    const app = getTestApp();

    const v1Router = express.Router();

    mount(v1Router, {
      method: 'get',
      path: 'items/:itemId',
      endpoint: {
        run: async ctx => ({
          itemId: ctx.path('itemId'),
          page: ctx.query('page'),
          details: ctx.query('details'),
        }),
      },
    });

    app.use('/api/v1', v1Router);

    const response = await makeRequest('GET', '/api/v1/items/789?page=3&details=true');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ itemId: '789', page: '3', details: 'true' });
  });

  it('should handle deeply nested routers', async () => {
    const app = getTestApp();

    // Create deeply nested router structure
    const adminRouter = express.Router();
    mount(adminRouter, {
      method: 'get',
      path: 'dashboard',
      endpoint: {
        run: async ctx => ({
          view: ctx.query('view'),
          page: ctx.query('page'),
        }),
      },
    });

    const apiRouter = express.Router();
    apiRouter.use('/admin', adminRouter);

    const mainRouter = express.Router();
    mainRouter.use('/api/v1', apiRouter);

    app.use(mainRouter);

    const response = await makeRequest('GET', '/api/v1/admin/dashboard?view=compact&page=1');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ view: 'compact', page: '1' });
  });

  it('should handle query parameters correctly', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'search',
      endpoint: {
        run: async ctx => ({
          q: ctx.query('q'),
          page: ctx.query('page'),
          // Both parameters are required
        }),
      },
    });

    // Test with all parameters
    const response1 = await makeRequest('GET', '/search?q=test&page=2');
    expect(response1.status).toBe(HTTP_OK);
    expect(response1.body).toEqual({ q: 'test', page: '2' });

    // Test with missing parameter - should fail
    const response2 = await makeRequest('GET', '/search?q=test');
    expect(response2.status).toBe(HTTP_BAD_REQUEST);
    expect(response2.body?.['error']).toContain('Missing required parameter: page');
  });

  it('should handle array query parameters', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'filter',
      endpoint: {
        run: async ctx => ({
          tags: ctx.query('tags'),
          // Note: ctx.query returns first value for array params
          // This is the existing behavior
        }),
      },
    });

    const response = await makeRequest('GET', '/filter?tags=js&tags=ts&tags=node');

    expect(response.status).toBe(HTTP_OK);
    // Current behavior: ctx.query returns first value for array params
    expect(response.body).toEqual({ tags: 'js' });
  });

  it('should work with query parameter validation using assertHttp', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'validated',
      endpoint: {
        run: async ctx => {
          const pageStr = ctx.query('page');
          const page = pageStr ? parseInt(pageStr, 10) : 1;

          // Use assertHttp for proper HTTP error handling
          assertHttp(!isNaN(page) && page >= 1, HTTP_BAD_REQUEST, 'Page must be a positive number');

          return { page };
        },
      },
    });

    // Valid request
    const validResponse = await makeRequest('GET', '/validated?page=5');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ page: 5 });

    // Invalid request - will return 400 because we use assertHttp
    const invalidResponse = await makeRequest('GET', '/validated?page=abc');
    expect(invalidResponse.status).toBe(HTTP_BAD_REQUEST);
  });

  it('should reproduce the bug from bug report: ctx.query() with validators throws BAD_REQUEST for missing parameters', async () => {
    const app = getTestApp();

    // Create a monitoring endpoint similar to the bug report
    mount(app, {
      method: 'get',
      path: 'api/monitoring/events',
      endpoint: {
        run: async ctx => {
          // With validators, parameters are required
          // ctx.query() will throw BAD_REQUEST if parameters are missing
          const names = ctx.query('names');
          const from = ctx.query('from');
          const to = ctx.query('to');

          // These lines are reached only if all parameters are present
          return {
            events: [],
            params: { names, from, to },
          };
        },
      },
    });

    // Test 1: With all parameters - should work
    const response1 = await makeRequest('GET', '/api/monitoring/events?names=test&from=2026-01-14&to=2026-01-15');
    expect(response1.status).toBe(HTTP_OK);
    expect(response1.body).toEqual({
      events: [],
      params: {
        names: 'test',
        from: '2026-01-14',
        to: '2026-01-15',
      },
    });

    // Test 2: Missing one parameter - should throw BAD_REQUEST
    const response2 = await makeRequest('GET', '/api/monitoring/events?names=test&from=2026-01-14');
    expect(response2.status).toBe(HTTP_BAD_REQUEST);
    expect(response2.body?.['error']).toContain('Missing required parameter: to');
  });

  it('should test edge case with empty string query parameters', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'test-empty-param',
      endpoint: {
        run: async ctx => {
          const emptyParam = ctx.query('empty');
          const missingParam = ctx.query('missing');

          return {
            emptyParam,
            missingParam,
            isEmptyUndefined: emptyParam === undefined,
            isMissingUndefined: missingParam === undefined,
          };
        },
      },
    });

    // Empty string parameter should be treated as missing (BAD_REQUEST)
    const response = await makeRequest('GET', '/test-empty-param?empty=');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: empty');
  });

  it('should test what happens with special characters in query params', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'test-special',
      endpoint: {
        run: async ctx => {
          const param1 = ctx.query('param1');
          const param2 = ctx.query('param2');
          const param3 = ctx.query('param3');

          return {
            param1,
            param2,
            param3,
          };
        },
      },
    });

    const response = await makeRequest(
      'GET',
      '/test-special?param1=value+with+spaces&param2=value%20with%20encoded&param3=special@chars.com',
    );

    expect(response.status).toBe(HTTP_OK);
    // Note: '+' gets decoded to space by URL parsing
    expect(response.body?.['param1']).toBe('value with spaces');
    expect(response.body?.['param2']).toBe('value with encoded');
    expect(response.body?.['param3']).toBe('special@chars.com');
  });

  it('should throw BAD_REQUEST when required query parameter with validator is missing', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'test-required',
      endpoint: {
        run: async ctx => {
          const param = ctx.query('requiredParam');
          return { param };
        },
      },
    });

    // Request without parameter should fail
    const response = await makeRequest('GET', '/test-required');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: requiredParam');
  });

  it('should work when required query parameter with validator is provided', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'test-required-present',
      endpoint: {
        run: async ctx => {
          const param = ctx.query('requiredParam');
          return { param };
        },
      },
    });

    const response = await makeRequest('GET', '/test-required-present?requiredParam=value');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body?.['param']).toBe('value');
  });

  it('should be consistent with path() method behavior for required parameters', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'compare/:pathParam',
      endpoint: {
        run: async ctx => {
          const pathParam = ctx.path('pathParam');
          const queryParam = ctx.query('queryParam');
          return { pathParam, queryParam };
        },
      },
    });

    const response = await makeRequest('GET', '/compare/value');
    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: queryParam');
  });

  it('should handle empty string as missing parameter for required query params with validators', async () => {
    const app = getTestApp();

    mount(app, {
      method: 'get',
      path: 'test-empty-string-required',
      endpoint: {
        run: async ctx => {
          const param = ctx.query('param');
          return { param };
        },
      },
    });

    // Empty string should be treated as missing for required parameters
    const response = await makeRequest('GET', '/test-empty-string-required?param=');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: param');
  });
});
