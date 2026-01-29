# Express API

Functional utilities for Express.js with type-safe validation and error handling.

## Installation

```bash
npm install @fishka/express
```

## Overview

This package provides standalone utility functions that work directly with Express. Each feature can be used independently - mix and match what you need.

## Quick Start

```typescript
import express from 'express';
import { addErrorHandling, body, patchExpressAsyncErrors, pathParam, queryParam } from '@fishka/express';
import { assertString } from '@fishka/assertions';

const app = express();
app.use(express.json());

// Enable automatic async error catching (call once at startup)
patchExpressAsyncErrors();

// GET /users/:id - with typed path params
app.get('/users/:id', async (req, res) => {
  const id = pathParam(req, 'id'); // string - validated inline
  res.json({ id, name: 'John' });
});

// GET /users - with query params
app.get('/users', async (req, res) => {
  const page = queryParam(req, 'page'); // string - throws 400 if missing
  res.json({ page, users: [] });
});

// POST /users - with body validation
app.post('/users', async (req, res) => {
  const data = body(req, { name: assertString });
  res.json({ id: 1, name: data.name }); // validators infer a type for the data!
});

// Add error handling middleware (must be last)
addErrorHandling(app);

app.listen(3000);
```

## Utilities

### `pathParam(req, name, validator?)`

Get and validate a path parameter from Express request.

```typescript
import { pathParam, transform, toInt, minLength } from '@fishka/express';

app.get('/users/:id', async (req, res) => {
  // Simple - returns string, throws 400 if missing
  const id1 = pathParam(req, 'id');

  // With validation - transform to number
  const id2 = pathParam(req, 'id', transform(toInt()));

  // Transform with validation - string min length
  const slug = pathParam(req, 'slug', transform(minLength(3)));

  res.json({ id: '...' });
});
```

### `queryParam(req, name, validator?)`

Get and validate a query parameter from Express request.

```typescript
import { queryParam, transform, toInt, min, range, oneOf } from '@fishka/express';

app.get('/users', async (req, res) => {
  // Simple - returns string, throws 400 if missing
  const search = queryParam(req, 'search');

  // With validation - transform to number with min value
  const page = queryParam(req, 'page', transform(toInt(), min(1)));

  // With validation - number range
  const limit = queryParam(req, 'limit', transform(toInt(), range(1, 100)));

  // With validation - enum
  const sort = queryParam(req, 'sort', transform(oneOf('asc', 'desc')));

  res.json({ page, limit, users: [] });
});
```

### `body(req, validator)`

Get and validate the request body.

```typescript
import { body } from '@fishka/express';
import { assertString, assertNumber } from '@fishka/assertions';

app.post('/users', async (req, res) => {
  // Object assertion - validates and infers a type.
  const data = body(req, {
    name: assertString,
    age: assertNumber,
  });

  res.json({ id: 1, name: data.name });
});
```

### `patchExpressAsyncErrors()`

Patches Express to automatically catch async errors. Call once at application startup.

```typescript
import { patchExpressAsyncErrors } from '@fishka/express';

// Call before defining routes
patchExpressAsyncErrors();

// Now async route handlers don't need try/catch
app.get('/users', async (req, res) => {
  const users = await db.users.findAll(); // Errors are caught automatically
  res.json(users);
});
```

### `addErrorHandling(app)`

Adds centralized error handling middleware. Must be called after all routes.

```typescript
import { addErrorHandling, HttpError } from '@fishka/express';

// Define routes...
app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  assertHttp(user, 404, 'User not found');
  res.json(user);
});

// Add error handling last
addErrorHandling(app);
```

## Parameter Validation

Use `transform()` to validate and transform parameters. All operators are composable:

