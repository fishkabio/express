/**
 * Common HTTP status codes as strings.
 * @Internal
 */
export const BAD_REQUEST = '400';

/**
 * Common HTTP status codes as strings.
 * @Internal
 */
export const UNAUTHORIZED = '401';

/**
 * Common HTTP status codes as strings.
 * @Internal
 */
export const FORBIDDEN = '403';

/**
 * Common HTTP status codes as strings.
 * @Internal
 */
export const NOT_FOUND = '404';

/**
 * Common HTTP status codes as strings.
 * @Internal
 */
export const INTERNAL_ERROR = '500';

/**
 * Common HTTP status codes as numbers.
 * @Internal
 */
export const INTERNAL_ERROR_STATUS = 500;

/**
 * Common HTTP status codes as numbers.
 * @Internal
 */
export const BAD_REQUEST_STATUS = 400;

/**
 * Parses HTTP status code from error message.
 * Expected format: "XXX Some error message"
 * Example: "400 Bad Request" -> 400
 * @Internal
 */
export function parseStatusCodeFromErrorMessageToken(errorMessage?: string): number {
  if (!errorMessage) return INTERNAL_ERROR_STATUS;

  const match = errorMessage.match(/^(\d{3})/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return INTERNAL_ERROR_STATUS;
}
