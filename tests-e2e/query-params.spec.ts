import { describe, expect, it } from '@jest/globals';
import express from 'express';
import { assertHttp, HTTP_BAD_REQUEST, HTTP_OK, pathParam, queryParam } from '../src';
import { addErrorHandling, getTestApp, makeRequest } from './test-setup';

describe('Query parameters tests', () => {
  it('should handle query parameters in simple routes', async () => {
    const app = getTestApp();

    app.get('/simple-test', async (req, res) => {
      res.json({
        page: queryParam(req, 'page'),
        limit: queryParam(req, 'limit'),
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/simple-test?page=1&limit=20');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ page: '1', limit: '20' });
  });

  it('should handle query parameters with path parameters', async () => {
    const app = getTestApp();

    app.get('/users/:userId', async (req, res) => {
      res.json({
        userId: pathParam(req, 'userId'),
        page: queryParam(req, 'page'),
        limit: queryParam(req, 'limit'),
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/users/123?page=5&limit=10');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ userId: '123', page: '5', limit: '10' });
  });

  it('should handle query parameters in mounted Express routers (bug scenario)', async () => {
    const app = getTestApp();

    // Create a router that will be mounted (simulating API versioning or nested routes)
    const apiRouter = express.Router();

    apiRouter.get('/monitoring', async (req, res) => {
      res.json({
        page: queryParam(req, 'page'),
        limit: queryParam(req, 'limit'),
        sort: queryParam(req, 'sort'),
      });
    });

    // Mount the router at /api path
    app.use('/api', apiRouter);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/monitoring?page=2&limit=50&sort=desc');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ page: '2', limit: '50', sort: 'desc' });
  });

  it('should handle query parameters with path params in mounted routers', async () => {
    const app = getTestApp();

    const v1Router = express.Router();

    v1Router.get('/items/:itemId', async (req, res) => {
      res.json({
        itemId: pathParam(req, 'itemId'),
        page: queryParam(req, 'page'),
        details: queryParam(req, 'details'),
      });
    });

    app.use('/api/v1', v1Router);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/v1/items/789?page=3&details=true');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ itemId: '789', page: '3', details: 'true' });
  });

  it('should handle deeply nested routers', async () => {
    const app = getTestApp();

    // Create deeply nested router structure
    const adminRouter = express.Router();
    adminRouter.get('/dashboard', async (req, res) => {
      res.json({
        view: queryParam(req, 'view'),
        page: queryParam(req, 'page'),
      });
    });

    const apiRouter = express.Router();
    apiRouter.use('/admin', adminRouter);

    const mainRouter = express.Router();
    mainRouter.use('/api/v1', apiRouter);

    app.use(mainRouter);
    addErrorHandling(app);

    const response = await makeRequest('GET', '/api/v1/admin/dashboard?view=compact&page=1');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body).toEqual({ view: 'compact', page: '1' });
  });

  it('should handle query parameters correctly', async () => {
    const app = getTestApp();

    app.get('/search', async (req, res) => {
      res.json({
        q: queryParam(req, 'q'),
        page: queryParam(req, 'page'),
        // Both parameters are required
      });
    });
    addErrorHandling(app);

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

    app.get('/filter', async (req, res) => {
      res.json({
        tags: queryParam(req, 'tags'),
        // Note: queryParam returns first value for array params
        // This is the existing behavior
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/filter?tags=js&tags=ts&tags=node');

    expect(response.status).toBe(HTTP_OK);
    // Current behavior: getQueryParam returns first value for array params
    expect(response.body).toEqual({ tags: 'js' });
  });

  it('should work with query parameter validation using assertHttp', async () => {
    const app = getTestApp();

    app.get('/validated', async (req, res) => {
      const pageStr = queryParam(req, 'page');
      const page = pageStr ? parseInt(pageStr, 10) : 1;

      // Use assertHttp for proper HTTP error handling
      assertHttp(!isNaN(page) && page >= 1, HTTP_BAD_REQUEST, 'Page must be a positive number');

      res.json({ page });
    });
    addErrorHandling(app);

    // Valid request
    const validResponse = await makeRequest('GET', '/validated?page=5');
    expect(validResponse.status).toBe(HTTP_OK);
    expect(validResponse.body).toEqual({ page: 5 });

    // Invalid request - will return 400 because we use assertHttp
    const invalidResponse = await makeRequest('GET', '/validated?page=abc');
    expect(invalidResponse.status).toBe(HTTP_BAD_REQUEST);
  });

  it('should reproduce the bug from bug report: getQueryParam() with validators throws BAD_REQUEST for missing parameters', async () => {
    const app = getTestApp();

    // Create a monitoring endpoint similar to the bug report
    app.get('/api/monitoring/events', async (req, res) => {
      // With validators, parameters are required
      // queryParam() will throw BAD_REQUEST if parameters are missing
      const names = queryParam(req, 'names');
      const from = queryParam(req, 'from');
      const to = queryParam(req, 'to');

      // These lines are reached only if all parameters are present
      res.json({
        events: [],
        params: { names, from, to },
      });
    });
    addErrorHandling(app);

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

    app.get('/test-empty-param', async (req, res) => {
      const emptyParam = queryParam(req, 'empty');
      const missingParam = queryParam(req, 'missing');

      res.json({
        emptyParam,
        missingParam,
        isEmptyUndefined: emptyParam === undefined,
        isMissingUndefined: missingParam === undefined,
      });
    });
    addErrorHandling(app);

    // Empty string parameter should be treated as missing (BAD_REQUEST)
    const response = await makeRequest('GET', '/test-empty-param?empty=');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: empty');
  });

  it('should test what happens with special characters in query params', async () => {
    const app = getTestApp();

    app.get('/test-special', async (req, res) => {
      const param1 = queryParam(req, 'param1');
      const param2 = queryParam(req, 'param2');
      const param3 = queryParam(req, 'param3');

      res.json({
        param1,
        param2,
        param3,
      });
    });
    addErrorHandling(app);

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

    app.get('/test-required', async (req, res) => {
      const param = queryParam(req, 'requiredParam');
      res.json({ param });
    });
    addErrorHandling(app);

    // Request without parameter should fail
    const response = await makeRequest('GET', '/test-required');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: requiredParam');
  });

  it('should work when required query parameter with validator is provided', async () => {
    const app = getTestApp();

    app.get('/test-required-present', async (req, res) => {
      const param = queryParam(req, 'requiredParam');
      res.json({ param });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-required-present?requiredParam=value');

    expect(response.status).toBe(HTTP_OK);
    expect(response.body?.['param']).toBe('value');
  });

  it('should be consistent with pathParam() method behavior for required parameters', async () => {
    const app = getTestApp();

    app.get('/compare/:pathParam', async (req, res) => {
      const pParam = pathParam(req, 'pathParam');
      const qParam = queryParam(req, 'queryParam');
      res.json({ pathParam: pParam, queryParam: qParam });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/compare/value');
    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: queryParam');
  });

  it('should handle empty string as missing parameter for required query params with validators', async () => {
    const app = getTestApp();

    app.get('/test-empty-string-required', async (req, res) => {
      const param = queryParam(req, 'param');
      res.json({ param });
    });
    addErrorHandling(app);

    // Empty string should be treated as missing for required parameters
    const response = await makeRequest('GET', '/test-empty-string-required?param=');

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    expect(response.body?.['error']).toContain('Missing required parameter: param');
  });
});
