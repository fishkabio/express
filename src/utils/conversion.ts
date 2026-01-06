import { ApiResponse } from '../protocol/api.types';

/**
 * Converts JS timestamp or date to ISO 8601 format (without milliseconds).
 * Example: "2012-07-20T01:19:13Z".
 * @Internal
 */
export function toApiDateString(value: number | Date): string {
  const resultWithMillis = (typeof value === 'number' ? new Date(value) : value).toISOString();
  return `${resultWithMillis.substring(0, resultWithMillis.length - 5)}Z`;
}

/**
 * Wraps the response into the correct API form.
 * Add necessary fields, like 'requestId'.
 * If the response is already in the correct form, returns it as-is.
 * @Internal
 */
export function wrapAsApiResponse<T = unknown>(apiResponseOrResultValue: T | ApiResponse<T>): ApiResponse<T> {
  let apiResponse: ApiResponse<T> = apiResponseOrResultValue as ApiResponse<T>;
  apiResponse = apiResponse?.result
    ? apiResponse // The value is in the correct 'ApiResponse' form: just return it.
    : <ApiResponse<T>>{ result: apiResponseOrResultValue }; // Wrap the raw value into the correct ApiResponse form.
  return apiResponse;
}
