import {
  DeleteEndpoint,
  GetEndpoint,
  mountDelete,
  mountGet,
  mountPatch,
  mountPost,
  mountPut,
  PatchEndpoint,
  PostEndpoint,
  PutEndpoint,
  RequestContext,
  ResponseOrValue,
} from './router';
import { ExpressRouter } from './utils/express.utils';

/**
 * Helper utility for organizing and mounting routes.
 * Provides a fluent interface for registering multiple handlers.
 */
export class RouteTable {
  constructor(private readonly app: ExpressRouter) {}

  get<T>(path: string, endpoint: GetEndpoint<T> | GetEndpoint<T[]>): this;
  get<T>(path: string, run: (ctx: RequestContext) => ResponseOrValue<T> | Promise<ResponseOrValue<T>>): this;
  get<T>(
    path: string,
    endpointOrRun:
      | GetEndpoint<T>
      | GetEndpoint<T[]>
      | ((ctx: RequestContext) => ResponseOrValue<T> | Promise<ResponseOrValue<T>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountGet(this.app, path, endpoint as GetEndpoint<T>);
    return this;
  }

  post<Body, Result>(path: string, endpoint: PostEndpoint<Body, Result>): this {
    mountPost(this.app, path, endpoint);
    return this;
  }

  patch<Body, Result>(path: string, endpoint: PatchEndpoint<Body, Result>): this {
    mountPatch(this.app, path, endpoint);
    return this;
  }

  put<Body, Result>(path: string, endpoint: PutEndpoint<Body, Result>): this {
    mountPut(this.app, path, endpoint);
    return this;
  }

  delete(path: string, endpoint: DeleteEndpoint): this;
  delete(path: string, run: (ctx: RequestContext) => void | Promise<void>): this;
  delete(path: string, endpointOrRun: DeleteEndpoint | ((ctx: RequestContext) => void | Promise<void>)): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountDelete(this.app, path, endpoint);
    return this;
  }
}

/**
 * Factory function to create a new route table.
 * @param app Express application instance
 * @returns RouteTable instance with fluent API
 */
export function createRouteTable(app: ExpressRouter): RouteTable {
  return new RouteTable(app);
}