```typescript
import { transform, toInt, minLength, matches, min, range, oneOf } from '@fishka/express';

app.get('/users/:id', async (req, res) => {
  const id = pathParam(req, 'id', transform(toInt())); // string → number
  const page = queryParam(req, 'page', transform(toInt(), min(1))); // number >= 1
  const limit = queryParam(req, 'limit', transform(toInt(), range(1, 100))); // number 1-100
  const sort = queryParam(req, 'sort', transform(oneOf('asc', 'desc'))); // enum
  const search = queryParam(req, 'search', transform(minLength(3))); // string min 3 chars

  res.json({ id, page, limit });
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

- `transform(...ops)` - chain of validators/transformers
- `check(predicate, msg)` - custom validation with predicate
- `validator(fn)` - custom validator returning string|undefined
- `map(fn)` - transform value

### Parameter Requirements

- `pathParam(req, 'name')` - returns string (throws 400 if missing)
- `queryParam(req, 'name')` - returns string (throws 400 if missing/empty)
- `queryParam(req, 'name', validator)` - returns validated value (throws 400 if missing/empty/invalid)
- All parameters are required - missing or empty values throw BAD_REQUEST

## Authentication

```typescript
import { createAuthMiddleware, BasicAuthStrategy, getAuthUser } from '@fishka/express';

const auth = new BasicAuthStrategy(async (user, pass) =>
  user === 'admin' && pass === 'secret' ? { id: '1', role: 'admin' } : null,
);

app.get('/profile', createAuthMiddleware(auth), async (req, res) => {
  const user = getAuthUser(req);
  res.json({ id: user.id });
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

## HTTP Errors

Use `HttpError` for specific status codes:

```typescript
import { HttpError, HTTP_UNAUTHORIZED, HTTP_NOT_FOUND } from '@fishka/express';

app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);

  if (!req.headers.authorization) {
    throw new HttpError(HTTP_UNAUTHORIZED, 'Authorization required');
  }

  if (!user) {
    throw new HttpError(HTTP_NOT_FOUND, 'User not found');
  }

  res.json(user);
});
```

Use `assertHttp` for inline assertions:

```typescript
import { assertHttp, HTTP_UNAUTHORIZED, HTTP_NOT_FOUND } from '@fishka/express';

app.get('/admin', async (req, res) => {
  assertHttp(req.headers.authorization, HTTP_UNAUTHORIZED, 'Authorization required');

  const user = await db.users.findById(req.params.id);
  assertHttp(user, HTTP_NOT_FOUND, 'User not found');
  assertHttp(user.isAdmin, HTTP_FORBIDDEN, 'Admin access required');

  res.json({ admin: true });
});
```

## Configuration

### Request ID

```typescript
import { configureExpressApi, createTlsMiddleware } from '@fishka/express';

// Enable request ID with custom header name
configureExpressApi({
  requestIdHeader: 'x-request-id', // or 'x-correlation-id', 'trace-id', etc.
  trustRequestIdHeader: true, // default: true, if we trust and propagate request ID passed by client.
});

// Add TLS middleware to track request context
app.use(createTlsMiddleware());
```

### Process Handlers

Handle uncaught errors and graceful shutdown:

```typescript
import { installProcessHandlers } from '@fishka/express';

installProcessHandlers({
  onUncaughtException: err => sendToMonitoring(err),
  onUnhandledRejection: reason => sendToMonitoring(reason),
  onShutdown: async () => {
    await database.close();
    await server.close();
  },
  shutdownTimeout: 15000,
});
```

## Complete Example

```typescript
import express from 'express';
import {
  addErrorHandling,
  body,
  min,
  patchExpressAsyncErrors,
  pathParam,
  queryParam,
  range,
  toInt,
  transform,
} from '@fishka/express';
import { assertString } from '@fishka/assertions';
import { assertHttp } from './api.types';

const app = express();
app.use(express.json());

// Enable automatic async error catching
patchExpressAsyncErrors();

// Routes
app.get('/users/:id', async (req, res) => {
  const id = pathParam(req, 'id', transform(toInt()));
  const user = await db.users.findById(id);
  assertHttp(user, 404, 'User not found');
  res.json(user);
});

app.get('/users', async (req, res) => {
  const page = queryParam(req, 'page', transform(toInt(), min(1)));
  const limit = queryParam(req, 'limit', transform(toInt(), range(1, 100)));

  const users = await db.users.findAll({ page, limit });
  res.json({ users, page, limit });
});

app.post('/users', async (req, res) => {
  const data = body(req, { name: assertString });
  const user = await db.users.create(data);
  res.status(201).json(user);
});

// Error handling (must be last)
addErrorHandling(app);

app.listen(3000);
```

## License

MIT
