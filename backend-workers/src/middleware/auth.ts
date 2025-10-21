/**
 * Authentication middleware for Cloudflare Workers
 * Validates JWT tokens and sets user context
 */

import { Context, Next } from 'hono';
import { Env, UserContext } from '../types';
import { verifyToken } from '../utils/jwt';

/**
 * Authentication middleware
 * Extracts and validates JWT token from Authorization header
 * Sets user context in the request if valid
 */
export async function authenticate(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    // Set user context for downstream handlers
    const userContext: UserContext = {
      user_id: payload.user_id,
      firm_id: payload.firm_id,
      email: payload.email,
      role: payload.role,
    };

    c.set('user', userContext);

    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    return c.json({ error: 'Unauthorized', message }, 401);
  }
}

/**
 * Optional authentication middleware
 * Validates token if present but doesn't require it
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      const userContext: UserContext = {
        user_id: payload.user_id,
        firm_id: payload.firm_id,
        email: payload.email,
        role: payload.role,
      };

      c.set('user', userContext);
    } catch {
      // Ignore invalid tokens in optional auth
      // User context will just not be set
    }
  }

  await next();
}

/**
 * Role-based authorization middleware
 * Requires specific role(s) to access the endpoint
 */
export function requireRole(...allowedRoles: Array<'investor' | 'consultant'>) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as UserContext | undefined;

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
        403
      );
    }

    await next();
  };
}
