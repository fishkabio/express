import { AsyncLocalStorage } from 'async_hooks';

/**
 * Thread-local data stored per request.
 * Can be extended with custom fields via the context key-value store.
 */
export interface ThreadLocalData {
  /** Unique request ID for tracing */
  requestId: string;

  /** Generic key-value storage for extensibility */
  [key: string]: unknown;
}

/**
 * AsyncLocalStorage instance for managing per-request context.
 * This ensures that each async operation associated with a request
 * can access the request-specific data even across async boundaries.
 */
const asyncLocalStorage = new AsyncLocalStorage<ThreadLocalData>();

/**
 * Gets all thread-local data for the current request context.
 * Returns undefined if called outside an async context managed by Fishka.
 */
export function getFishkaLocalStorage(): ThreadLocalData | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Executes a callback within a request context with the given thread-local data.
 * Used by middleware to set up the context for handlers.
 *
 * @param data - Thread-local data to establish
 * @param callback - Function to execute within the context
 * @returns Result of the callback
 */
export async function runWithFishkaTlsData<T>(data: ThreadLocalData, callback: () => Promise<T>): Promise<T> {
  return asyncLocalStorage.run(data, callback);
}
