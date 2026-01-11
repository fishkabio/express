import { TypedValidatorMap } from './api.types';
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

  /** Register GET endpoint with full type inference for path/query params. */
  get<
    Result,
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(path: string, endpoint: GetEndpoint<Result, PathParams, QueryParams>): this;

  /** Register GET endpoint with function shorthand. */
  get<Result>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  get<
    Result,
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(
    path: string,
    endpointOrRun:
      | GetEndpoint<Result, PathParams, QueryParams>
      | ((ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>),
  ): this {
    const endpoint = typeof endpointOrRun === 'function' ? { run: endpointOrRun } : endpointOrRun;
    mountGet(this.app, path, endpoint as GetEndpoint<unknown>);
    return this;
  }

  /** Register POST endpoint with full type inference for path/query params. */
  post<
    Body,
    Result = void,
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(path: string, endpoint: PostEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPost(this.app, path, endpoint as unknown as PostEndpoint<unknown>);
    return this;
  }

  /** Register PATCH endpoint with full type inference for path/query params. */
  patch<
    Body,
    Result = void,
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(path: string, endpoint: PatchEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPatch(this.app, path, endpoint as unknown as PatchEndpoint<unknown>);
    return this;
  }

  /** Register PUT endpoint with full type inference for path/query params. */
  put<
    Body,
    Result = void,
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(path: string, endpoint: PutEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPut(this.app, path, endpoint as unknown as PutEndpoint<unknown>);
    return this;
  }

  /** Register DELETE endpoint with full endpoint object. */
  delete<
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(path: string, endpoint: DeleteEndpoint<PathParams, QueryParams>): this;

  /** Register DELETE endpoint with function shorthand. */
  delete(path: string, run: (ctx: RequestContext) => void | Promise<void>): this;

  delete<
    PathParams extends TypedValidatorMap = TypedValidatorMap,
    QueryParams extends TypedValidatorMap = TypedValidatorMap,
  >(
    path: string,
    endpointOrRun: DeleteEndpoint<PathParams, QueryParams> | ((ctx: RequestContext) => void | Promise<void>),
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
