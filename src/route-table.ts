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

  /** Register a GET endpoint. */
  get<Result>(path: string, endpoint: GetEndpoint<Result>): this;

  /** Register a GET endpoint with function shorthand. */
  get<Result>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  get<Result>(
    path: string,
    endpointOrRun: GetEndpoint<Result> | ((ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountGet(this.app, path, endpoint as GetEndpoint<unknown>);
    return this;
  }

  /** Register a POST endpoint. */
  post<Result = void>(path: string, endpoint: PostEndpoint<Result>): this;

  /** Register a POST endpoint with function shorthand. */
  post<Result = void>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  post<Result = void>(
    path: string,
    endpointOrRun: PostEndpoint<Result> | ((ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountPost(this.app, path, endpoint as PostEndpoint<unknown>);
    return this;
  }

  /** Register a PATCH endpoint. */
  patch<Result = void>(path: string, endpoint: PatchEndpoint<Result>): this;

  /** Register a PATCH endpoint with function shorthand. */
  patch<Result = void>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  patch<Result = void>(
    path: string,
    endpointOrRun: PatchEndpoint<Result> | ((ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountPatch(this.app, path, endpoint as PatchEndpoint<unknown>);
    return this;
  }

  /** Register a PUT endpoint. */
  put<Result = void>(path: string, endpoint: PutEndpoint<Result>): this;

  /** Register a PUT endpoint with function shorthand. */
  put<Result = void>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  put<Result = void>(
    path: string,
    endpointOrRun: PutEndpoint<Result> | ((ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountPut(this.app, path, endpoint as PutEndpoint<unknown>);
    return this;
  }

  /** Register a DELETE endpoint with a full endpoint object. */
  delete(path: string, endpoint: DeleteEndpoint): this;

  /** Register a DELETE endpoint with function shorthand. */
  delete(path: string, run: (ctx: RequestContext) => void | Promise<void>): this;

  delete(
    path: string,
    endpointOrRun: DeleteEndpoint | ((ctx: RequestContext) => void | Promise<void>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountDelete(this.app, path, endpoint as DeleteEndpoint);
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
