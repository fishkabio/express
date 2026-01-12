import { Assertion, getMessageFromError, ObjectAssertion, validateObject } from '@fishka/assertions';
import * as url from 'url';
import { ApiResponse, assertHttp, HttpError, ParamValidator } from './api.types';
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
export interface RequestContext {
  /** Express Request object. */
  req: ExpressRequest;
  /** Express Response object. */
  res: ExpressResponse;

  /** Authenticated user (if any). Populated by auth middleware. */
  authUser?: AuthUser;

  /**
   * Get and validate a path parameter.
   * @param name - Name of the path parameter
   * @param validator - Optional validator. If not provided, returns the raw string value.
   * @returns Validated value of type T (or string if no validator)
   * @throws {HttpError} 400 Bad Request if validation fails
   */
  path<T = string>(name: string, validator?: ParamValidator<T>): T;

  /**
   * Get and validate a query parameter.
   * @param name - Name of the query parameter
   * @param validator - Optional validator. If not provided, returns the raw string value or undefined.
   * @returns Validated value of type T, or undefined if parameter is not present
   * @throws {HttpError} 400 Bad Request if validation fails
   */
  query<T = string>(name: string, validator?: ParamValidator<T>): T | undefined;

  /**
   * Get and validate the request body.
   * @param validator - Validator function or object assertion
   * @returns Validated body of type T
   * @throws {HttpError} 400 Bad Request if validation fails
   */
  body<T>(validator: Assertion<T>): T;

  /**
   * Generic state storage for middleware to attach data.
   * Allows middleware to pass information to handlers and other middleware.
   */
  state: Map<string, unknown>;
}

/** Base interface with common endpoint properties. */
export interface EndpointBase<Result = unknown> {
  /** Optional middleware to execute before the handler. */
  middlewares?: Array<EndpointMiddleware>;
  /** Handler function. Can be sync or async. */
  run: (ctx: RequestContext) => ResponseOrValue<Result> | Promise<ResponseOrValue<Result>>;
}

/** Descriptor for GET list routes. */
export type GetListEndpoint<ResultElementType> = EndpointBase<Array<ResultElementType>>;

/** Descriptor for GET routes. */
export type GetEndpoint<Result> = EndpointBase<Result>;

/** Descriptor for POST routes. */
export type PostEndpoint<Result = void> = EndpointBase<Result>;

/** Same as POST. Used for full object updates. */
export type PutEndpoint<Result = void> = EndpointBase<Result>;

/** Same as PUT. While PUT is used for the whole object update, PATCH is used for a partial update. */
export type PatchEndpoint<Result = void> = EndpointBase<Result>;

/** Descriptor for DELETE routes. */
export type DeleteEndpoint = EndpointBase<void>;

/** Union type for all route registration info objects. */
export type RouteRegistrationInfo = (
  | { method: 'get'; endpoint: GetEndpoint<unknown> | GetListEndpoint<unknown> }
  | { method: 'post'; endpoint: PostEndpoint<unknown> }
  | { method: 'patch'; endpoint: PatchEndpoint<unknown> }
  | { method: 'put'; endpoint: PutEndpoint<unknown> }
  | { method: 'delete'; endpoint: DeleteEndpoint }
) & { path: string };

/** Implementation of RequestContext with caching for validated parameters. */
class RequestContextImpl implements RequestContext {


  constructor(
    /** Express request object. */
    public readonly req: ExpressRequest,
    /** Express response object. */
    public readonly res: ExpressResponse,
    /** Authenticated user (if any). */
    public authUser?: AuthUser,
    /** Request-scoped state storage. */
    public readonly state: Map<string, unknown> = new Map(),
  ) {}

