import { configureExpressApi, HTTP_INTERNAL_SERVER_ERROR, resetExpressApiConfig } from '../src';
import { getTestRoutes, makeRequest } from './test-setup';

describe('Request ID Handling', () => {
  afterEach(() => {
    resetExpressApiConfig();
  });

  it('should automatically generate a request ID if none provided', async () => {
    const routes = getTestRoutes();
    routes.get('test-auto-id', async () => ({ value: 'ok' }));

    const response = await makeRequest('GET', '/test-auto-id');
    expect(response.status).toBe(200);
    expect(response.body?.requestId).toBeDefined();
    expect(typeof response.body?.requestId).toBe('string');
    expect((response.body?.requestId as string).length).toBeGreaterThan(0);
  });

  it('should use externally provided request ID from header', async () => {
    const routes = getTestRoutes();
    routes.get('test-header-id', async () => ({ value: 'ok' }));

    const customId = 'my-custom-trace-id';
    const response = await makeRequest('GET', '/test-header-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(200);
    expect(response.body?.requestId).toBe(customId);
  });

  it('should include request ID in error responses', async () => {
    const routes = getTestRoutes();
    routes.get('test-error-id', async () => {
      throw new Error('Boom');
    });

    const customId = 'error-trace-id';
    const response = await makeRequest('GET', '/test-error-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
    expect(response.body?.requestId).toBe(customId);
  });

  it('should ignore request ID from header if trustRequestIdHeader is false', async () => {
    configureExpressApi({ trustRequestIdHeader: false });

    const routes = getTestRoutes();
    routes.get('test-untrusted-id', async () => ({ value: 'ok' }));

    const customId = 'untrusted-id';
    const response = await makeRequest('GET', '/test-untrusted-id', {
      headers: { 'x-request-id': customId },
    });

    expect(response.status).toBe(200);
    expect(response.body?.requestId).toBeDefined();
    expect(response.body?.requestId).not.toBe(customId);
  });
});
