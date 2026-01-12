import { assertTruthy } from '@fishka/assertions';

/** Validator function that validates and returns a typed value */
export type ParamValidator<T> = (value: unknown) => T;

/** Map of param name to type validator */
export type ParamValidatorMap = Record<string, ParamValidator<unknown>>;

/** Infer validated types from validator map */
export type ValidatedParams<T extends ParamValidatorMap | undefined> = T extends ParamValidatorMap
  ? { [K in keyof T]: ReturnType<T[K]> }
  : Record<string, never>;

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
 * Asserts that the value is truthy, throwing an HttpError with the specified status code if false.
 * This function is designed for HTTP-specific validation where you want to throw appropriate HTTP status codes.
 *
 * @param value - The condition to check. If falsy, an HttpError will be thrown.
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
 * assertHttp(user, HTTP_NOT_FOUND, 'User not found');
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
export function assertHttp(value: unknown, status: number, message: string): asserts value {
  assertTruthy(value, () => new HttpError(status, message));
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
