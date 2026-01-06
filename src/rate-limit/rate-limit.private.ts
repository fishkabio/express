import { ExpressResponse } from '../utils/express.utils';
import { RateLimitResult } from './rate-limit.types';

const MILLIS_PER_SECOND = 1000;

/**
 * Adds rate limit state headers to the response.
 * See https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 *
 * Headers added:
 * - X-RateLimit-Limit: Server's quota for requests in the time window
 * - X-RateLimit-Remaining: Remaining quota in the current window
 * - X-RateLimit-Reset: Time remaining in the current window (in seconds)
 * - X-RateLimit-Policy: Quota policies associated with the client
 */
export function addRateLimitHeaders(
  res: ExpressResponse,
  result: RateLimitResult,
  limitPoints: number,
  duration: number,
): ExpressResponse {
  return (
    res
      // The server's quota for requests by the client in the time window.
      .header('X-RateLimit-Limit', `${limitPoints}`)
      // The remaining quota in the current window.
      .header('X-RateLimit-Remaining', `${result.remainingPoints}`)
      // The time remaining in the current window specified in seconds.
      .header('X-RateLimit-Reset', `${Math.ceil(result.msBeforeNext / MILLIS_PER_SECOND)}`)
      // Indicates the quota policies currently associated with the client.
      .header('X-RateLimit-Policy', `${limitPoints};w=${duration};comment="fixed window"`)
  );
}

/**
 * Converts milliseconds to seconds, rounding up.
 */
export function msToSeconds(ms: number): number {
  return Math.ceil(ms / MILLIS_PER_SECOND);
}
