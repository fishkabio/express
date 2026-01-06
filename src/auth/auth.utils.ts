import { assertTruthy } from '@fishka/assertions';
import { EndpointMiddleware, RequestContext } from '../router/fishka-router';
import { ApiAuthUser, AuthStrategy } from './auth.types';

/**
 * Creates a middleware that enforces authentication using the provided strategy.
 * The authenticated user is stored in the context under the 'authUser' key.
 *
 * @template TUser - Type of the authenticated user
 * @param strategy - Authentication strategy to use
 * @param onSuccess - Optional callback to process authenticated user
 * @returns Fishka middleware that enforces authentication
 */
export function createAuthMiddleware<TUser extends ApiAuthUser = ApiAuthUser>(
  strategy: AuthStrategy<unknown, TUser>,
  onSuccess?: (user: TUser, context: RequestContext) => void,
): EndpointMiddleware {
  return async (handler, context) => {
    // Extract credentials from request
    const credentials = strategy.extractCredentials(context.req);

    // If no credentials found (and strategy returned undefined), we must deny access here.
    // In a composite strategy scenario, we might want to try the next strategy, but this helper is for a single strategy enforcement.
    assertTruthy(credentials, '401 UNAUTHORIZED: No credentials provided or invalid format');

    // Validate credentials and get authenticated user
    const user = await strategy.validateCredentials(credentials);

    // Store authenticated user in context for the handler to access
    context.context.set('authUser', user);

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
 * @template TUser - Type of the authenticated user
 * @param context - Fishka request context
 * @returns The authenticated user
 * @throws Error if user is not found in context
 */
export function getAuthUser<TUser extends ApiAuthUser = ApiAuthUser>(context: RequestContext): TUser {
  const user = context.context.get('authUser');
  assertTruthy(user, '401 UNAUTHORIZED: User not found in context. Did you add auth middleware?');
  return user as TUser;
}

/**
 * Safely extracts the authenticated user from the request context.
 * Returns undefined if the user is not present.
 *
 * @template TUser - Type of the authenticated user
 * @param context - Fishka request context
 * @returns The authenticated user, or undefined if not found
 */
export function tryGetAuthUser<TUser extends ApiAuthUser = ApiAuthUser>(context: RequestContext): TUser | undefined {
  return context.context.get('authUser') as TUser | undefined;
}
