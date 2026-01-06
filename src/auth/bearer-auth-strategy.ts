import { ExpressRequest } from '../utils/express.utils';
import { AuthStrategy, AuthUser } from './auth.types';
import { HttpError } from '../utils/http-error';
import { UNAUTHORIZED_STATUS } from '../utils/common';

/**
 * Bearer authentication strategy (commonly used for JWTs).
 * Extracts the token from the 'Authorization: Bearer <token>' header.
 *
 * The validation logic is delegated to the `verifyFn`, which can:
 * - Validate a JWT signature locally.
 * - Call an external API/website to verify the token (Introspection/UserInfo).
 *
 * Example usage:
 * ```ts
 * const strategy = new BearerAuthStrategy(async (token) => {
 *   // Call external website to validate
 *   const response = await fetch('https://auth.example.com/verify', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 *   if (!response.ok) return null;
 *   return await response.json();
 * });
 * ```
 */
export class BearerAuthStrategy<User extends AuthUser = AuthUser> implements AuthStrategy<string, User> {
  /**
   * @param verifyFn Function to validate the token. Returns the user if valid, or null if invalid.
   */
  constructor(private readonly verifyFn: (token: string) => Promise<User | null>) {}

  /**
   * Extracts the Bearer token from the Authorization header.
   * Returns undefined if the header is missing or not a Bearer token.
   */
  extractCredentials(req: ExpressRequest): string | undefined {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return undefined;
    }

    return token;
  }

  /**
   * Validates the extracted token using the provided verification function.
   */
  async validateCredentials(token: string): Promise<User> {
    const user = await this.verifyFn(token);
    if (!user) {
      throw new HttpError(UNAUTHORIZED_STATUS, 'Invalid token');
    }
    return user;
  }
}
