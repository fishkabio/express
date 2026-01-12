import { Assertion, getMessageFromError, ObjectAssertion, validateObject } from '@fishka/assertions';
import * as url from 'url';
import { ApiResponse, assertHttp, HttpError, ValidatedParams, ParamValidatorMap, ParamValidator } from './api.types';
import { AuthUser } from './auth/auth.types';
import { catchRouteErrors } from './error-handling';
import { HTTP_BAD_REQUEST, HTTP_OK } from './http-status-codes';
import { getRequestLocalStorage } from './thread-local/thread-local-storage';
import { wrapAsApiResponse } from './utils/conversion.utils';
import { ExpressRequest, ExpressResponse, ExpressRouter } from './utils/express.utils';

/** Express API allows handlers to return a response in the raw form. */
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
export interface RequestContext<
  Body = void,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> {
  /** Parsed and validated request body (for POST/PATCH/PUT handlers). */
  body: Body;
  /** Express Request object. */
  req: ExpressRequest;
  /** Express Response object. */
  res: ExpressResponse;

  /** Authenticated user (if any). Populated by auth middleware. */
  authUser?: AuthUser;

  /** Validated path parameters (typed from $path validators). */
  path: ValidatedParams<PathParams>;

  /** Validated query parameters (typed from $query validators). */
  query: ValidatedParams<QueryParams>;

  /**
   * Generic state storage for middleware to attach data.
   * Allows middleware to pass information to handlers and other middleware.
   */
  state: Map<string, unknown>;
}

/** Base interface with common endpoint properties. */
export interface EndpointBase<
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
  Body = void,
  Result = unknown,
> {
  /** Path parameter validators (typed). */
  $path?: PathParams;
  /** Query parameter validators (typed). */
  $query?: QueryParams;
  /** Optional middleware to execute before the handler. */
  middlewares?: Array<EndpointMiddleware>;
  /** Handler function. Can be sync or async. */
  run: (
    ctx: RequestContext<Body, PathParams, QueryParams>,
  ) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>;
}

/** Descriptor for GET list routes. */
export type GetListEndpoint<
  ResultElementType,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> = EndpointBase<PathParams, QueryParams, void, Array<ResultElementType>>;

/** Descriptor for GET routes. */
export type GetEndpoint<
  Result,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> = EndpointBase<PathParams, QueryParams, void, Result>;

/** Descriptor for POST routes. */
export interface PostEndpoint<
  Body,
  Result = void,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> extends EndpointBase<PathParams, QueryParams, Body, Result> {
  /** Request body validator. */
  $body: Body extends object ? ObjectAssertion<Body> : Assertion<Body>;
}

/** Same as POST. Used for full object updates. */
export type PutEndpoint<
  Body,
  Result = void,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> = PostEndpoint<Body, Result, PathParams, QueryParams>;

/** Same as PUT. While PUT is used for the whole object update, PATCH is used for a partial update. */
export type PatchEndpoint<
  Body,
  Result = void,
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> = PutEndpoint<Body, Result, PathParams, QueryParams>;

/** Descriptor for DELETE routes. */
export type DeleteEndpoint<
  PathParams extends ParamValidatorMap = ParamValidatorMap,
  QueryParams extends ParamValidatorMap = ParamValidatorMap,
> = EndpointBase<PathParams, QueryParams, void, void>;

/** Union type for all route registration info objects. */
export type RouteRegistrationInfo = (
  | { method: 'get'; endpoint: GetEndpoint<unknown> | GetListEndpoint<unknown> }
  | { method: 'post'; endpoint: PostEndpoint<unknown> }
  | { method: 'patch'; endpoint: PatchEndpoint<unknown> }
  | { method: 'put'; endpoint: PutEndpoint<unknown> }
  | { method: 'delete'; endpoint: DeleteEndpoint }
) & { path: string };

// ============================================================================
// Internal implementation details
// ============================================================================

/** Registers a GET route. */
export const mountGet = (
  app: ExpressRouter,
  path: string,
  endpoint: GetEndpoint<unknown> | GetListEndpoint<unknown>,
): void => mount(app, { method: 'get', endpoint, path });

