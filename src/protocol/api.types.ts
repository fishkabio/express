import { ValueAssertion } from '@fishka/assertions';

export type UrlTokensValidator = Record<string, ValueAssertion<string>>;

export interface ApiResponse<ResponseEntity = unknown> {
  /** Result of the call. A single entity for non-paginated ${by-id} requests or an array for list queries. */
  result: ResponseEntity;
  /** Unique ID of the request. Assigned to every API response. */
  requestId?: string;
  /**
   * Response status code. Same as HTTP response status.
   * Default: 200 for successful responses or 500 for internal server errors.
   */
  status?: number;
  /** Optional error message. */
  error?: string;
  /** Offset in the result set. Save as 'offset' query parameter. */
  offset?: number;
  /** Number of results requested. Same as 'limit' query parameter. */
  limit?: number;
}

/** Converts an API response value into a standardized ApiResponse structure. */
export function response<T = unknown>(result: T): ApiResponse<T> {
  return { result };
}
