import { getFishkaLocalStorage as getStore } from './thread-local-storage.private';
import { ThreadLocalData } from './thread-local-storage.types';

/**
 * Gets all thread-local data for the current request context.
 * Returns undefined if called outside an async context managed by Fishka.
 */
export function getFishkaLocalStorage(): ThreadLocalData | undefined {
  return getStore();
}
