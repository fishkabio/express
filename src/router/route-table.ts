import { ExpressApplication } from '../utils/express.utils';
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

/**
 * Helper utility for organizing and mounting routes.
 * Provides a fluent interface for registering multiple handlers.
 */
export class RouteTable {
  constructor(private readonly app: ExpressApplication) {}

  get<T>(path: string, endpoint: GetEndpoint<T> | GetEndpoint<T[]>): this;
  get<T>(path: string, run: (ctx: RequestContext) => Promise<ResponseOrValue<T>>): this;
  get<T>(
    path: string,
    endpointOrRun: GetEndpoint<T> | GetEndpoint<T[]> | ((ctx: RequestContext) => Promise<ResponseOrValue<T>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountGet(this.app, path, endpoint as GetEndpoint<T>);
    return this;
  }

  post<Req, Res>(path: string, endpoint: PostEndpoint<Req, Res>): this {
    mountPost(this.app, path, endpoint);
    return this;
  }

  patch<Req, Res>(path: string, endpoint: PatchEndpoint<Req, Res>): this {
    mountPatch(this.app, path, endpoint);
    return this;
  }

  put<Req, Res>(path: string, endpoint: PutEndpoint<Req, Res>): this {
    mountPut(this.app, path, endpoint);
    return this;
  }

  delete(path: string, endpoint: DeleteEndpoint): this;
  delete(path: string, run: (ctx: RequestContext) => Promise<void>): this;
  delete(path: string, endpointOrRun: DeleteEndpoint | ((ctx: RequestContext) => Promise<void>)): this {
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
export function createRouteTable(app: ExpressApplication): RouteTable {
  return new RouteTable(app);
}
