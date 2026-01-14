# Express API

Type-safe Express.js routing with clean, minimal API.

## Installation

```bash
npm install @fishka/express
```

## Quick Start

```typescript
import express from 'express';
import { RouteTable, transform, toInt } from '@fishka/express';
import { assertString } from '@fishka/assertions';

const app = express();
app.use(express.json());

const routes = new RouteTable(app);

// GET /users/:id - with typed path params
routes.get('users/:id', async ctx => ({
  id: ctx.path('id', transform(toInt())), // number - validated inline
  name: 'John',
}));

// GET /users - list all users
routes.get('users', async () => [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
]);

// POST /users - with body validation
routes.post('users', async ctx => ({
  id: 1,
  name: ctx.body({ name: v => assertString(v, 'name required') }).name,
}));

// DELETE /users/:id
routes.delete('users/:id', async () => {});

app.listen(3000);
```

## URL Parameter Validation

Use `transform()` to validate and transform path/query parameters. All operators are composable:

```typescript
import { transform, toInt, minLength, matches, min, range, oneOf } from '@fishka/express';

routes.get('users/:id', async ctx => ({
  id: ctx.path('id', transform(toInt())), // string → number (required)
  page: ctx.query('page', transform(toInt(), min(1))), // number >= 1, required (throws 400 if missing)
  limit: ctx.query('limit', transform(toInt(), range(1, 100))), // number 1-100, required (throws 400 if missing)
  sort: ctx.query('sort', transform(oneOf('asc', 'desc'))), // enum, required (throws 400 if missing)
  search: ctx.query('search', transform(minLength(3))), // string min 3 chars, required (throws 400 if missing)
}));
```

### Parameter Requirements

- `ctx.path('name')` - returns string (throws 400 if missing)
- `ctx.query('name')` - returns string (throws 400 if missing/empty)
- `ctx.query('name', validator)` - returns validated value (throws 400 if missing/empty/invalid)
- All parameters are required - missing or empty values throw BAD_REQUEST
- Validators receive raw values (including undefined/null/empty) and can enforce additional validation

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

- `transform(...ops)` - chain of validators/transformers
- `assert(predicate, msg)` - custom validation with predicate
- `validator(fn)` - custom validator returning string|undefined
- `map(fn)` - transform value

### All Parameters Are Required

- **Path parameters** are always required - `ctx.path()` throws 400 if missing
- **Query parameters** are always required - `ctx.query()` throws 400 if missing/empty
- **Validators** transform and validate parameter values

For parameters that should have default values when missing, handle them at the application level or use the `optional()` wrapper:

```typescript
import { transform, toInt, optional } from '@fishka/express';

routes.get('users', async ctx => {
  // Using optional() wrapper for parameters with default values
  const page = ctx.query('page', optional(transform(toInt()))) ?? 1;
  // All parameters are required by default
  const search = ctx.query('search');

  return { page: page ?? 1, search };
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
import { RouteTable, createTlsMiddleware, catchAllMiddleware, transform, toInt } from '@fishka/express';

const app = express();

// 1. Basic express middleware
app.use(express.json());

// 2. Initialize TLS context (Request IDs, etc.)
// Note: Request ID functionality is disabled by default.
// To enable it, call configureExpressApi({ requestIdHeader: 'x-request-id' }) first.
app.use(createTlsMiddleware());

// 3. Define routes with typed parameters
const routes = new RouteTable(app);

routes.get('health', async () => ({ status: 'UP' }));

routes.get('users/:id', async ctx => ({
  id: ctx.path('id', transform(toInt())),
}));

// 4. Error handler - catches middleware/parsing errors
app.use(catchAllMiddleware);

app.listen(3000);
```

## Configuration

You can configure global settings using `configureExpressApi`:

```typescript
import { configureExpressApi } from '@fishka/express';

// Request ID configuration (disabled by default)
configureExpressApi({
  // Enable request ID with custom header name
  requestIdHeader: 'x-request-id', // or 'x-correlation-id', 'trace-id', etc.

  // Whether to trust request ID from client headers
  trustRequestIdHeader: true, // default: true
});

// By default, request ID functionality is disabled.
// To enable it, you must set requestIdHeader.
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
