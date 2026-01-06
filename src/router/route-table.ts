import { ExpressApplication } from '../utils/express.utils';
import { DeleteEndpoint, GetEndpoint, PatchEndpoint, PostEndpoint, PutEndpoint } from './fishka-router';
import { mountDelete, mountGet, mountPatch, mountPost, mountPut } from './fishka-router.private';

/**
 * Helper utility for organizing and mounting routes.
 * Provides a fluent interface for registering multiple handlers.
 */
export class RouteTable {
  constructor(private readonly app: ExpressApplication) {}

  get<T>(route: GetEndpoint<T> | GetEndpoint<T[]>): this {
    const resultType = Array.isArray({}) ? 'array' : 'object';
    mountGet(this.app, route as GetEndpoint<T>, resultType === 'array' ? 'array' : 'object');
    return this;
  }

  post<Req, Res>(route: PostEndpoint<Req, Res>): this {
    mountPost(this.app, route);
    return this;
  }

  patch<Req, Res>(route: PatchEndpoint<Req, Res>): this {
    mountPatch(this.app, route);
    return this;
  }

  put<Req, Res>(route: PutEndpoint<Req, Res>): this {
    mountPut(this.app, route);
    return this;
  }

  delete(route: DeleteEndpoint): this {
    mountDelete(this.app, route);
    return this;
  }
}

/**
 * Factory function to create a new route table.
 * @param app Express application instance
 * @returns FishkaRouteTable instance with fluent API
 */
export function createRouteTable(app: ExpressApplication): RouteTable {
  return new RouteTable(app);
}
