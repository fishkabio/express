import { DeleteEndpoint, GetEndpoint, mount, PatchEndpoint, PostEndpoint, PutEndpoint, RequestContext } from './router';
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
  get<Result>(path: string, run: (ctx: RequestContext) => Result | Promise<Result>): this;

  get<Result>(
    path: string,
    endpointOrRun: GetEndpoint<Result> | ((ctx: RequestContext) => Result | Promise<Result>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mount(this.app, { method: 'get', endpoint: endpoint as GetEndpoint<unknown>, path });
    return this;
  }

  /** Register a POST endpoint. */
  post<Result = void>(path: string, endpoint: PostEndpoint<Result>): this;

  /** Register a POST endpoint with function shorthand. */
  post<Result = void>(path: string, run: (ctx: RequestContext) => Result | Promise<Result>): this;

  post<Result = void>(
    path: string,
    endpointOrRun: PostEndpoint<Result> | ((ctx: RequestContext) => Result | Promise<Result>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mount(this.app, { method: 'post', endpoint: endpoint as PostEndpoint<unknown>, path });
    return this;
  }

  /** Register a PATCH endpoint. */
  patch<Result = void>(path: string, endpoint: PatchEndpoint<Result>): this;

  /** Register a PATCH endpoint with function shorthand. */
  patch<Result = void>(path: string, run: (ctx: RequestContext) => Result | Promise<Result>): this;

  patch<Result = void>(
    path: string,
    endpointOrRun: PatchEndpoint<Result> | ((ctx: RequestContext) => Result | Promise<Result>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mount(this.app, { method: 'patch', endpoint: endpoint as PatchEndpoint<unknown>, path });
    return this;
  }

  /** Register a PUT endpoint. */
  put<Result = void>(path: string, endpoint: PutEndpoint<Result>): this;

  /** Register a PUT endpoint with function shorthand. */
  put<Result = void>(path: string, run: (ctx: RequestContext) => Result | Promise<Result>): this;

  put<Result = void>(
    path: string,
    endpointOrRun: PutEndpoint<Result> | ((ctx: RequestContext) => Result | Promise<Result>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mount(this.app, { method: 'put', endpoint: endpoint as PutEndpoint<unknown>, path });
    return this;
  }

  /** Register a DELETE endpoint with a full endpoint object. */
  delete(path: string, endpoint: DeleteEndpoint): this;

  /** Register a DELETE endpoint with function shorthand. */
  delete(path: string, run: (ctx: RequestContext) => void | Promise<void>): this;

  delete(path: string, endpointOrRun: DeleteEndpoint | ((ctx: RequestContext) => void | Promise<void>)): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mount(this.app, { method: 'delete', endpoint: endpoint as DeleteEndpoint, path });
    return this;
  }
}
