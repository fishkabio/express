import {
  Assertion,
  assertTruthy,
  callValueAssertion,
  getMessageFromError,
  ObjectAssertion,
  validateObject,
  ValueAssertion,
} from '@fishka/assertions';
import * as url from 'url';
import { ApiResponse, HttpError, URL_PARAMETER_INFO, UrlTokensValidator, assertHttp } from './api.types';
import { HTTP_BAD_REQUEST, HTTP_OK } from './http-status-codes';
import { AuthUser } from './auth/auth.types';
import { catchRouteErrors } from './error-handling';
import { getRequestLocalStorage } from './thread-local/thread-local-storage';
import { wrapAsApiResponse } from './utils/conversion.utils';
import { ExpressApplication, ExpressRequest, ExpressResponse } from './utils/express.utils';

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

  /** Authenticated user (if any). Populated by auth middleware. */
  authUser?: AuthUser;

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
   * Generic state storage for middleware to attach data.
   * Allows middleware to pass information to handlers and other middleware.
   */
  state: Map<string, unknown>;
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

// ============================================================================
// Internal implementation details
// ============================================================================

/**
 * Registers a GET route.
 */
export const mountGet = (app: ExpressApplication, path: string, endpoint: GetEndpoint | GetListEndpoint): void =>
  mount(app, { method: 'get', route: endpoint, path });

/**
 * Registers a POST route.
 */
export const mountPost = <Body, Result>(
  app: ExpressApplication,
  path: string,
  endpoint: PostEndpoint<Body, Result>,
): void => mount(app, { method: 'post', route: endpoint as PostEndpoint, path });

/**
 * Registers a PATCH route.
 */
export const mountPatch = <Body, Result>(
  app: ExpressApplication,
  path: string,
  endpoint: PatchEndpoint<Body, Result>,
): void => mount(app, { method: 'patch', route: endpoint as PatchEndpoint, path });

/**
 * Registers a PUT route.
 */
export const mountPut = <Body, Result>(
  app: ExpressApplication,
  path: string,
  endpoint: PutEndpoint<Body, Result>,
): void => mount(app, { method: 'put', route: endpoint as PutEndpoint, path });

/**
 * Registers a DELETE route.
 */
export const mountDelete = (app: ExpressApplication, path: string, endpoint: DeleteEndpoint): void =>
  mount(app, { method: 'delete', route: endpoint, path });

/**
 * Mounts a route with the given method, endpoint, and path.
 */
export function mount(app: ExpressApplication, { method, route, path }: RouteRegistrationInfo): void {
  const fullPath = `/${path}`;
  const handler = createRouteHandler(method, route);
  app[method](fullPath, catchRouteErrors(handler));
}

/**
 * @Internal
 * Creates a route handler from an endpoint definition.
 */
function createRouteHandler(
  method: RouteRegistrationInfo['method'],
  endpoint: GetEndpoint | GetListEndpoint | PostEndpoint | PutEndpoint | PatchEndpoint | DeleteEndpoint,
) {
  return async (req: ExpressRequest, res: ExpressResponse, _next: unknown): Promise<void> => {
    let result: ResponseOrValue<unknown>;

    switch (method) {
      case 'post':
      case 'put':
      case 'patch':
        result = await executeBodyEndpoint(endpoint as PostEndpoint, req, res);
        break;
      case 'delete':
        result = await executeDeleteEndpoint(endpoint as DeleteEndpoint, req, res);
        break;
      case 'get':
        result = await executeGetEndpoint(endpoint as GetEndpoint, req, res);
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
      };}

/**
 * @Internal
 * Validates request parameters using custom validators.
 */
function validateUrlParameters(
  req: ExpressRequest,
  {
    $path,
    $query,
  }: {
    $path?: UrlTokensValidator;
    $query?: UrlTokensValidator;
  },
): void {
  try {
    for (const key in req.params) {
      const value = req.params[key];

      // Run Global Validation if registered.
      const globalValidator = URL_PARAMETER_INFO[key]?.validator;
      if (globalValidator) {
        callValueAssertion(value, globalValidator, `${HTTP_BAD_REQUEST}`);
      }

      // Run Local Validation.
      const validator = $path?.[key];
      if (validator) {
        callValueAssertion(value, validator, `${HTTP_BAD_REQUEST}`);
      }
    }

    const parsedUrl = url.parse(req.url, true);
    for (const key in parsedUrl.query) {
      const value = parsedUrl.query[key];

      //  Global Validation if registered (also applies to query params if names match).
      const globalValidator = URL_PARAMETER_INFO[key]?.validator;
      if (globalValidator) {
        // Query params can be string | string[] | undefined. Global validators usually expect string.
        // We only validate if it's a single value or handle array in validator.
        // For simplicity, we pass value as is (unknown) to assertion.
        callValueAssertion(value, globalValidator as ValueAssertion<unknown>, `${HTTP_BAD_REQUEST}`);
      }

      const validator = $query?.[key];
      if (validator) {
        callValueAssertion(value, validator, `${HTTP_BAD_REQUEST}`);
      }
    }
  } catch (error) {
    throw new HttpError(HTTP_BAD_REQUEST, getMessageFromError(error));
  }
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
  const requestContext = newRequestContext<void>(undefined, req, res);
  validateUrlParameters(req, { $path: route.$path, $query: route.$query });
  return await executeWithMiddleware<RequestContext, ResponseResultType>(
    () => route.run(requestContext),
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
  const requestContext = newRequestContext<void>(undefined, req, res);
  validateUrlParameters(req, { $path: route.$path, $query: route.$query });
  await executeWithMiddleware<RequestContext, void>(
    () => route.run(requestContext),
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
    // Handle validation based on whether validator is an object or function
    if (typeof validator === 'function') {
      // It's a ValueAssertion (function)
      callValueAssertion(apiRequest, validator as ValueAssertion<RequestBodyType>, `${HTTP_BAD_REQUEST}: request body`);
    } else {
      // It's an ObjectAssertion - use validateObject
      // We strictly assume it is an object because of the type definition (function | object)
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

  const requestContext = newRequestContext<RequestBodyType>(apiRequest as RequestBodyType, req, res);
  validateUrlParameters(req, { $path: route.$path, $query: route.$query });

  requestContext.body = req.body;

  return await executeWithMiddleware<RequestContext<RequestBodyType>, ResponseResultType>(
    () => route.run(requestContext),
    (route.middlewares || []) as EndpointMiddleware<RequestContext<RequestBodyType>>[],
    requestContext,
  );
}

/**
 * @Internal
 * Executes handler with middleware chain.
 */
async function executeWithMiddleware<Context, Result>(
  run: () => Promise<ResponseOrValue<Result>>,
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
function newRequestContext<RequestBodyType>(
  requestBody: RequestBodyType,
  req: ExpressRequest,
  res: ExpressResponse,
): RequestContext<RequestBodyType> {
  return {
    body: requestBody,
    req,
    res,
    params: {
      get: (key: string): string => {
        const value = req.params[key];
        assertTruthy(value, `Path parameter '${key}' not found`);
        return value;
      },
      tryGet: (key: string): string | undefined => req.params[key],
    },
    query: {
      get: (key: string): string | undefined => {
        const parsedUrl = url.parse(req.url, true);
        const value = parsedUrl.query[key];
        return Array.isArray(value) ? value[0] : value;
      },
    },
    state: new Map(),
  };
}