  /**
   * Validates a parameter with optional validator and caching.
   * @param name Parameter name.
   * @param rawValue Raw parameter value from request.
   * @param validator Optional validator function.
   * @param cache Cache map for this parameter type.
   * @param isRequired Whether parameter is required (path=true, query=false).
   * @returns Validated value or undefined for optional missing parameters.
   */
  private validateParam<T>(
    name: string,
    rawValue: unknown,
    validator: ParamValidator<T> | undefined,
    isRequired: boolean
  ): T | undefined {
    try {
      let result: unknown;
      if (validator) {
        // Pass value to validator even if it's undefined/null/empty
        result = validator(rawValue);
      } else {
        // Without validator
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          if (isRequired) {
            assertHttp(false, HTTP_BAD_REQUEST, `Missing required parameter: ${name}`);
          }
          return undefined;
        }
        result = rawValue;
      }

      return result as T;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(HTTP_BAD_REQUEST, getMessageFromError(error));
    }
  }

  path<T = string>(name: string, validator?: ParamValidator<T>): T {
    const rawValue = this.req.params[name] as string | undefined | null;
    const result = this.validateParam(name, rawValue, validator, true);
    assertHttp(result !== undefined, HTTP_BAD_REQUEST, `Missing required path parameter: ${name}`);
    return result;
  }

  query<T = string>(name: string, validator?: ParamValidator<T>): T | undefined {
    const parsedUrl = url.parse(this.req.url, true);
    const rawValue = parsedUrl.query[name];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    return this.validateParam(name, value, validator, false);
  }

  body<T>(validator: Assertion<T>): T {
    const apiRequest = this.req.body;

    try {
      // Handle validation based on whether the validator is an object or function
      if (typeof validator === 'function') {
        // It's a ValueAssertion (function) - call it directly
        (validator as (v: unknown) => void)(apiRequest);
      } else {
        // It's an ObjectAssertion - use validateObject
        const objectValidator = validator as ObjectAssertion<T>;
        const isEmptyValidator = Object.keys(objectValidator).length === 0;
        const errorMessage = validateObject(apiRequest, objectValidator, `${HTTP_BAD_REQUEST}: request body`, {
          failOnUnknownFields: !isEmptyValidator,
        });
        assertHttp(!errorMessage, HTTP_BAD_REQUEST, errorMessage || 'Request body validation failed');
      }

      return apiRequest as T;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(HTTP_BAD_REQUEST, getMessageFromError(error));
    }
  }
}

/** Registers a GET route. */
export const mountGet = (
  app: ExpressRouter,
  path: string,
  endpoint: GetEndpoint<unknown> | GetListEndpoint<unknown>,
): void => mount(app, { method: 'get', endpoint, path });

/** Registers a POST route. */
export const mountPost = <Result>(app: ExpressRouter, path: string, endpoint: PostEndpoint<Result>): void =>
  mount(app, { method: 'post', endpoint: endpoint as PostEndpoint<unknown>, path });

/** Registers a PATCH route. */
export const mountPatch = <Result>(app: ExpressRouter, path: string, endpoint: PatchEndpoint<Result>): void =>
  mount(app, { method: 'patch', endpoint: endpoint as PatchEndpoint<unknown>, path });

/** Registers a PUT route. */
export const mountPut = <Result>(app: ExpressRouter, path: string, endpoint: PutEndpoint<Result>): void =>
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
 * Runs GET handler with optional middleware.
 */
async function executeGetEndpoint<ResponseResultType>(
  route: GetEndpoint<ResponseResultType>,
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<ResponseOrValue<ResponseResultType>> {
  const requestContext = new RequestContextImpl(req, res);
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
  const requestContext = new RequestContextImpl(req, res);
  await executeWithMiddleware<RequestContext, void>(
    () => route.run(requestContext),
    route.middlewares || [],
    requestContext,
  );
  return undefined;
}

/**
 * @Internal
 * Runs POST/PUT/PATCH handler with optional middleware.
 */
async function executeBodyEndpoint<ResponseResultType>(
  route: PostEndpoint<ResponseResultType> | PutEndpoint<ResponseResultType> | PatchEndpoint<ResponseResultType>,
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<ResponseOrValue<ResponseResultType>> {
  const requestContext = new RequestContextImpl(req, res);
  return await executeWithMiddleware<RequestContext, ResponseResultType>(
    () => route.run(requestContext),
    route.middlewares || [],
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
