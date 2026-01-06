import { assertString } from '@fishka/assertions';
import { configureExpressApi, registerUrlParameter, RequestContext, resetExpressApiConfig } from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

registerUrlParameter('id', {
  doc: {
    type: 'string',
    text: 'ID',
    description: 'Resource ID.',
  },
});

describe('API Configuration: Optional Documentation', () => {
  afterEach(() => {
    // Reset configuration after each test.
    resetExpressApiConfig();
  });

  describe('Default behavior (requireDocs: false)', () => {
    it('should allow GET endpoint without doc', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'no-doc-get',
        run: async () => ({ value: 'success' }),
      });

      const response = await makeRequest('GET', '/no-doc-get');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('success');
    });

    it('should allow POST endpoint without doc', async () => {
      const routes = getTestRoutes();
      routes.post({
        path: 'no-doc-post',
        validator: { name: assertString },
        run: async (ctx: RequestContext<{ name: string }>) => ({ value: ctx.request.name }),
      });

      const response = await makeRequest('POST', '/no-doc-post', { body: { name: 'test' } });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('test');
    });

    it('should allow DELETE endpoint without doc', async () => {
      const routes = getTestRoutes();
      routes.delete({
        path: 'no-doc-delete/:id',
        run: async () => {},
      });

      const response = await makeRequest('DELETE', '/no-doc-delete/123');
      expect(response.status).toBe(200);
    });

    it('should allow PUT endpoint without doc', async () => {
      const routes = getTestRoutes();
      routes.put({
        path: 'no-doc-put/:id',
        validator: {},
        run: async (ctx: RequestContext<Record<string, never>>) => ({ value: ctx.params.get('id') }),
      });

      const response = await makeRequest('PUT', '/no-doc-put/456', { body: {} });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('456');
    });

    it('should allow PATCH endpoint without doc', async () => {
      const routes = getTestRoutes();
      routes.patch({
        path: 'no-doc-patch/:id',
        validator: {},
        run: async (ctx: RequestContext<Record<string, never>>) => ({ value: ctx.params.get('id') }),
      });

      const response = await makeRequest('PATCH', '/no-doc-patch/789', { body: {} });
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('789');
    });

    it('should NOT throw when URL parameter is missing in optional docs mode', async () => {
      const routes = getTestRoutes();
      // Should not throw even though ':missingParam' is not registered
      routes.get<{ value: string }>({
        path: 'missing-param/:missingParam',
        doc: {
          summary: 'Missing param',
          description: 'This should not crash',
          response: { value: { text: 'Value', type: 'string' }, $name: 'MissingParamRes' },
        },
        run: async ctx => ({ value: ctx.params.get('missingParam') }),
      });

      const response = await makeRequest('GET', '/missing-param/123');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('123');
    });
  });

  describe('Strict mode (requireDocs: true)', () => {
    beforeEach(() => {
      configureExpressApi({ requireDocs: true });
    });

    it('should throw error for GET endpoint without doc', () => {
      const routes = getTestRoutes();

      expect(() => {
        routes.get({
          path: 'missing-doc',
          run: async () => ({ value: 'test' }),
        });
      }).toThrow('[API] Documentation (doc) is required for GET /missing-doc');
    });

    it('should throw error for POST endpoint without doc', () => {
      const routes = getTestRoutes();

      expect(() => {
        routes.post({
          path: 'missing-doc-post',
          validator: {},
          run: async (_ctx: RequestContext<Record<string, never>>) => ({ value: 'test' }),
        });
      }).toThrow('[API] Documentation (doc) is required for POST /missing-doc-post');
    });

    it('should throw error for DELETE endpoint without doc', () => {
      const routes = getTestRoutes();

      expect(() => {
        routes.delete({
          path: 'missing-doc-delete',
          run: async () => {},
        });
      }).toThrow('[API] Documentation (doc) is required for DELETE /missing-doc-delete');
    });

    it('should allow endpoint with doc when requireDocs is true', async () => {
      const routes = getTestRoutes();
      routes.get({
        path: 'with-doc',
        doc: {
          summary: 'Test endpoint',
          description: 'Test endpoint description',
          response: { value: { text: 'Value', type: 'string' }, $name: 'WithDocRes' },
        },
        run: async () => ({ value: 'success' }),
      });

      const response = await makeRequest('GET', '/with-doc');
      expect(response.status).toBe(200);
      expect(getApiResult<{ value: string }>(response).value).toBe('success');
    });

    it('should throw when URL parameter is missing in strict docs mode', () => {
      const routes = getTestRoutes();
      expect(() => {
        routes.get<{ value: string }>({
          path: 'strict-missing-param/:missingParamStrict',
          doc: {
            summary: 'Strict Missing param',
            description: 'This SHOULD crash',
            response: { value: { text: 'Value', type: 'string' }, $name: 'StrictMissingParamRes' },
          },
          run: async () => ({ value: 'test' }),
        });
      }).toThrow("Invalid URL parameter: 'missingParamStrict'");
    });
  });

  describe('Mixed scenarios', () => {
    it('should allow switching from permissive to strict mode', () => {
      // First, create endpoint without doc (default permissive mode)
      let routes = getTestRoutes();
      routes.get({
        path: 'permissive-endpoint',
        run: async () => ({ value: 'ok' }),
      });

      // Switch to strict mode.
      configureExpressApi({ requireDocs: true });

      // New endpoint should require doc.
      routes = getTestRoutes();
      expect(() => {
        routes.get({
          path: 'strict-endpoint',
          run: async () => ({ value: 'test' }),
        });
      }).toThrow('[API] Documentation (doc) is required');
    });

    it('should allow switching from strict to permissive mode', async () => {
      configureExpressApi({ requireDocs: true });

      // Should throw in strict mode
      let routes = getTestRoutes();
      expect(() => {
        routes.get({
          path: 'strict-fails',
          run: async () => ({ value: 'test' }),
        });
      }).toThrow();

      // Switch to permissive mode
      configureExpressApi({ requireDocs: false });

      // Should succeed now
      routes = getTestRoutes();
      routes.get({
        path: 'permissive-succeeds',
        run: async () => ({ value: 'success' }),
      });

      // Verify it works
      const response = await makeRequest('GET', '/permissive-succeeds');
      expect(response.status).toBe(200);
    });
  });

  describe('Warning mode (warnOnMissingDocs: true)', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should warn via console when warnOnMissingDocs is true', () => {
      configureExpressApi({
        warnOnMissingDocs: true,
        requireDocs: false,
      });

      const routes = getTestRoutes();
      routes.get({
        path: 'warn-console',
        run: async () => ({ value: 'test' }),
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[API] No documentation for GET /warn-console');
    });

    it('should not warn when warnOnMissingDocs is false', () => {
      configureExpressApi({
        warnOnMissingDocs: false,
      });

      const routes = getTestRoutes();
      routes.get({
        path: 'no-warn-config',
        run: async () => ({ value: 'test' }),
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not warn in strict mode even with warnOnMissingDocs true', () => {
      configureExpressApi({
        warnOnMissingDocs: true,
        requireDocs: true,
      });

      const routes = getTestRoutes();

      // Should throw error, not warn
      expect(() => {
        routes.get({
          path: 'no-warn-strict',
          run: async () => ({ value: 'test' }),
        });
      }).toThrow('[API] Documentation (doc) is required');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for endpoints with documentation', () => {
      configureExpressApi({
        warnOnMissingDocs: true,
      });

      const routes = getTestRoutes();
      routes.get({
        path: 'with-doc-no-warn',
        doc: {
          summary: 'Test endpoint',
          description: 'Test endpoint description',
          response: { value: { text: 'Value', type: 'string' }, $name: 'TestRes' },
        },
        run: async () => ({ value: 'success' }),
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
