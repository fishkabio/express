# Express API

Type-safe Express.js routing with clean, minimal API.

## Installation

```bash
npm install @fishka/express
```

## Quick Start

```typescript
import express from 'express';
import { createRouteTable, registerUrlParameter } from '@fishka/express';

const app = express();
app.use(express.json());

// Register global URL parameters
registerUrlParameter('id', {});

const routes = createRouteTable(app);

// GET /users/:id - using function shorthand
routes.get<{ id: string; name: string }>('users/:id', async ctx => ({
  id: ctx.params.get('id'),
  name: 'John',
}));

// GET /users - using full endpoint object
routes.get<Array<{ id: string; name: string }>>('users', async () => ([
    { id: '1', name: 'John' },
    { id: '2', name: 'Jane' },
  ]),
);

// POST /users
routes.post<{ name: string }, { id: string }>('users', {
  $body: { name: v => assertString(v, '400: name required') },
  run: async ctx => ({ id: '1' }),
});

// DELETE /users/:id - using function shorthand
routes.delete('users/:id', async () => {
  // Delete user logic
});

app.listen(3000);
```

## URL Parameters

All URL parameters (e.g., `:id`, `:userId`) must be registered globally before use.

```typescript
import { registerUrlParameter } from '@fishka/express';

// Register parameters
registerUrlParameter('slug', {});
registerUrlParameter('organizationId', {});
registerUrlParameter('limit', {});
```

Using an unregistered parameter in a route path will throw an error.

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

## License

MIT
