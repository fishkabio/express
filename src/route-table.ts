import { ParamValidatorMap } from './api.types';
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

  /** Register a GET endpoint with full type inference for path/query params. */
  get<
    Result,
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
  >(path: string, endpoint: GetEndpoint<Result, PathParams, QueryParams>): this;

  /** Register a GET endpoint with function shorthand. */
  get<Result>(path: string, run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>): this;

  get<
    Result,
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
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

  /** Register a POST endpoint with full type inference for path/query params. */
  post<
    Body,
    Result = void,
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
  >(path: string, endpoint: PostEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPost(this.app, path, endpoint as unknown as PostEndpoint<unknown>);
    return this;
  }

  /** Register a PATCH endpoint with full type inference for path/query params. */
  patch<
    Body,
    Result = void,
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
  >(path: string, endpoint: PatchEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPatch(this.app, path, endpoint as unknown as PatchEndpoint<unknown>);
    return this;
  }

  /** Register a PUT endpoint with full type inference for path/query params. */
  put<
    Body,
    Result = void,
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
  >(path: string, endpoint: PutEndpoint<Body, Result, PathParams, QueryParams>): this {
    mountPut(this.app, path, endpoint as unknown as PutEndpoint<unknown>);
    return this;
  }

  /** Register a DELETE endpoint with a full endpoint object. */
  delete<
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
  >(path: string, endpoint: DeleteEndpoint<PathParams, QueryParams>): this;

  /** Register a DELETE endpoint with function shorthand. */
  delete(path: string, run: (ctx: RequestContext) => void | Promise<void>): this;

  delete<
    PathParams extends ParamValidatorMap = ParamValidatorMap,
    QueryParams extends ParamValidatorMap = ParamValidatorMap,
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
