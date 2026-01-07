import { assertString, assertTruthy, ValueAssertion } from '@fishka/assertions';
import { HTTP_BAD_REQUEST } from './http-status-codes';

export type UrlTokensValidator = Record<string, ValueAssertion<string>>;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    // Restore the prototype chain for instanceof checks.
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/**
 * Asserts that a condition is true, throwing an HttpError with the specified status code if false.
 * This function is designed for HTTP-specific validation where you want to throw appropriate HTTP status codes.
 *
 * @param condition - The condition to check. If false, an HttpError will be thrown.
 * @param status - The HTTP status code to use in the HttpError (e.g., 400 for Bad Request, 404 for Not Found).
 * @param message - The error message to include in the HttpError.
 *
 * @throws {HttpError} If the condition is false, throws an HttpError with the specified status and message.
 *
 * @example
 * ```typescript
 * // Validate required parameter
 * assertHttp(typeof userId === 'string', HTTP_BAD_REQUEST, 'User ID must be a string');
 *
 * // Validate resource existence
 * assertHttp(user !== null, HTTP_NOT_FOUND, 'User not found');
 *
 * // Validate authorization
 * assertHttp(user.isAdmin, HTTP_FORBIDDEN, 'Admin access required');
 *
 * // Validate authentication
 * assertHttp(req.headers.authorization, HTTP_UNAUTHORIZED, 'Authorization header required');
 * ```
 *
 * @see {@link HttpError}
 * @see {@link HTTP_BAD_REQUEST}
 * @see {@link HTTP_NOT_FOUND}
 * @see {@link HTTP_FORBIDDEN}
 * @see {@link HTTP_UNAUTHORIZED}
 */
export function assertHttp(condition: boolean, status: number, message: string): void {
  assertTruthy(condition, () => new HttpError(status, message));
}

export interface ApiResponse<ResponseEntity = unknown> {
  /** Result of the call. A single entity for non-paginated ${by-id} requests or an array for list queries. */
  result: ResponseEntity;
  /**
   * Unique ID of the request.
   * Automatically added to every API response.
   * May be passed via 'x-request-id' header from client.
   */
  requestId?: string;
  /**
   * Response status code. Same as HTTP response status.
   * Default: 200 for successful responses or 500 for internal server errors.
   */
  status?: number;
  /** Optional error message. */
  error?: string;
  /** Optional structured error details. */
  details?: Record<string, unknown>;
  /** Offset in the result set. Save as 'offset' query parameter. */
  offset?: number;
  /** Number of results requested. Same as 'limit' query parameter. */
  limit?: number;
}

/** Converts an API response value into a standardized ApiResponse structure. */
export function response<T = unknown>(result: T): ApiResponse<T> {
  return { result };
}

/** Globally identified URL (path or query) parameter info. */
export interface UrlParameterInfo {
  /** Optional global validator for this parameter. */
  validator?: ValueAssertion<string>;
  /** Description for documentation. */
  description?: string;
}

/**
 * Default documentation and validation for URL parameters.
 * @Internal
 */
export const URL_PARAMETER_INFO: Record<string, UrlParameterInfo> = {};

/** Registers a new URL parameter. */
export function registerUrlParameter(name: string, info: UrlParameterInfo): void {
  URL_PARAMETER_INFO[name] = info;
}

/**
 * Asserts that the value is a registered URL parameter name.
 * @Internal
 */
export function assertUrlParameter(name: unknown): asserts name is string {
  assertString(name, 'Url parameter name must be a string');
  assertHttp(
    URL_PARAMETER_INFO[name] !== undefined,
    HTTP_BAD_REQUEST,
    `Invalid URL parameter: '${name}'. Please register it using 'registerUrlParameter('${name}', ...)'`,
  );
}
