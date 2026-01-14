import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { mount, assertHttp, HTTP_BAD_REQUEST, HTTP_OK } from '../src';
import { getTestApp, initializeTestServer, makeRequest, teardownTestServer } from './test-setup';

describe('Path parameters tests', () => {
  beforeAll(async () => {
    await initializeTestServer();
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  it('should handle simple path parameters', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'users/:userId',
      endpoint: {
        run: async ctx => ({
          userId: ctx.path('userId'),
        })
      }
    });

    const response = await makeRequest('GET', '/users/123');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123' });
  });

  it('should handle multiple path parameters', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'users/:userId/posts/:postId',
      endpoint: {
        run: async ctx => ({
          userId: ctx.path('userId'),
          postId: ctx.path('postId'),
        })
      }
    });

    const response = await makeRequest('GET', '/users/123/posts/456');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123', postId: '456' });
  });

  it('should handle path parameters in mounted routers', async () => {
    const app = getTestApp();
    
    const apiRouter = express.Router();
    
    mount(apiRouter, {
      method: 'get',
      path: 'items/:itemId',
      endpoint: {
        run: async ctx => ({
          itemId: ctx.path('itemId'),
        })
      }
    });

    app.use('/api', apiRouter);

    const response = await makeRequest('GET', '/api/items/789');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ itemId: '789' });
  });

  it('should handle path parameters with query parameters', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'products/:productId',
      endpoint: {
        run: async ctx => ({
          productId: ctx.path('productId'),
          page: ctx.query('page'),
          limit: ctx.query('limit'),
        })
      }
    });

    const response = await makeRequest('GET', '/products/abc123?page=2&limit=10');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ productId: 'abc123', page: '2', limit: '10' });
  });

  it('should handle path parameters with validation using assertHttp', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'orders/:orderId',
      endpoint: {
        run: async ctx => {
          const orderId = ctx.path('orderId');
          // Simple validation - orderId should be numeric
          assertHttp(/^\d+$/.test(orderId), HTTP_BAD_REQUEST, 'Order ID must be numeric');
          return { orderId };
        }
      }
    });

    // Valid request
    const validResponse = await makeRequest('GET', '/orders/12345');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ orderId: '12345' });

    // Invalid request (non-numeric ID) - will return 400
    const invalidResponse = await makeRequest('GET', '/orders/abc');
    expect(invalidResponse.status).toBe(HTTP_BAD_REQUEST);
  });

  it('should handle complex path patterns', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'categories/:categoryId/products/:productId/variants/:variantId',
      endpoint: {
        run: async ctx => ({
          categoryId: ctx.path('categoryId'),
          productId: ctx.path('productId'),
          variantId: ctx.path('variantId'),
        })
      }
    });

    const response = await makeRequest('GET', '/categories/electronics/products/laptop/variants/16gb-ram');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ 
      categoryId: 'electronics', 
      productId: 'laptop', 
      variantId: '16gb-ram' 
    });
  });

  it('should handle path parameters in deeply nested routers', async () => {
    const app = getTestApp();
    
    const v1Router = express.Router();
    
    mount(v1Router, {
      method: 'get',
      path: 'projects/:projectId/tasks/:taskId',
      endpoint: {
        run: async ctx => ({
          projectId: ctx.path('projectId'),
          taskId: ctx.path('taskId'),
        })
      }
    });

    app.use('/api/v1', v1Router);

    const response = await makeRequest('GET', '/api/v1/projects/proj-123/tasks/task-456');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ projectId: 'proj-123', taskId: 'task-456' });
  });

  it('should handle missing required path parameters', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'required/:id',
      endpoint: {
        run: async ctx => {
          // ctx.path() will throw if id is missing
          const id = ctx.path('id');
          return { id };
        }
      }
    });

    // Valid request with path parameter
    const validResponse = await makeRequest('GET', '/required/123');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ id: '123' });

    // Note: Express will return 404 for missing path parameter
    // since the route won't match without the parameter
  });

  it('should handle path parameters with special characters', async () => {
    const app = getTestApp();
    
    mount(app, {
      method: 'get',
      path: 'files/:fileName',
      endpoint: {
        run: async ctx => ({
          fileName: ctx.path('fileName'),
        })
      }
    });

    // Test with various special characters that are URL-encoded
    const response = await makeRequest('GET', '/files/document%20with%20spaces.pdf');
    
    expect(response.status).toBe(HTTP_OK);
    // Express decodes URL-encoded parameters
    expect(response.body).toEqual({ fileName: 'document with spaces.pdf' });
  });

  it('should handle path parameters combined with query params in mounted routers', async () => {
    const app = getTestApp();
    
    const adminRouter = express.Router();
    
    mount(adminRouter, {
      method: 'get',
      path: 'users/:userId/logs',
      endpoint: {
        run: async ctx => ({
          userId: ctx.path('userId'),
          page: ctx.query('page'),
          type: ctx.query('type'),
        })
      }
    });

    app.use('/api/admin', adminRouter);

    const response = await makeRequest('GET', '/api/admin/users/admin-123/logs?page=1&type=error');
    
    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ 
      userId: 'admin-123', 
      page: '1', 
      type: 'error' 
    });
  });
});
