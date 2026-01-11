# Express API

Type-safe Express.js routing with clean, minimal API.

## Installation

```bash
npm install @fishka/express
```

## Quick Start

```typescript
import express from 'express';
import { createRouteTable, param, toInt } from '@fishka/express';
import { assertString } from '@fishka/assertions';

const app = express();
app.use(express.json());

const routes = createRouteTable(app);

// GET /users/:id - with typed path params
routes.get('users/:id', {
  $path: { id: param(toInt()) },
  run: async ctx => ({
    id: ctx.path.id,  // number - typed from $path
    name: 'John',
  }),
});

// GET /users - list all users
routes.get('users', async () => [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
]);

// POST /users - with body validation
routes.post<{ name: string }, { id: number }>('users', {
  $body: { name: v => assertString(v, 'name required') },
  run: async ctx => ({ id: 1 }),
});

// DELETE /users/:id
routes.delete('users/:id', async () => {});

app.listen(3000);
```

## URL Parameter Validation

Use `param()` to validate and transform path/query parameters. All operators are composable:

```typescript
import { param, toInt, minLength, matches, min, range, oneOf } from '@fishka/express';

routes.get('users/:id', {
  $path: {
    id: param(toInt()),                      // string → number
  },
  $query: {
    page: param(toInt(), min(1)),            // number >= 1
    limit: param(toInt(), range(1, 100)),    // number 1-100
    sort: param(oneOf('asc', 'desc')),       // enum
    search: param(minLength(3)),             // string min 3 chars
  },
  run: async ctx => ({
    id: ctx.path.id,       // number
    page: ctx.query.page,  // number
    sort: ctx.query.sort,  // 'asc' | 'desc'
  }),
});
```

### Available Operators

**Transformations (string → T):**
- `toInt()` - parse to integer
- `toNumber()` - parse to number
- `toBool()` - parse 'true'/'false' to boolean
- `oneOf('a', 'b')` - enum values

**String validators:**
- `minLength(n)` - minimum length
- `maxLength(n)` - maximum length
- `matches(/regex/)` - regex match
- `trim` - trim whitespace
- `lowercase` / `uppercase` - case transform

**Number validators:**
- `min(n)` - minimum value
- `max(n)` - maximum value
- `range(min, max)` - value range

**Generic:**
- `check(fn, msg)` - custom validation
- `map(fn)` - transform value

### Optional Parameters

Use `optional()` to make parameters optional:

```typescript
import { optional, param, toInt } from '@fishka/express';

routes.get('users', {
  $query: {
    page: optional(param(toInt())),  // number | undefined
  },
  run: async ctx => {
    const page = ctx.query.page ?? 1;
  },
});
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

Full initialization with TLS context, validation, and error handling:

```typescript
import express from 'express';
import { createRouteTable, createTlsMiddleware, catchAllMiddleware, param, toInt } from '@fishka/express';

const app = express();

// 1. Basic express middleware
app.use(express.json());

// 2. Initialize TLS context (Request IDs, etc.)
app.use(createTlsMiddleware());

// 3. Define routes with typed parameters
const routes = createRouteTable(app);

routes.get('health', async () => ({ status: 'UP' }));

routes.get('users/:id', {
  $path: { id: param(toInt()) },
  run: async ctx => ({ id: ctx.path.id }),
});

// 4. Error handler - catches middleware/parsing errors
app.use(catchAllMiddleware);

app.listen(3000);
```

## Process Handlers

Handle uncaught errors and graceful shutdown in one place:

```typescript
import { installProcessHandlers } from '@fishka/express';

installProcessHandlers({
  // Error handlers
  onUncaughtException: err => sendToMonitoring(err),
  onUnhandledRejection: reason => sendToMonitoring(reason),

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
