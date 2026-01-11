import { param, toInt } from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

describe('Custom URL Parameters', () => {
  it('should handle route with custom string parameter (SKU)', async () => {
    const routes = getTestRoutes();
    routes.get('products/:sku', {
      $path: {
        sku: param(),
      },
      run: async ctx => ({ sku: ctx.path.sku }),
    });

    const response = await makeRequest('GET', '/products/ABC-123');
    expect(response.status).toBe(200);
    expect(getApiResult<{ sku: string }>(response).sku).toBe('ABC-123');
  });

  it('should handle route with custom integer parameter (shopId)', async () => {
    const routes = getTestRoutes();

    routes.get('shops/:shopId', {
      $path: {
        shopId: param(toInt()),
      },
      run: async ctx => ({ id: ctx.path.shopId }),
    });

    const response = await makeRequest('GET', '/shops/999');
    expect(response.status).toBe(200);
    expect(getApiResult<{ id: number }>(response).id).toBe(999);
  });
});
