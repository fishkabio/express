import { assertString } from '@fishka/assertions';
import { registerUrlParameter } from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

// Register custom parameters for this test suite
registerUrlParameter('sku', {});
registerUrlParameter('shopId', {});

describe('Custom URL Parameters', () => {
  it('should handle route with custom string parameter (SKU)', async () => {
    const routes = getTestRoutes();
    routes.get<{ sku: string }>('products/:sku', {
      // Runtime validation
      pathValidator: {
        sku: v => assertString(v, 'SKU must be string'),
      },
      run: async ctx => ({ sku: ctx.params.get('sku') }),
    });

    const response = await makeRequest('GET', '/products/ABC-123');
    expect(response.status).toBe(200);
    expect(getApiResult<{ sku: string }>(response).sku).toBe('ABC-123');
  });

  it('should handle route with custom integer parameter (shopId)', async () => {
    const routes = getTestRoutes();

    routes.get<{ id: string }>('shops/:shopId', {
      // Runtime validation (checking it parses as integer is up to validator logic usually,
      // but express params are always strings. We validate it looks like a number)
      pathValidator: {
        shopId: v => {
          assertString(v);
          if (isNaN(parseInt(v))) throw new Error('400: Not a number');
        },
      },
      run: async ctx => ({ id: ctx.params.get('shopId') }),
    });

    const response = await makeRequest('GET', '/shops/999');
    expect(response.status).toBe(200);
    expect(getApiResult<{ id: string }>(response).id).toBe('999');
  });
});
