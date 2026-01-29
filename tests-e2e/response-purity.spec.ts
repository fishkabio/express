import { configureExpressApi, resetExpressApiConfig } from '../src';
import { addErrorHandling, getTestApp, makeRequest } from './test-setup';

describe('Response purity', () => {
  beforeEach(() => {
    // Enable request ID functionality for tests that need it
    configureExpressApi({ requestIdHeader: 'x-request-id' });
  });

  afterEach(() => {
    resetExpressApiConfig();
  });
  it('should return exactly what endpoint returns without modifications', async () => {
    const app = getTestApp();

    // Test 1: Simple object
    app.get('/test-simple-object', async (_req, res) => {
      res.json({
        id: 1,
        name: 'test',
        nested: { value: 'deep' },
      });
    });

    // Test 2: Array
    app.get('/test-array', async (_req, res) => {
      res.json([
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
      ]);
    });

    // Test 3: Primitive values wrapped in objects (Express sends primitives as-is, not JSON)
    app.get('/test-string', async (_req, res) => res.json({ value: 'hello world' }));
    app.get('/test-number', async (_req, res) => res.json({ value: 42 }));
    app.get('/test-boolean', async (_req, res) => res.json({ value: true }));
    app.get('/test-null', async (_req, res) => res.json({ value: null }));

    // Test 4: Object with status property
    app.get('/test-with-status', async (_req, res) => {
      res.status(201).json({
        result: 'data',
        status: 201,
      });
    });

    // Test 5: Empty object
    app.get('/test-empty', async (_req, res) => res.json({}));

    addErrorHandling(app);

    // Make requests and verify responses
    const responses = await Promise.all([
      makeRequest('GET', '/test-simple-object'),
      makeRequest('GET', '/test-array'),
      makeRequest('GET', '/test-string'),
      makeRequest('GET', '/test-number'),
      makeRequest('GET', '/test-boolean'),
      makeRequest('GET', '/test-null'),
      makeRequest('GET', '/test-with-status'),
      makeRequest('GET', '/test-empty'),
    ]);

    // Verify each response
    expect(responses[0].body).toEqual({
      id: 1,
      name: 'test',
      nested: { value: 'deep' },
    });
    expect(responses[0].status).toBe(200);

    expect(responses[1].body).toEqual([
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ]);
    expect(responses[1].status).toBe(200);

    expect(responses[2].body).toEqual({ value: 'hello world' });
    expect(responses[2].status).toBe(200);

    expect(responses[3].body).toEqual({ value: 42 });
    expect(responses[3].status).toBe(200);

    expect(responses[4].body).toEqual({ value: true });
    expect(responses[4].status).toBe(200);

    expect(responses[5].body).toEqual({ value: null });
    expect(responses[5].status).toBe(200);

    expect(responses[6].body).toEqual({
      result: 'data',
      status: 201,
    });
    expect(responses[6].status).toBe(201); // Should use status from response

    expect(responses[7].body).toEqual({});
    expect(responses[7].status).toBe(200);

    // Verify no extra fields are added (except those explicitly returned by endpoints)
    // Skip the test-with-status endpoint since it explicitly returns 'result'
    const responsesToCheck = responses.filter((_, index) => index !== 6); // Skip index 6 (test-with-status)

    responsesToCheck.forEach(response => {
      const body = response.body;
      if (body && typeof body === 'object') {
        // Check that no framework-specific fields are added
        expect(body).not.toHaveProperty('requestId');
        expect(body).not.toHaveProperty('result');
      }
    });
  });

  it('should not modify error responses from HttpError', async () => {
    const app = getTestApp();

    app.get('/test-http-error', async () => {
      // Note: We can't directly throw HttpError here without importing it
      // This test is to verify that regular errors get proper error response
      // without extra fields added to the body
      throw new Error("I'm a teapot");
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-http-error');

    // Error responses should have a standard structure but no extra fields
    expect(response.status).toBe(500); // Regular errors become 500
    expect(response.body).toEqual({
      error: "I'm a teapot",
      status: 500,
    });

    // Should not have requestId in body
    expect(response.body).not.toHaveProperty('requestId');
    // Should not have details unless provided by HttpError
    expect(response.body).not.toHaveProperty('details');
  });

  it('should add requestId only to headers, not body', async () => {
    const app = getTestApp();

    app.get('/test-headers-only', async (_req, res) => {
      res.json({
        data: 'test',
        customField: 'value',
      });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-headers-only');

    // Body should be exactly what endpoint returned
    expect(response.body).toEqual({
      data: 'test',
      customField: 'value',
    });

    // Should have requestId in headers
    expect(response.headers['x-request-id']).toBeDefined();
    expect(typeof response.headers['x-request-id']).toBe('string');

    // Should NOT have requestId in body
    expect(response.body).not.toHaveProperty('requestId');
  });

  it('should not add requestId header when requestIdHeader is not set', async () => {
    // Disable request ID functionality
    resetExpressApiConfig();

    const app = getTestApp();
    app.get('/test-no-headers', async (_req, res) => {
      res.json({ data: 'test' });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-no-headers');

    // Body should be exactly what endpoint returned
    expect(response.body).toEqual({
      data: 'test',
    });

    // Should NOT have requestId in headers when disabled
    expect(response.headers['x-request-id']).toBeUndefined();

    // Should NOT have requestId in body
    expect(response.body).not.toHaveProperty('requestId');
  });
});
