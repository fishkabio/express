import { Assertion, ObjectAssertion } from '@fishka/assertions';
import { ApiResponse, UrlTokensValidator } from '../protocol/api.types';
import { ExpressRequest, ExpressResponse } from '../utils/express.utils';

/** Express API allows handlers to return response in the raw form. */
export type ResponseOrValue<ResponseEntity> = ApiResponse<ResponseEntity> | ResponseEntity;

/**
 * Generic middleware hook for endpoint execution.
 * Allows custom logic like transaction management, authorization checks, etc.
 */
export type EndpointMiddleware<Context = RequestContext> = (
  run: () => Promise<unknown>,
  context: Context,
) => Promise<unknown>;

/** Generic request context passed to all handlers. Database-agnostic and extensible. */
export interface RequestContext<Body = void> {
  /** Parsed and validated request body (for POST/PATCH/PUT handlers). */
  body: Body;
  /** Express Request object. */
  req: ExpressRequest;
  /** Express Response object. */
  res: ExpressResponse;

  /**
   * Generic parameter access with lazy validation.
   * Provides type-safe access to URL path and query parameters.
   */
  params: {
    get(key: string): string;
    tryGet(key: string): string | undefined;
  };

  /**
   * Query parameter access.
   */
  query: {
    get(key: string): string | undefined;
  };

  /**
   * Generic context storage for middleware to attach data.
   * Allows middleware to pass information to handlers and other middleware.
   */
  context: Map<string, unknown>;
}

/** Base interface with common endpoint properties. */
export interface EndpointBase<Context = RequestContext, Result = unknown> {
  /** Path parameter validator. */
  $path?: UrlTokensValidator;
  /** Query parameter validator. */
  $query?: UrlTokensValidator;
  /** Optional middleware to execute before the handler. */
  middlewares?: Array<EndpointMiddleware>;
  /** Handler function. */
  run: (ctx: Context) => Promise<ResponseOrValue<Result>>;
}

/** Descriptor for GET list routes. */
export type GetListEndpoint<ResultElementType = unknown> = EndpointBase<RequestContext, Array<ResultElementType>>;

/** Descriptor for GET routes. */
export type GetEndpoint<Result = unknown> = EndpointBase<RequestContext, Result>;

/** Descriptor for POST routes. */
export interface PostEndpoint<Body = unknown, Result = unknown> extends EndpointBase<RequestContext<Body>, Result> {
  /** Request body validator. */
  $body: Body extends object ? ObjectAssertion<Body> : Assertion<Body>;
}

/** Same as POST. Used for full object updates. */
export type PutEndpoint<Body = unknown, Result = unknown> = PostEndpoint<Body, Result>;

/** Same as PUT. While PUT is used for the whole object update, PATCH is used for a partial update. */
export type PatchEndpoint<Body = unknown, Result = unknown> = PutEndpoint<Body, Result>;

/** Descriptor for DELETE routes. */
export type DeleteEndpoint = EndpointBase<RequestContext, void>;

/** Union type for all route registration info objects. */
export type RouteRegistrationInfo = (
  | { method: 'get'; route: GetEndpoint | GetListEndpoint }
  | { method: 'post'; route: PostEndpoint }
  | { method: 'patch'; route: PatchEndpoint }
  | { method: 'put'; route: PutEndpoint }
  | { method: 'delete'; route: DeleteEndpoint }
) & { path: string };
