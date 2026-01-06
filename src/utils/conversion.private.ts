import { ApiResponse } from '../protocol/fishka.types';

/**
 * Converts JS timestamp or date to ISO 8601 format (without milliseconds).
 * Example: "2012-07-20T01:19:13Z".
 */
export function toFishkaDateString(value: number | Date): string {
  const resultWithMillis = (typeof value === 'number' ? new Date(value) : value).toISOString();
  return `${resultWithMillis.substring(0, resultWithMillis.length - 5)}Z`;
}

/**
 * Wraps the response into the correct Fishka form.
 * Add necessary fields, like 'requestId'.
 * If the response is already in the correct form, returns it as-is.
 */
export function wrapAsFishkaResponse<T = unknown>(fishkaResponseOrResultValue: T | ApiResponse<T>): ApiResponse<T> {
  let fishkaResponse: ApiResponse<T> = fishkaResponseOrResultValue as ApiResponse<T>;
  fishkaResponse = fishkaResponse?.result
    ? fishkaResponse // The value is in the correct 'FishkaResponse' form: just return it.
    : <ApiResponse<T>>{ result: fishkaResponseOrResultValue }; // Wrap the raw value into the correct FishkaResponse form.
  return fishkaResponse;
}
