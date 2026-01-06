# Express API

Type-safe Express.js routing with automatic OpenAPI 3.0 documentation.

## Installation

```bash
npm install @fishka/express express
```

## Quick Start

```typescript
import express from 'express';
import { buildSchemaJsonResponse, createRouteTable, registerUrlParameter } from '@fishka/express';

const app = express();
app.use(express.json());

// Register global URL parameters
registerUrlParameter('id', {
  doc: { type: 'string', text: 'User ID', description: 'Unique identifier' },
});

const routes = createRouteTable(app);

// GET /users/:id
routes.get<{ id: string; name: string }>({
  path: 'users/:id',
  doc: {
    summary: 'Get user',
    description: 'Get user by ID',
    response: {
      id: { text: 'User ID', type: 'string' },
      name: { text: 'Name', type: 'string' },
      $name: 'User',
    },
  },
  run: async ctx => ({
    id: ctx.params.get('id'),
    name: 'John',
  }),
});

// POST /users
routes.post<{ name: string }, { id: string }>({
  path: 'users',
  doc: {
    summary: 'Create user',
    description: 'Create new user',
    request: { name: { text: 'Name', type: 'string' }, $name: 'CreateUserReq' },
    response: { id: { text: 'ID', type: 'string' }, $name: 'CreateUserRes' },
  },
  validator: {
    name: v => {
      assertTruthy(v, '400: name required');
    },
  }, // import { assertTruthy } from '@fishka/assertions'
  run: async ctx => ({ id: '123' }),
});

// OpenAPI schema endpoint
app.get('/openapi', (_, res) => res.json(JSON.parse(buildSchemaJsonResponse())));

app.listen(3000);
```

## URL Parameters

All URL parameters (e.g., `:id`, `:userId`) must be registered globally before use. This ensures they are correctly validated and documented in OpenAPI.

```typescript
import { registerUrlParameter } from '@fishka/express';

// Simple string parameter
registerUrlParameter('slug', {
  doc: { type: 'string', text: 'Slug', description: 'Article slug' },
});

// UUID parameter
registerUrlParameter('organizationId', {
  doc: { type: 'string', text: 'Org ID', description: 'Organization UUID', format: 'uuid' },
});

// Integer parameter
registerUrlParameter('limit', {
  doc: { type: 'integer', text: 'Limit', description: 'Items per page' },
});
```

Using an unregistered parameter in a route path will throw an error.

## Configuration

### Optional Documentation

By default, endpoint documentation is optional. You can configure Express API to require documentation for all endpoints:

```typescript
import { configureExpressApi } from '@fishka/express';

// Require documentation (throws error at mount time if missing)
configureExpressApi({ requireDocs: true });

// Optional documentation (default)
configureExpressApi({ requireDocs: false });

// Optional documentation with warnings for missing docs
configureExpressApi({ requireDocs: false, warnOnMissingDocs: true });
```

When `requireDocs` is `true`, any endpoint without a `doc` field will throw an error during route registration:

```typescript
// This will throw an error if requireDocs is true
routes.get({
  path: 'users',
  run: async () => ({ users: [] }),
});
// Error: Documentation (doc) is required for GET /users.
// Set configureExpressApi({ requireDocs: false }) to disable this check.
```

When `warnOnMissingDocs` is `true`, endpoints without documentation will show warnings in the console:

```typescript
// This will show a warning if warnOnMissingDocs is true
routes.get({
  path: 'users',
  run: async () => ({ users: [] }),
});
// Console: No documentation for GET /users
```

**Use cases:**

- **Development**: Set `requireDocs: false` for rapid prototyping, optionally use `warnOnMissingDocs: true` to track missing documentation
- **Production**: Set `requireDocs: true` to ensure all endpoints are documented
- **Gradual migration**: Start with `requireDocs: false` and `warnOnMissingDocs: true`, add docs incrementally, then switch to `requireDocs: true`

## API Versioning

```typescript
// Top-level: GET /users
routes.get({ path: 'users', doc: {...}, run: ... });

// Versioned: GET /v1/users
routes.get({ path: 'users', version: '1', doc: {...}, run: ... });

// Versioned: GET /v2/users
routes.get({ path: 'users', version: '2', doc: {...}, run: ... });
```

## Authentication

```typescript
import { createAuthMiddleware, BasicAuthStrategy, getAuthUser } from '@fishka/express';

const auth = new BasicAuthStrategy(async (user, pass) =>
  user === 'admin' && pass === 'secret' ? { id: '1', role: 'admin' } : null
);

routes.get({
  path: 'profile',
  doc: {...},
  middlewares: [createAuthMiddleware(auth)],
  run: async (ctx) => {
    const user = getAuthUser(ctx);
    return { id: user.id };
  },
});
```

## Rate Limiting

```typescript
import { createRateLimiterMiddleware } from '@fishka/express';

app.use(
  await createRateLimiterMiddleware({
    points: { read: 100, write: 50 },
    duration: 60,
  }),
);
```

## License

MIT
