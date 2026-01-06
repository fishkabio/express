/**
 * Thread-local storage data for per-request context.
 * Stores information that should be available throughout the request lifecycle.
 */

export interface ThreadLocalData {
  /** Unique request identifier */
  requestId: string;

  /** Additional custom fields can be stored */
  [key: string]: unknown;
}
