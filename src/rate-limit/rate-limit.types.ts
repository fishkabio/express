/**
 * Configuration for rate limiting.
 */
export interface RateLimitConfig {
  /** Rate limit points per time window */
  points: {
    read: number; // For GET requests
    write: number; // For POST/PATCH/PUT/DELETE requests
  };

  /** Duration of the rate limit window in seconds */
  duration: number;

  /** Key prefix for rate limit data (optional, defaults to 'rate_limit') */
  keyPrefix?: string;

  /** Paths that should bypass rate limiting (default: ['/v1', '/health']) */
  rateLimitWhitelist?: string[];
}

/**
 * Simple in-memory rate limiter result.
 */
export interface RateLimitResult {
  remainingPoints: number;
  msBeforeNext: number;
}
