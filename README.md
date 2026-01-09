# Express API

Type-safe Express.js routing with clean, minimal API.

## Installation

```bash
npm install @fishka/express
```

## Quick Start

```typescript
import express from 'express';
import { createRouteTable } from '@fishka/express';

const app = express();
app.use(express.json());

const routes = createRouteTable(app);

// GET /users/:id - using function shorthand
routes.get<{ id: string; name: string }>('users/:id', async ctx => ({
  id: ctx.params.get('id'),
  name: 'John',
}));

// GET /users - using full endpoint object
routes.get<Array<{ id: string; name: string }>>('users', async () => [
  { id: '1', name: 'John' },
  { id: '2', name: 'Jane' },
]);

// POST /users
routes.post<{ name: string }, { id: string }>('users', {
  $body: { name: v => assertString(v, 'name required') },
  run: async ctx => ({ id: '1' }),
});

// DELETE /users/:id - using function shorthand
routes.delete('users/:id', async () => {
  // Delete user logic
});

app.listen(3000);
```

## URL Parameters

Global validation can be enforced for specific URL parameters (e.g., `:id`, `:orgId`) across all routes.

```typescript
import { registerUrlParameter } from '@fishka/express';
import { assertString, assertTruthy } from '@fishka/assertions';

// Register parameters with optional validation
registerUrlParameter('orgId', {
  validator: val => {
    assertString(val);
    assertTruthy(val.startsWith('org-'), 'Invalid Organization ID');
  },
});

// Now /orgs/:orgId will automatically validate that orgId starts with 'org-'
```

## Authentication

```typescript
import { createAuthMiddleware, BasicAuthStrategy, getAuthUser } from '@fishka/express';

const auth = new BasicAuthStrategy(async (user, pass) =>
  user === 'admin' && pass === 'secret' ? { id: '1', role: 'admin' } : null,
);

routes.get('profile', {
  middlewares: [createAuthMiddleware(auth)],
  run: async ctx => {
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

## HTTP Status Code in Validation

For cases where you need specific HTTP status codes (like 401 for authentication, 404 for not found), use `assertHttp`:

```typescript
import { assertHttp, HTTP_UNAUTHORIZED, HTTP_NOT_FOUND } from '@fishka/express';

// In a validator or route handler
assertHttp(req.headers.authorization, HTTP_UNAUTHORIZED, 'Authorization required');
assertHttp(user, HTTP_NOT_FOUND, 'User not found');
assertHttp(user.isAdmin, HTTP_FORBIDDEN, 'Admin access required');
```

## Complete Example

Here is a full initialization including TLS context, global validation, and proper error handling.

```typescript
import express from 'express';
import { createRouteTable, createTlsMiddleware, catchAllMiddleware, registerUrlParameter } from '@fishka/express';
import { assertString, assertTruthy } from '@fishka/assertions';

const app = express();

// 1. Basic express middleware
app.use(express.json());

// 2. Initialize TLS context (Request IDs, etc.)
app.use(createTlsMiddleware());

// 3. Register global URL parameters
registerUrlParameter('id', {
  validator: val => assertString(val),
});

// 4. Define routes
const routes = createRouteTable(app);
routes.get('health', async () => ({ status: 'UP' }));

// 5. Error handler - catches middleware/parsing errors
//    Can also be mounted per-path: app.use('/api', catchAllMiddleware)
app.use(catchAllMiddleware);

app.listen(3000);
```

## Process Handlers

Handle uncaught errors and graceful shutdown in one place:

```typescript
import { installProcessHandlers } from '@fishka/express';

installProcessHandlers({
  // Error handlers
  onUncaughtException: (err) => sendToMonitoring(err),
  onUnhandledRejection: (reason) => sendToMonitoring(reason),

  // Graceful shutdown
  onShutdown: async () => {
    await database.close();
    await server.close();
  },
  shutdownTimeout: 15000, // Force exit after 15s (default: 10s)
});
```

## License

MIT
