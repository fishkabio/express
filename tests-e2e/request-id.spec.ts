import { configureExpressApi, HTTP_INTERNAL_SERVER_ERROR, resetExpressApiConfig } from '../src';
import { addErrorHandling, getTestApp, makeRequest } from './test-setup';

describe('Request ID Handling', () => {
  const REQUEST_ID_HEADER = 'x-request-id';

  beforeEach(() => {
    // Enable request ID functionality for all tests
    configureExpressApi({ requestIdHeader: REQUEST_ID_HEADER });
  });

  afterEach(() => {
    resetExpressApiConfig();
  });

  it('should automatically generate a request ID if none provided', async () => {
    const app = getTestApp();
    app.get('/test-auto-id', async (_req, res) => {
      res.json({ value: 'ok' });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-auto-id');
    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBeDefined();
    expect(typeof response.headers[REQUEST_ID_HEADER]).toBe('string');
    expect((response.headers[REQUEST_ID_HEADER] as string).length).toBeGreaterThan(0);
  });

  it('should use externally provided request ID from header', async () => {
    const app = getTestApp();
    app.get('/test-header-id', async (_req, res) => {
      res.json({ value: 'ok' });
    });
    addErrorHandling(app);

    const customId = 'my-custom-trace-id';
    const response = await makeRequest('GET', '/test-header-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(customId);
  });

  it('should include request ID in error responses', async () => {
    const app = getTestApp();
    app.get('/test-error-id', async () => {
      throw new Error('Boom');
    });
    addErrorHandling(app);

    const customId = 'error-trace-id';
    const response = await makeRequest('GET', '/test-error-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(customId);
  });

  it('should ignore request ID from header if trustRequestIdHeader is false', async () => {
    configureExpressApi({ trustRequestIdHeader: false });

    const app = getTestApp();
    app.get('/test-untrusted-id', async (_req, res) => {
      res.json({ value: 'ok' });
    });
    addErrorHandling(app);

    const customId = 'untrusted-id';
    const response = await makeRequest('GET', '/test-untrusted-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBeDefined();
    expect(response.headers[REQUEST_ID_HEADER]).not.toBe(customId);
  });

  it('should not create request ID when requestIdHeader is not set', async () => {
    // Reset to default config (requestIdHeader: undefined)
    resetExpressApiConfig();

    const app = getTestApp();
    app.get('/test-disabled-id', async (_req, res) => {
      res.json({ value: 'ok' });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-disabled-id');

    expect(response.status).toBe(200);
    // Should not have request ID header
    expect(response.headers[REQUEST_ID_HEADER]).toBeUndefined();
  });

  it('should allow custom header names', async () => {
    const customHeader = 'x-correlation-id';
    configureExpressApi({ requestIdHeader: customHeader });

    const app = getTestApp();
    app.get('/test-custom-header', async (_req, res) => {
      res.json({ value: 'ok' });
    });
    addErrorHandling(app);

    const response = await makeRequest('GET', '/test-custom-header');

    expect(response.status).toBe(200);
    expect(response.headers[customHeader]).toBeDefined();
    expect(response.headers[REQUEST_ID_HEADER]).toBeUndefined(); // Old header should not exist
  });
});
