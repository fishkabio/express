import { Assertion, ObjectAssertion, ValueAssertion } from '@fishka/assertions';
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
export interface RequestContext<RequestBodyType = void> {
  /** Parsed and validated request body (for POST/PATCH/PUT handlers) */
  request: RequestBodyType;
  /** Express Request object */
  req: ExpressRequest;
  /** Express Response object */
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
   * Generic context storage for middleware to attach data.
   * Allows middleware to pass information to handlers and other middleware.
   */
  context: Map<string, unknown>;
}

/** Descriptor for GET list routes. */
export interface GetListEndpoint<ResponseResultElementType = unknown> {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  run: (context: RequestContext) => Promise<ResponseOrValue<Array<ResponseResultElementType>>>;
  /** Optional middleware to execute before the handler */
  middlewares?: Array<EndpointMiddleware>;
}

/** Descriptor for GET routes. */
export interface GetEndpoint<ResponseResultType = unknown> {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  run: (context: RequestContext) => Promise<ResponseOrValue<ResponseResultType>>;
  /** Optional middleware to execute before the handler */
  middlewares?: Array<EndpointMiddleware>;
}

/** Descriptor for POST routes. */
export interface PostEndpoint<RequestBodyType = unknown, ResponseResultType = unknown> {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  /** Request body validator. */
  validator: RequestBodyType extends object ? ObjectAssertion<RequestBodyType> : Assertion<RequestBodyType>;
  run: (context: RequestContext<RequestBodyType>) => Promise<ResponseOrValue<ResponseResultType>>;
  /** Optional middleware to execute before the handler */
  middlewares?: Array<EndpointMiddleware>;
}

/** Same as POST. Used for full object updates. */
export type PutEndpoint<RequestBodyType = unknown, ResponseResultType = unknown> = PostEndpoint<
  RequestBodyType,
  ResponseResultType
>;

/** Same as PUT. While PUT is used for the whole object update, PATCH is used for a partial update. */
export type PatchEndpoint<RequestBodyType = unknown, ResponseResultType = unknown> = PutEndpoint<
  RequestBodyType,
  ResponseResultType
>;

/** Descriptor for DELETE routes. */
export interface DeleteEndpoint {
  pathValidator?: Record<string, ValueAssertion<string>>;
  queryValidator?: Record<string, ValueAssertion<string>>;
  run: (context: RequestContext) => Promise<void>;
  /** Optional middleware to execute before the handler */
  middlewares?: Array<EndpointMiddleware>;
}

/** Union type for all route registration info objects. */
export type RouteRegistrationInfo = (
  | { method: 'get'; route: GetEndpoint | GetListEndpoint }
  | { method: 'post'; route: PostEndpoint }
  | { method: 'patch'; route: PatchEndpoint }
  | { method: 'put'; route: PutEndpoint }
  | { method: 'delete'; route: DeleteEndpoint }
) & { path: string };
