import { assertString } from '@fishka/assertions';
import { assertHttp, HTTP_BAD_REQUEST, registerUrlParameter } from '../src';
import { getApiResult, getTestRoutes, makeRequest } from './test-setup';

describe('Global URL Parameters', () => {
  // Register a global parameter with validation
  registerUrlParameter('orgId', {
    validator: (val: unknown) => {
      assertString(val);
      assertHttp(
        typeof val === 'string' && val.startsWith('org-'),
        HTTP_BAD_REQUEST,
        'Organization ID must start with "org-"',
      );
    },
  });

  it('should validate global parameter correctly (success)', async () => {
    const routes = getTestRoutes();
    routes.get<{ id: string }>('orgs/:orgId', async ctx => ({
      id: ctx.params.get('orgId'),
    }));

    const response = await makeRequest('GET', '/orgs/org-123');
    expect(response.status).toBe(200);
    expect(getApiResult<{ id: string }>(response).id).toBe('org-123');
  });

  it('should validate global parameter correctly (failure)', async () => {
    const routes = getTestRoutes();
    // Re-mount isn't needed strictly if app persists, but for clarity:
    routes.get<{ id: string }>('orgs-fail/:orgId', async ctx => ({
      id: ctx.params.get('orgId'),
    }));

    const response = await makeRequest('GET', '/orgs-fail/123');
    expect(response.status).toBe(400);
    expect(response.body?.error).toContain('Organization ID must start with "org-"');
  });

  it('should apply global validation to query parameters', async () => {
    const routes = getTestRoutes();
    routes.get<{ id: string }>('search-org', async ctx => ({
      id: ctx.query.get('orgId') || '',
    }));

    // Valid
    const responseValid = await makeRequest('GET', '/search-org?orgId=org-999');
    expect(responseValid.status).toBe(200);

    // Invalid
    const responseInvalid = await makeRequest('GET', '/search-org?orgId=bad-id');
    expect(responseInvalid.status).toBe(400);
  });
});
