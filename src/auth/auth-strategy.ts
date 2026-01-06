import { assertTruthy } from '@fishka/assertions';
import { ExpressRequest } from '../utils/express.utils';
import { AuthStrategy, AuthUser } from './auth.types';

/**
 * Basic authentication strategy using username/password validation.
 * Parses HTTP Basic Authorization header and validates credentials.
 *
 * Example usage:
 * ```
 * const strategy = new BasicAuthStrategy(
 *   async (username, password) => {
 *     const user = await db.users.findByUsername(username);
 *     if (user && await bcrypt.compare(password, user.hash)) {
 *       return user;
 *     }
 *     return null;
 *   }
 * );
 * ```
 */
export class BasicAuthStrategy<User extends AuthUser = AuthUser> implements AuthStrategy<
  { username: string; password: string },
  User
> {
  constructor(private readonly verifyFn: (username: string, password: string) => Promise<User | null>) {}

  /**
   * Extracts username and password from Basic auth header.
   * Expected format: "Basic base64(username:password)"
   * Returns undefined if header is missing or not Basic.
   */
  extractCredentials(req: ExpressRequest): { username: string; password: string } | undefined {
    const authHeaderValue = req.header('Authorization');
    if (!authHeaderValue || !authHeaderValue.startsWith('Basic ')) {
      return undefined;
    }

    try {
      const decoded = Buffer.from(authHeaderValue.substring(6), 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');

      // If format is "Basic base64(:)", it might mean empty username/password which is technically valid syntax but usually useless.
      // However, split might return undefined for password if ":" is missing.
      if (!username || password === undefined) {
        return undefined;
      }

      return { username, password };
    } catch {
      return undefined;
    }
  }

  /**
   * Validates the extracted credentials using the provided validation function.
   */
  async validateCredentials({ username, password }: { username: string; password: string }): Promise<User> {
    const user = await this.verifyFn(username, password);
    assertTruthy(user, '401 UNAUTHORIZED: Invalid username or password');
    return user;
  }
}
