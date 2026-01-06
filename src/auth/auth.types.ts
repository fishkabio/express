import { ExpressRequest } from '../utils/express.utils';

/**
 * Interface representing the authenticated user.
 * Users of the library should use module augmentation to add fields to this interface.
 *
 * Example:
 * ```ts
 * declare module '@fishka/express' {
 *   interface AuthUser {
 *     id: string;
 *     roles: string[];
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthUser {
  // This interface is intentionally empty to allow module augmentation
  // Users should extend it via declare module '@fishka/express' { interface AuthUser { ... } }
}

/**
 * Generic authentication strategy interface.
 * Allows users to implement custom authentication logic.
 *
 * @template Credentials - The type of credentials extracted from the request
 * @template User - The type of the authenticated user/entity
 */
export interface AuthStrategy<Credentials = unknown, User extends AuthUser = AuthUser> {
  /**
   * Extracts credentials from the Express request.
   * This might parse Authorization headers, cookies, API keys, etc.
   *
   * @param req - Express request object
   * @returns Extracted credentials, or undefined if not found/applicable
   */
  extractCredentials(req: ExpressRequest): Credentials | undefined;

  /**
   * Validates the extracted credentials and returns the authenticated user/entity.
   *
   * @param credentials - Credentials to validate
   * @returns Authenticated user/entity
   * @throws Error if credentials are invalid
   */
  validateCredentials(credentials: Credentials): Promise<User>;
}
