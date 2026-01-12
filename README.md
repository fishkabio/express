# Express API

Type-safe Express.js routing with clean, minimal API.

## Installation

```bash
npm install @fishka/express
```

## Quick Start

```typescript
import express from 'express';
import { createRouteTable, check, toInt } from '@fishka/express';
import { assertString } from '@fishka/assertions';

const app = express();
app.use(express.json());

const routes = createRouteTable(app);

// GET /users/:id - with typed path params
routes.get('users/:id', async ctx => ({
  id: ctx.path('id', check(toInt())),  // number - validated inline
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
  name: ctx.body({ name: v => assertString(v, 'name required') }).name
}));

// DELETE /users/:id
routes.delete('users/:id', async () => {});

app.listen(3000);
```

## URL Parameter Validation

Use `check()` to validate and transform path/query parameters. All operators are composable:

```typescript
import { check, toInt, minLength, matches, min, range, oneOf } from '@fishka/express';

routes.get('users/:id', async ctx => ({
  id: ctx.path('id', check(toInt())),                      // string → number (required)
  page: ctx.query('page', check(toInt(), min(1))),         // number >= 1, optional
  limit: ctx.query('limit', check(toInt(), range(1, 100))), // number 1-100, optional
  sort: ctx.query('sort', check(oneOf('asc', 'desc'))),    // enum, optional
  search: ctx.query('search', check(minLength(3))),        // string min 3 chars, optional
}));
```

### Without Validators

- `ctx.path('name')` - returns string (throws 400 if missing)
- `ctx.query('name')` - returns string | undefined (returns undefined if missing/empty)
- Validators receive raw values (including undefined/null/empty) and can enforce requiredness

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

Query parameters are optional by default. Use `ctx.query()` without a validator to get optional string values:

```typescript
import { check, toInt } from '@fishka/express';

routes.get('users', async ctx => {
  const page = ctx.query('page', check(toInt())) ?? 1;  // number | undefined
  const search = ctx.query('search');  // string | undefined
  
  return { page, search };
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
import { createRouteTable, createTlsMiddleware, catchAllMiddleware, check, toInt } from '@fishka/express';

const app = express();

// 1. Basic express middleware
app.use(express.json());

// 2. Initialize TLS context (Request IDs, etc.)
app.use(createTlsMiddleware());

// 3. Define routes with typed parameters
const routes = createRouteTable(app);

routes.get('health', async () => ({ status: 'UP' }));

routes.get('users/:id', async ctx => ({ 
  id: ctx.path('id', check(toInt())) 
}));

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
