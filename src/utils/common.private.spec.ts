import { INTERNAL_ERROR_STATUS, parseStatusCodeFromErrorMessageToken } from './common.private';

describe('common.utils', () => {
  describe('parseStatusCodeFromErrorMessageToken', () => {
    it('should parse valid HTTP status code from error message', () => {
      expect(parseStatusCodeFromErrorMessageToken('400 Bad Request')).toBe(400);
      expect(parseStatusCodeFromErrorMessageToken('401 Unauthorized')).toBe(401);
      expect(parseStatusCodeFromErrorMessageToken('500 Internal Server Error')).toBe(500);
    });

    it('should return 500 for message without status code', () => {
      expect(parseStatusCodeFromErrorMessageToken('Some random error')).toBe(INTERNAL_ERROR_STATUS);
    });

    it('should return 500 for empty or undefined message', () => {
      expect(parseStatusCodeFromErrorMessageToken('')).toBe(INTERNAL_ERROR_STATUS);
      expect(parseStatusCodeFromErrorMessageToken(undefined)).toBe(INTERNAL_ERROR_STATUS);
    });

    it('should extract status code even with extra spaces', () => {
      expect(parseStatusCodeFromErrorMessageToken('404    Not Found')).toBe(404);
    });
  });
});
