import { describe, expect, it } from '@jest/globals';
import express from 'express';
import { assertHttp, HTTP_BAD_REQUEST, HTTP_OK, pathParam, queryParam } from '../src';
import { addErrorHandling, getTestApp, makeRequest } from './test-setup';

describe('Path parameters tests', () => {
  it('should handle simple path parameters', async () => {
    const app = getTestApp();

    app.get('/users/:userId', async (req, res) => {
      res.json({ userId: pathParam(req, 'userId') });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/users/123');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123' });
  });

  it('should handle multiple path parameters', async () => {
    const app = getTestApp();

    app.get('/users/:userId/posts/:postId', async (req, res) => {
      res.json({
        userId: pathParam(req, 'userId'),
        postId: pathParam(req, 'postId'),
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/users/123/posts/456');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123', postId: '456' });
  });

  it('should handle path parameters in mounted routers', async () => {
    const app = getTestApp();

    const apiRouter = express.Router();

    apiRouter.get('/items/:itemId', async (req, res) => {
      res.json({ itemId: pathParam(req, 'itemId') });
    });

    app.use('/api', apiRouter);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/items/789');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ itemId: '789' });
  });

  it('should handle path parameters with query parameters', async () => {
    const app = getTestApp();

    app.get('/products/:productId', async (req, res) => {
      res.json({
        productId: pathParam(req, 'productId'),
        page: queryParam(req, 'page'),
        limit: queryParam(req, 'limit'),
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/products/abc123?page=2&limit=10');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ productId: 'abc123', page: '2', limit: '10' });
  });

  it('should handle path parameters with validation using assertHttp', async () => {
    const app = getTestApp();

    app.get('/orders/:orderId', async (req, res) => {
      const orderId = pathParam(req, 'orderId');
      // Simple validation - orderId should be numeric
      assertHttp(/^\d+$/.test(orderId), HTTP_BAD_REQUEST, 'Order ID must be numeric');
      res.json({ orderId });
    });
    addErrorHandling(app);

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

    app.get('/categories/:categoryId/products/:productId/variants/:variantId', async (req, res) => {
      res.json({
        categoryId: pathParam(req, 'categoryId'),
        productId: pathParam(req, 'productId'),
        variantId: pathParam(req, 'variantId'),
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/categories/electronics/products/laptop/variants/16gb-ram');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({
      categoryId: 'electronics',
      productId: 'laptop',
      variantId: '16gb-ram',
    });
  });

  it('should handle path parameters in deeply nested routers', async () => {
    const app = getTestApp();

    const v1Router = express.Router();

    v1Router.get('/projects/:projectId/tasks/:taskId', async (req, res) => {
      res.json({
        projectId: pathParam(req, 'projectId'),
        taskId: pathParam(req, 'taskId'),
      });
    });

    app.use('/api/v1', v1Router);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/v1/projects/proj-123/tasks/task-456');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ projectId: 'proj-123', taskId: 'task-456' });
  });

  it('should handle missing required path parameters', async () => {
    const app = getTestApp();

    app.get('/required/:id', async (req, res) => {
      // pathParam() will throw if id is missing
      const id = pathParam(req, 'id');
      res.json({ id });
    });
    addErrorHandling(app);

    // Valid request with path parameter
    const validResponse = await makeRequest('GET', '/required/123');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ id: '123' });

    // Note: Express will return 404 for missing path parameter
    // since the route won't match without the parameter
  });

  it('should handle path parameters with special characters', async () => {
    const app = getTestApp();

    app.get('/files/:fileName', async (req, res) => {
      res.json({ fileName: pathParam(req, 'fileName') });
    });
    addErrorHandling(app);

    // Test with various special characters that are URL-encoded
    const response = await makeRequest('GET', '/files/document%20with%20spaces.pdf');

    expect(response.status).toBe(HTTP_OK);
    // Express decodes URL-encoded parameters
    expect(response.body).toEqual({ fileName: 'document with spaces.pdf' });
  });

  it('should handle path parameters combined with query params in mounted routers', async () => {
    const app = getTestApp();

    const adminRouter = express.Router();

    adminRouter.get('/users/:userId/logs', async (req, res) => {
      res.json({
        userId: pathParam(req, 'userId'),
        page: queryParam(req, 'page'),
        type: queryParam(req, 'type'),
      });
    });

    app.use('/api/admin', adminRouter);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/admin/users/admin-123/logs?page=1&type=error');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({
      userId: 'admin-123',
      page: '1',
      type: 'error',
    });
  });
});
