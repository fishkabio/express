import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { mount, assertHttp, HTTP_BAD_REQUEST, HTTP_OK } from '../src';
import { getTestApp, initializeTestServer, makeRequest, teardownTestServer } from './test-setup';

describe('Query parameters tests', () => {
  beforeAll(async () => {
    await initializeTestServer();
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  it('should handle query parameters in simple routes', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'simple-test',
      endpoint: {
        run: async ctx => ({
          page: ctx.query('page'),
          limit: ctx.query('limit'),
        })
      }
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
        })
      }
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
        })
      }
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
        })
      }
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
        })
      }
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

  it('should handle optional query parameters correctly', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'search',
      endpoint: {
        run: async ctx => ({
          q: ctx.query('q'),
          page: ctx.query('page'),
          // page is optional, q is required by validator
        })
      }
    });

    // Test with all parameters
    const response1 = await makeRequest('GET', '/search?q=test&page=2');
    expect(response1.status).toBe(HTTP_OK);
    expect(response1.body).toEqual({ q: 'test', page: '2' });

    // Test with only required parameter
    const response2 = await makeRequest('GET', '/search?q=test');
    expect(response2.status).toBe(HTTP_OK);
    expect(response2.body).toEqual({ q: 'test', page: undefined });
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
        })
      }
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
        }
      }
    });

    // Valid request
    const validResponse = await makeRequest('GET', '/validated?page=5');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ page: 5 });

    // Invalid request - will return 400 because we use assertHttp
    const invalidResponse = await makeRequest('GET', '/validated?page=abc');
    expect(invalidResponse.status).toBe(HTTP_BAD_REQUEST);
  });
});
