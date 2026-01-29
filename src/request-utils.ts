import { Assertion, getMessageFromError, ObjectAssertion, truthy, validateObject } from '@fishka/assertions';
import * as url from 'url';
import { assertHttp, HttpError, ParamValidator } from './api.types';
import { HTTP_BAD_REQUEST } from './http-status-codes';
import { ExpressRequest } from './utils/express.utils';

/**
 * Validates a parameter with optional validator.
 */
function validateParam<T>(name: string, value: unknown, validator: ParamValidator<T> | undefined): T {
  try {
    const result = validator ? validator(value) : truthy(value, `Missing required parameter: ${name}`);
    return result as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(HTTP_BAD_REQUEST, `Parameter validation failed: ${name}. ${getMessageFromError(error)}`);
  }
}

/**
 * Get and validate a path parameter from Express request.
 * @param req - Express Request object
 * @param name - Name of the path parameter
 * @param validator - Optional validator. If not provided, returns the raw string value.
 * @returns Validated value of type T (or string if no validator)
 * @throws {HttpError} 400 Bad Request if validation fails
 */
export function pathParam<T = string>(req: ExpressRequest, name: string, validator?: ParamValidator<T>): T {
  const rawValue = req.params[name] as string | undefined | null;
  return validateParam(name, rawValue, validator);
}

/**
 * Get and validate a query parameter from Express request.
 * @param req - Express Request object
 * @param name - Name of the query parameter
 * @param validator - Optional validator. If not provided, returns the raw string value or undefined.
 * @returns Validated value of type T.
 * @throws {HttpError} 400 Bad Request if validation fails
 */
export function queryParam<T = string>(req: ExpressRequest, name: string, validator?: ParamValidator<T>): T {
  const parsedUrl = url.parse(req.originalUrl, true);
  const rawValue = parsedUrl.query[name];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return validateParam(name, value, validator);
}

/**
 * Get and validate the request body.
 * @param req - Express Request object
 * @param validator - Validator function or object assertion
 * @returns Validated body of type T
 * @throws {HttpError} 400 Bad Request if validation fails
 */
export function body<T>(req: ExpressRequest, validator: Assertion<T>): T {
  const apiRequest = req.body;

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
