import { ExpressFunction, ExpressNextFunction, ExpressRequest, ExpressResponse } from '../utils/express.utils';
import { addRateLimitHeaders, msToSeconds } from './rate-limit';
import { RateLimitConfig, RateLimitResult } from './rate-limit.types';

const MILLIS_PER_SECOND = 1000;

/**
 * In-memory rate limiter using sliding window counter.
 * Tracks request counts per key with time-based window expiration.
 */
class InMemoryRateLimiter {
  private readonly limits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly points: number;
  private readonly durationMs: number;

  constructor(points: number, durationSeconds: number) {
    this.points = points;
    this.durationMs = durationSeconds * MILLIS_PER_SECOND;
  }

  /**
   * Try to consume points from the rate limit.
   * Returns result if successful, throws if limit exceeded.
   *
   * @param key - Unique identifier for the client (e.g., IP address)
   * @returns Rate limit result with remaining points and ms until reset
   * @throws RateLimitResult if limit exceeded
   */
  consume(key: string): RateLimitResult {
    const now = Date.now();
    const existing = this.limits.get(key);

    // Reset expired entry
    if (existing && now >= existing.resetTime) {
      this.limits.delete(key);
    }

    const current = this.limits.get(key) || { count: 0, resetTime: now + this.durationMs };

    if (current.count >= this.points) {
      const msBeforeNext = Math.max(0, current.resetTime - now);
      throw {
        remainingPoints: 0,
        msBeforeNext,
      };
    }

    current.count++;
    this.limits.set(key, current);

    const msBeforeNext = Math.max(0, current.resetTime - now);
    return {
      remainingPoints: this.points - current.count,
      msBeforeNext,
    };
  }
}

/**
 * Creates a rate limiter middleware using in-memory implementation.
 *
 * Separate limiters are used for read (GET) and write (POST/PATCH/PUT/DELETE) requests.
 *
 * @param config - Rate limit configuration
 * @returns Express middleware function
 */
export async function createRateLimiterMiddleware(config: RateLimitConfig): Promise<ExpressFunction> {
  const readLimiter = new InMemoryRateLimiter(config.points.read, config.duration);
  const writeLimiter = new InMemoryRateLimiter(config.points.write, config.duration);
  const whitelist = config.rateLimitWhitelist || ['/v1', '/health'];

  /**
   * The actual middleware function.
   */
  return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): Promise<void> => {
    // Check if the path is whitelisted
    if (whitelist.some(path => req.path.includes(path))) {
      next();
      return;
    }

    const isReadRequest = req.method === 'GET';
    const limiter = isReadRequest ? readLimiter : writeLimiter;
    const limitPoints = isReadRequest ? config.points.read : config.points.write;
    const clientKey = req.ip || 'unknown';

    try {
      const result = limiter.consume(clientKey);
      addRateLimitHeaders(res, result, limitPoints, config.duration);
      next();
    } catch (error: unknown) {
      const result = error as RateLimitResult;
      addRateLimitHeaders(res, result, limitPoints, config.duration)
        .header('Retry-After', `${msToSeconds(result.msBeforeNext)}`)
        .status(429)
        .send({ error: 'Too Many Requests' });
    }
  };
}

/**
 * Export the in-memory limiter class for advanced use cases where
 * you might want direct control over rate limit management.
 */
export { InMemoryRateLimiter };
