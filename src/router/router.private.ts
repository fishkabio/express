import { Assertion, assertTruthy, callValueAssertion, validateObject } from '@fishka/assertions';
import * as url from 'url';
import { catchRouteErrors } from '../middleware/catch-all.middleware';
import { UrlTokensValidator } from '../protocol/api.types';
import { BAD_REQUEST } from '../utils/common.private';
import { wrapAsApiResponse } from '../utils/conversion.private';
import { ExpressApplication, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import {
  DeleteEndpoint,
  EndpointMiddleware,
  GetEndpoint,
  GetListEndpoint,
  PatchEndpoint,
  PostEndpoint,
  PutEndpoint,
  RequestContext,
  ResponseOrValue,
  RouteRegistrationInfo,
} from './router';

/** Registers a GET route. */
export const mountGet = (app: ExpressApplication, path: string, endpoint: GetEndpoint | GetListEndpoint): void =>
  mount(app, { method: 'get', route: endpoint, path });

/** Registers a POST route. */
export const mountPost = <Req, Res>(app: ExpressApplication, path: string, endpoint: PostEndpoint<Req, Res>): void =>
  mount(app, { method: 'post', route: endpoint as PostEndpoint<unknown, unknown>, path });

/** Registers a PATCH route. */
export const mountPatch = <Req, Res>(app: ExpressApplication, path: string, endpoint: PatchEndpoint<Req, Res>): void =>
  mount(app, { method: 'patch', route: endpoint as PatchEndpoint<unknown, unknown>, path });

/** Registers a PUT route. */
export const mountPut = <Req, Res>(app: ExpressApplication, path: string, endpoint: PutEndpoint<Req, Res>): void =>
  mount(app, { method: 'put', route: endpoint as PutEndpoint<unknown, unknown>, path });

/** Registers a DELETE route. */
export const mountDelete = (app: ExpressApplication, path: string, endpoint: DeleteEndpoint): void =>
  mount(app, { method: 'delete', route: endpoint, path });

/** Mounts a route to the Express application. */
export function mount(app: ExpressApplication, { method, route, path }: RouteRegistrationInfo): void {
  const fullPath = `/${path}`;
  console.log(`${`${method.toUpperCase()}     `.substring(0, 8)} ${fullPath}`);
  app[method](
    fullPath,
    catchRouteErrors(async (req, res) => {
      let result: ResponseOrValue<unknown>;
      validateUrlParameters(req, route);
      const requestContext = newRequestContext(undefined, req, res);

      if (method === 'get') {
        result = await runGetHandler(route as GetEndpoint, requestContext, route.middlewares);
      } else if (method === 'delete') {
        result = await runDeleteHandler(route as DeleteEndpoint, requestContext, route.middlewares);
      } else {
        result = await runPppHandler(
          route as PppHandler<unknown, unknown>,
          requestContext as RequestContextImpl<unknown>,
          route.middlewares,
        );
      }

      const response = wrapAsApiResponse(result);
      response.status = response.status || 200;
      res.status(response.status);
      res.send(response);
    }),
  );
}

/** Validates request parameters using custom validators. */
function validateUrlParameters(
  req: ExpressRequest,
  {
    pathValidator,
    queryValidator,
  }: {
    pathValidator?: UrlTokensValidator;
    queryValidator?: UrlTokensValidator;
  },
): void {
  for (const key in req.params) {
    const value = req.params[key];
    const validator = pathValidator?.[key];
    if (validator) {
      callValueAssertion(value, validator, BAD_REQUEST);
    }
  }

  const parsedUrl = url.parse(req.url, true);
  for (const key in parsedUrl.query) {
    const value = parsedUrl.query[key];
    const validator = queryValidator?.[key];
    if (validator) {
      callValueAssertion(value, validator, BAD_REQUEST);
    }
  }
}

/** Runs GET handler with optional middleware. */
async function runGetHandler<ResponseResultType>(
  route: GetEndpoint<ResponseResultType>,
  requestContext: RequestContextImpl<void>,
  middlewares?: Array<EndpointMiddleware>,
): Promise<ResponseOrValue<ResponseResultType>> {
  return await executeWithMiddleware(() => route.run(requestContext), middlewares || [], requestContext);
}

/** Runs DELETE handler with optional middleware. */
async function runDeleteHandler(
  route: DeleteEndpoint,
  requestContext: RequestContextImpl<void>,
  middlewares?: Array<EndpointMiddleware>,
): Promise<ResponseOrValue<void>> {
  await executeWithMiddleware(() => route.run(requestContext), middlewares || [], requestContext);
  return undefined;
}

/** POST/PUT/PATCH handler. */
type PppHandler<Req, Res> = PostEndpoint<Req, Res> | PutEndpoint<Req, Res> | PatchEndpoint<Req, Res>;

/** Runs POST/PUT/PATCH handler with optional middleware. */
async function runPppHandler<RequestBodyType, ResponseResultType>(
  route: PppHandler<RequestBodyType, ResponseResultType>,
  requestContext: RequestContextImpl<RequestBodyType>,
  middlewares?: Array<EndpointMiddleware>,
): Promise<ResponseOrValue<ResponseResultType>> {
  const apiRequest = requestContext.req.body as unknown;

  // Handle validation based on whether validator is an object or function
  const validator = route.validator as Assertion<RequestBodyType>;
  let error: string | undefined;

  // Check if validator is an object (ObjectAssertion) vs function (ValueAssertion)
  if (typeof validator === 'object' && validator !== null) {
    // It's an ObjectAssertion - use validateObject
    const isEmptyValidator = Object.keys(validator).length === 0;
    error = validateObject(apiRequest, validator, `${BAD_REQUEST}: request body`, {
      failOnUnknownFields: !isEmptyValidator,
    });
  } else {
    // It's a ValueAssertion (function) - use callValueAssertion
    try {
      callValueAssertion(apiRequest, validator, `${BAD_REQUEST}: request body`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  assertTruthy(!error, error);
  requestContext.data.request = requestContext.req.body;

  return await executeWithMiddleware(
    () => route.run(requestContext),
    middlewares || [],
    requestContext as RequestContext<RequestBodyType>,
  );
}

/**
 * Executes handler with middleware chain.
 * Middleware are applied in order, with the handler at the end.
 */
async function executeWithMiddleware<T>(
  run: () => Promise<T>,
  middlewares: Array<EndpointMiddleware>,
  context: RequestContext<unknown>,
): Promise<T> {
  // Build the middleware chain
  let current: () => Promise<T> = run;

  // Apply middleware in reverse order so they wrap each other
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i];
    const next = current;
    current = (): Promise<T> => middleware(next, context as RequestContext) as Promise<T>;
  }

  return current();
}

/** Proxies & adds extra safety checks on access to RequestContext. */
class RequestContextImpl<RequestBodyType> implements RequestContext<RequestBodyType> {
  constructor(readonly data: RequestContext<RequestBodyType>) {}

  get request(): RequestBodyType {
    return this.data.request;
  }

  get req(): ExpressRequest {
    return this.data.req;
  }

  get res(): ExpressResponse {
    return this.data.res;
  }

  get params(): { get(key: string): string; tryGet(key: string): string | undefined } {
    return {
      get: (key: string): string => {
        const value = this.data.req.params[key];
        assertTruthy(value, `Path parameter '${key}' not found in context`);
        return value;
      },
      tryGet: (key: string): string | undefined => this.data.req.params[key],
    };
  }

  get context(): Map<string, unknown> {
    return this.data.context;
  }
}

function newRequestContext<RequestBodyType>(
  openapiRequest: RequestBodyType,
  req: ExpressRequest,
  res: ExpressResponse,
): RequestContextImpl<RequestBodyType> {
  return new RequestContextImpl<RequestBodyType>({
    request: openapiRequest,
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
    context: new Map(),
  });
}
