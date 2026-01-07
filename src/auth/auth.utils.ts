import { HttpError } from '../api.types';
import { HTTP_UNAUTHORIZED } from '../http-status-codes';
import { EndpointMiddleware, RequestContext } from '../router';
import { AuthStrategy, AuthUser } from './auth.types';

/**
 * Creates a middleware that enforces authentication using the provided strategy.
 * The authenticated user is stored in the context under the 'authUser' key.
 *
 * @template User - Type of the authenticated user
 * @param strategy - Authentication strategy to use
 * @param onSuccess - Optional callback to process authenticated user
 * @returns a middleware that enforces authentication
 */
export function createAuthMiddleware<User extends AuthUser = AuthUser>(
  strategy: AuthStrategy<unknown, User>,
  onSuccess?: (user: User, context: RequestContext) => void,
): EndpointMiddleware {
  return async (handler, context) => {
    // Extract credentials from request
    const credentials = strategy.extractCredentials(context.req);

    // If no credentials found (and strategy returned undefined), we must deny access here.
    // In a composite strategy scenario, we might want to try the next strategy, but this helper is for a single strategy enforcement.
    if (!credentials) {
      throw new HttpError(HTTP_UNAUTHORIZED, 'No credentials provided or invalid format');
    }

    // Validate credentials and get authenticated user
    const user = await strategy.validateCredentials(credentials);

    // Store authenticated user in state for the handler to access
    context.authUser = user;

    // Optional: Call success callback
    if (onSuccess) {
      onSuccess(user, context);
    }

    // Execute the actual handler
    return handler();
  };
}

/**
 * Extracts the authenticated user from the request context.
 * Throws if the user is not present (i.e., authentication was not performed).
 *
 * @template User - Type of the authenticated user
 * @param context - Request context
 * @returns The authenticated user
 * @throws Error if user is not found in context
 */
export function getAuthUser<User extends AuthUser = AuthUser>(context: RequestContext): User {
  const user = context.authUser;
  if (!user) {
    throw new HttpError(HTTP_UNAUTHORIZED, 'User not found in context. Did you add auth middleware?');
  }
  return user as User;
}

/**
 * Safely extracts the authenticated user from the request context.
 * Returns undefined if the user is not present.
 *
 * @template User - Type of the authenticated user
 * @param context - Request context
 * @returns The authenticated user, or undefined if not found
 */
export function tryGetAuthUser<User extends AuthUser = AuthUser>(context: RequestContext): User | undefined {
  return context.authUser as User | undefined;
}