/** Registers a POST route. */
export const mountPost = <Body, Result>(app: ExpressRouter, path: string, endpoint: PostEndpoint<Body, Result>): void =>
  mount(app, { method: 'post', endpoint: endpoint as PostEndpoint<unknown>, path });

/** Registers a PATCH route. */
export const mountPatch = <Body, Result>(
  app: ExpressRouter,
  path: string,
  endpoint: PatchEndpoint<Body, Result>,
): void => mount(app, { method: 'patch', endpoint: endpoint as PatchEndpoint<unknown>, path });

/** Registers a PUT route. */
export const mountPut = <Body, Result>(app: ExpressRouter, path: string, endpoint: PutEndpoint<Body, Result>): void =>
  mount(app, { method: 'put', endpoint: endpoint as PutEndpoint<unknown>, path });

/** Registers a DELETE route. */
export const mountDelete = (app: ExpressRouter, path: string, endpoint: DeleteEndpoint): void =>
  mount(app, { method: 'delete', endpoint, path });

/** Mounts a route with the given method, endpoint, and path. */
export function mount(app: ExpressRouter, { method, endpoint, path }: RouteRegistrationInfo): void {
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const handler = createRouteHandler(method, endpoint);
  app[method](fullPath, catchRouteErrors(handler));
}

/**
 * @Internal
 * Creates a route handler from an endpoint definition.
 */
function createRouteHandler(
  method: RouteRegistrationInfo['method'],
  endpoint:
    | GetEndpoint<unknown>
    | GetListEndpoint<unknown>
    | PostEndpoint<unknown>
    | PutEndpoint<unknown>
    | PatchEndpoint<unknown>
    | DeleteEndpoint,
) {
  return async (req: ExpressRequest, res: ExpressResponse, _next: unknown): Promise<void> => {
    let result: ResponseOrValue<unknown>;

    switch (method) {
      case 'post':
      case 'put':
      case 'patch':
        result = await executeBodyEndpoint(endpoint as PostEndpoint<unknown>, req, res);
        break;
      case 'delete':
        result = await executeDeleteEndpoint(endpoint as DeleteEndpoint, req, res);
        break;
      case 'get':
        result = await executeGetEndpoint(endpoint as GetEndpoint<unknown>, req, res);
        break;
    }
    const response = wrapAsApiResponse(result);

    const tls = getRequestLocalStorage();
    if (tls?.requestId) {
      response.requestId = tls.requestId;
    }

    response.status = response.status || HTTP_OK;
    res.status(response.status);
    res.send(response);
  };
}

/**
 * @Internal
 * Validates and builds typed path/query parameters using $path and $query validators.
 */
function buildValidatedParams<
  PathParams extends ParamValidatorMap | undefined,
  QueryParams extends ParamValidatorMap | undefined,
