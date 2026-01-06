import { assertString } from '@fishka/assertions';
import { buildSchemaJsonResponse, registerUrlParameter } from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

// Register custom parameters for this test suite
registerUrlParameter('sku', {
  doc: {
    type: 'string',
    text: 'Product SKU',
    description: 'Unique Stock Keeping Unit',
  },
});

registerUrlParameter('shopId', {
  doc: {
    type: 'integer',
    text: 'Shop ID',
    description: 'Numeric ID of the shop',
  },
});

describe('Custom URL Parameters', () => {
  it('should handle route with custom string parameter (SKU)', async () => {
    const routes = getTestRoutes();
    routes.get<{ sku: string }>({
      path: 'products/:sku',
      doc: {
        summary: 'Get product',
        description: 'Get product by SKU',
        response: { sku: { text: 'SKU', type: 'string' }, $name: 'ProductRes' },
      },
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

    routes.get<{ id: string }>({
      path: 'shops/:shopId',

      doc: {
        summary: 'Get shop',
        description: 'Get shop by ID',
        response: { id: { text: 'ID', type: 'string' }, $name: 'ShopRes' },
      },
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

  it('should generate correct OpenAPI documentation for custom parameters', async () => {
    // Re-using routes defined above (in the shared server context) might be tricky if tests run sequentially and clear routes?
    // Actually getTestRoutes() creates a NEW router attached to the app.
    // The previous routes are still there on the app.

    // Let's check the schema.
    const schema = JSON.parse(buildSchemaJsonResponse());
    console.log('Available paths in schema:', Object.keys(schema.paths));

    // Check /products/:sku
    const productPath = schema.paths['/products/:sku'];
    expect(productPath).toBeDefined();
    const skuParam = productPath.get.parameters.find((p: any) => p.name === 'Product SKU');
    expect(skuParam).toBeDefined();
    expect(skuParam.in).toBe('path');
    expect(skuParam.description).toBe('Unique Stock Keeping Unit');
    expect(skuParam.schema.type).toBe('string');

    // Check /shops/:shopId
    const shopPath = schema.paths['/shops/:shopId'];
    expect(shopPath).toBeDefined();
    const shopIdParam = shopPath.get.parameters.find((p: any) => p.name === 'Shop ID');
    expect(shopIdParam).toBeDefined();
    expect(shopIdParam.description).toBe('Numeric ID of the shop');
    expect(shopIdParam.schema.type).toBe('integer');
  });

  it('should fail runtime validation if validator rejects the custom parameter', async () => {
    // Using the /shops/:shopId route defined above
    const response = await makeRequest('GET', '/shops/not-a-number');
    expect(response.status).toBe(400);
    // API usually returns 400 for validation errors if catchRouteErrors is used (which it is)
  });
});
