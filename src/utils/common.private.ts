export const BAD_REQUEST = '400';
export const UNAUTHORIZED = '401';
export const FORBIDDEN = '403';
export const NOT_FOUND = '404';
export const INTERNAL_ERROR = '500';
export const INTERNAL_ERROR_STATUS = 500;
export const BAD_REQUEST_STATUS = 400;

/**
 * Parses HTTP status code from error message.
 * Expected format: "XXX Some error message"
 * Example: "400 Bad Request" -> 400
 */
export function parseStatusCodeFromErrorMessageToken(errorMessage?: string): number {
  if (!errorMessage) return INTERNAL_ERROR_STATUS;

  const match = errorMessage.match(/^(\d{3})/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return INTERNAL_ERROR_STATUS;
}