>(
  req: ExpressRequest,
  $path: PathParams,
  $query: QueryParams,
): {
  path: PathParams extends ParamValidatorMap ? ValidatedParams<PathParams> : Record<string, never>;
  query: QueryParams extends ParamValidatorMap ? ValidatedParams<QueryParams> : Record<string, never>;
} {
  const pathResult: Record<string, unknown> = {};
  const queryResult: Record<string, unknown> = {};

  try {
    // Validate path params
    if ($path) {
      for (const [key, validator] of Object.entries($path)) {
        const value = req.params[key];
        pathResult[key] = (validator as ParamValidator<unknown>)(value);
      }
    }

    // Validate query params
    if ($query) {
      const parsedUrl = url.parse(req.url, true);
      for (const [key, validator] of Object.entries($query)) {
        const rawValue = parsedUrl.query[key];
        const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
        queryResult[key] = (validator as ParamValidator<unknown>)(value);
      }
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(HTTP_BAD_REQUEST, getMessageFromError(error));
  }

  return {
    path: pathResult as PathParams extends ParamValidatorMap ? ValidatedParams<PathParams> : Record<string, never>,
    query: queryResult as QueryParams extends ParamValidatorMap ? ValidatedParams<QueryParams> : Record<string, never>,
  };
}

/**
 * @Internal
 * Runs GET handler with optional middleware.
 */
async function executeGetEndpoint<ResponseResultType>(
  route: GetEndpoint<ResponseResultType>,
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<ResponseOrValue<ResponseResultType>> {
  const validated = buildValidatedParams(req, route.$path, route.$query);
  const requestContext = newRequestContext(undefined, req, res, validated.path, validated.query);
  return await executeWithMiddleware<RequestContext, ResponseResultType>(
    () => route.run(requestContext as RequestContext),
    route.middlewares || [],
    requestContext,
  );
}

/**
 * @Internal
 * Runs DELETE handler with optional middleware.
 */
async function executeDeleteEndpoint(
  route: DeleteEndpoint,
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<ResponseOrValue<void>> {
  const validated = buildValidatedParams(req, route.$path, route.$query);
  const requestContext = newRequestContext(undefined, req, res, validated.path, validated.query);
  await executeWithMiddleware<RequestContext, void>(
    () => route.run(requestContext as RequestContext),
    route.middlewares || [],
    requestContext,
  );
  return undefined;
}

type BodyHandler<Req, Res> = PostEndpoint<Req, Res> | PutEndpoint<Req, Res> | PatchEndpoint<Req, Res>;

/**
 * @Internal
 * Runs POST/PUT/PATCH handler with optional middleware.
 */
async function executeBodyEndpoint<RequestBodyType, ResponseResultType>(
  route: BodyHandler<RequestBodyType, ResponseResultType>,
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<ResponseOrValue<ResponseResultType>> {
  const validator = route.$body;
  const apiRequest = req.body;

  try {
    // Handle validation based on whether the validator is an object or function
    if (typeof validator === 'function') {
      // It's a ValueAssertion (function) - call it directly
      (validator as (v: unknown) => void)(apiRequest);
    } else {
      // It's an ObjectAssertion - use validateObject
      const objectValidator = validator as ObjectAssertion<RequestBodyType>;
      const isEmptyValidator = Object.keys(objectValidator).length === 0;
      const errorMessage = validateObject(apiRequest, objectValidator, `${HTTP_BAD_REQUEST}: request body`, {
        failOnUnknownFields: !isEmptyValidator,
      });
      assertHttp(!errorMessage, HTTP_BAD_REQUEST, errorMessage || 'Request body validation failed');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(HTTP_BAD_REQUEST, getMessageFromError(error));
  }

  const validated = buildValidatedParams(req, route.$path, route.$query);
  const requestContext = newRequestContext(apiRequest as RequestBodyType, req, res, validated.path, validated.query);

  return await executeWithMiddleware<RequestContext<RequestBodyType>, ResponseResultType>(
    () => route.run(requestContext as RequestContext<RequestBodyType>),
    (route.middlewares || []) as EndpointMiddleware<RequestContext<RequestBodyType>>[],
    requestContext,
  );
}

/**
 * @Internal
 * Executes handler with a middleware chain.
 */
async function executeWithMiddleware<Context, Result>(
  run: () => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>,
  middlewares: Array<EndpointMiddleware<Context>>,
  context: Context,
): Promise<ResponseOrValue<Result>> {
  const current = async (index: number): Promise<ResponseOrValue<Result>> => {
    if (index >= middlewares.length) {
      const result = await run();
      return wrapAsApiResponse(result);
    }
    const middleware = middlewares[index];
    return (await middleware(() => current(index + 1), context)) as ResponseOrValue<Result>;
  };
  return await current(0);
}

/**
 * @Internal
 * Creates a new RequestContext instance.
 */
function newRequestContext<Body, PathParams extends ParamValidatorMap, QueryParams extends ParamValidatorMap>(
  requestBody: Body,
  req: ExpressRequest,
  res: ExpressResponse,
  validatedPath: ValidatedParams<PathParams>,
  validatedQuery: ValidatedParams<QueryParams>,
): RequestContext<Body, PathParams, QueryParams> {
  return {
    body: requestBody,
    req,
    res,
    path: validatedPath,
    query: validatedQuery,
    state: new Map(),
  };
}
