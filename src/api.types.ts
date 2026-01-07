import { assertString, assertTruthy, ValueAssertion } from '@fishka/assertions';

export type UrlTokensValidator = Record<string, ValueAssertion<string>>;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, HttpError.prototype);
  }
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
  assertTruthy(
    URL_PARAMETER_INFO[name],
    `Invalid URL parameter: '${name}'. Please register it using 'registerUrlParameter('${name}', ...)'`,
  );
}
