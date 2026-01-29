import { HttpError } from '../api.types';
import { HTTP_UNAUTHORIZED } from '../http-status-codes';
import { ExpressRequest } from '../utils/express.utils';
import { AuthStrategy, AuthUser } from './auth.types';

// Symbol key for storing auth user in request
const AUTH_USER_KEY = Symbol('authUser');

// Extend Express Request type to include auth user
// Using module augmentation instead of namespace
declare module 'express-serve-static-core' {
  interface Request {
    [AUTH_USER_KEY]?: AuthUser;
  }
}

/**
 * Creates an Express middleware that enforces authentication using the provided strategy.
 * The authenticated user is stored in the request object.
 *
 * @template Credentials - Type of the extracted credentials
 * @template User - Type of the authenticated user
 * @param strategy - Authentication strategy to use
 * @param onSuccess - Optional callback to process authenticated user
 * @returns Express middleware that enforces authentication
 */
export function createAuthMiddleware<Credentials = unknown, User extends AuthUser = AuthUser>(
  strategy: AuthStrategy<Credentials, User>,
  onSuccess?: (user: User, req: ExpressRequest) => void,
): (req: ExpressRequest, res: unknown, next: (err?: unknown) => void) => Promise<void> {
  return async (req: ExpressRequest, _res: unknown, next: (err?: unknown) => void) => {
    try {
      // Extract credentials from request
      const credentials = strategy.extractCredentials(req);

      // If no credentials found (and strategy returned undefined), we must deny access here.
      if (!credentials) {
        throw new HttpError(HTTP_UNAUTHORIZED, 'No credentials provided or invalid format');
      }

      // Validate credentials and get authenticated user
      const user = await strategy.validateCredentials(credentials as Credentials);

      // Store authenticated user in request for the handler to access
      (req as ExpressRequest & { [AUTH_USER_KEY]?: User })[AUTH_USER_KEY] = user;

      // Optional: Call success callback
      if (onSuccess) {
        onSuccess(user, req);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extracts the authenticated user from the request.
 * Throws if the user is not present (i.e., authentication was not performed).
 *
 * @template User - Type of the authenticated user
 * @param req - Express Request object
 * @returns The authenticated user
 * @throws Error if user is not found in request
 */
export function getAuthUser<User extends AuthUser = AuthUser>(req: ExpressRequest): User {
  const user = (req as ExpressRequest & { [AUTH_USER_KEY]?: User })[AUTH_USER_KEY];
  if (!user) {
    throw new HttpError(HTTP_UNAUTHORIZED, 'User not found in request. Did you add auth middleware?');
  }
  return user;
}

/**
 * Safely extracts the authenticated user from the request.
 * Returns undefined if the user is not present.
 *
 * @template User - Type of the authenticated user
 * @param req - Express Request object
 * @returns The authenticated user, or undefined if not found
 */
export function tryGetAuthUser<User extends AuthUser = AuthUser>(req: ExpressRequest): User | undefined {
  return (req as ExpressRequest & { [AUTH_USER_KEY]?: User })[AUTH_USER_KEY];
}
