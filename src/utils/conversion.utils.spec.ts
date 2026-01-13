import { toApiDateString } from './conversion.utils';

describe('conversion.utils', () => {
  describe('toDateString', () => {
    it('should convert timestamp to ISO 8601 format without milliseconds', () => {
      const timestamp = new Date('2012-07-20T01:19:13.000Z').getTime();
      const result = toApiDateString(timestamp);
      expect(result).toBe('2012-07-20T01:19:13Z');
    });

    it('should convert Date object to ISO 8601 format without milliseconds', () => {
      const date = new Date('2012-07-20T01:19:13.456Z');
      const result = toApiDateString(date);
      expect(result).toBe('2012-07-20T01:19:13Z');
    });

    it('should strip milliseconds from timestamp', () => {
      const timestamp = new Date('2023-01-15T10:30:45.789Z').getTime();
      const result = toApiDateString(timestamp);
      expect(result).toBe('2023-01-15T10:30:45Z');
      expect(result).not.toContain('789');
    });

    it('should strip milliseconds from Date object', () => {
      const date = new Date('2023-12-31T23:59:59.999Z');
      const result = toApiDateString(date);
      expect(result).toBe('2023-12-31T23:59:59Z');
    });

    it('should handle Unix epoch', () => {
      const timestamp = 0; // January 1, 1970
      const result = toApiDateString(timestamp);
      expect(result).toBe('1970-01-01T00:00:00Z');
    });

    it('should handle current date', () => {
      const now = new Date();
      const result = toApiDateString(now);
      // Result should match pattern YYYY-MM-DDTHH:mm:ssZ
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });
});
