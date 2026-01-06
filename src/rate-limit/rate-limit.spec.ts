import { ExpressResponse } from '../utils/express.utils';
import { addRateLimitHeaders, msToSeconds } from './rate-limit';
import { RateLimitResult } from './rate-limit.types';

describe('rate-limit.utils', () => {
  describe('msToSeconds', () => {
    it('should convert milliseconds to seconds with rounding up', () => {
      expect(msToSeconds(1000)).toBe(1);
      expect(msToSeconds(2000)).toBe(2);
      expect(msToSeconds(5000)).toBe(5);
    });

    it('should round up fractional seconds', () => {
      expect(msToSeconds(1100)).toBe(2);
      expect(msToSeconds(1001)).toBe(2);
      expect(msToSeconds(1500)).toBe(2);
      expect(msToSeconds(1999)).toBe(2);
    });

    it('should handle zero', () => {
      expect(msToSeconds(0)).toBe(0);
    });

    it('should handle small values', () => {
      expect(msToSeconds(1)).toBe(1);
      expect(msToSeconds(100)).toBe(1);
      expect(msToSeconds(500)).toBe(1);
      expect(msToSeconds(999)).toBe(1);
    });

    it('should handle large values', () => {
      expect(msToSeconds(60000)).toBe(60);
      expect(msToSeconds(3600000)).toBe(3600);
    });
  });

  describe('addRateLimitHeaders', () => {
    let mockResponse: any;
    let headerMap: Map<string, string>;

    beforeEach(() => {
      headerMap = new Map<string, string>();
      mockResponse = {
        header: jest.fn((name: string, value: string) => {
          headerMap.set(name, value);
          return mockResponse;
        }),
      };
    });

    it('should add all required rate limit headers', () => {
      const result: RateLimitResult = { remainingPoints: 50, msBeforeNext: 30000 };

      const { header } = addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(header).toHaveBeenCalledWith('X-RateLimit-Remaining', '50');
      expect(header).toHaveBeenCalledWith('X-RateLimit-Reset', '30');
      expect(header).toHaveBeenCalledWith('X-RateLimit-Policy', '100;w=60;comment="fixed window"');
    });

    it('should return the response object for chaining', () => {
      const result: RateLimitResult = {
        remainingPoints: 50,
        msBeforeNext: 30000,
      };

      const response = addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(response).toBe(mockResponse);
    });

    it('should round up time remaining in seconds', () => {
      const result: RateLimitResult = {
        remainingPoints: 75,
        msBeforeNext: 5500, // 5.5 seconds -> should round up to 6
      };

      addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Reset', '6');
    });

    it('should handle zero remaining points', () => {
      const result: RateLimitResult = {
        remainingPoints: 0,
        msBeforeNext: 60000,
      };

      addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should handle different limit points and durations', () => {
      const result: RateLimitResult = {
        remainingPoints: 25,
        msBeforeNext: 45000,
      };

      addRateLimitHeaders(mockResponse as ExpressResponse, result, 50, 120);

      expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Limit', '50');
      expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Policy', '50;w=120;comment="fixed window"');
    });

    it('should handle very small time remaining', () => {
      const result: RateLimitResult = {
        remainingPoints: 99,
        msBeforeNext: 100, // less than 1 second
      };

      addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Reset', '1');
    });

    it('should call header method multiple times in order', () => {
      const result: RateLimitResult = {
        remainingPoints: 50,
        msBeforeNext: 30000,
      };

      addRateLimitHeaders(mockResponse as ExpressResponse, result, 100, 60);

      expect(mockResponse.header).toHaveBeenCalledTimes(4);
      const calls = (mockResponse.header as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('X-RateLimit-Limit');
      expect(calls[1][0]).toBe('X-RateLimit-Remaining');
      expect(calls[2][0]).toBe('X-RateLimit-Reset');
      expect(calls[3][0]).toBe('X-RateLimit-Policy');
    });
  });
});
