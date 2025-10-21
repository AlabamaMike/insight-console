/**
 * Audit logging middleware
 * Automatically logs all authenticated requests
 */

import { Context, Next } from 'hono';
import { Env, UserContext } from '../types';
import { logAuditEvent } from '../utils/audit';

/**
 * Middleware to automatically log all authenticated API requests
 * Should be applied after authentication middleware
 */
export async function auditLogger(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as UserContext | undefined;

  // Only log authenticated requests
  if (!user) {
    await next();
    return;
  }

  // Store request time
  const startTime = Date.now();

  // Execute the request
  await next();

  // Log after request completes
  const duration = Date.now() - startTime;
  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;

  // Only log write operations (POST, PUT, DELETE) or if response indicates an error/security event
  const shouldLog =
    method !== 'GET' ||
    status === 403 ||
    status === 401 ||
    status >= 500;

  if (shouldLog) {
    // Determine action from method and path
    const action = determineAction(method, path);
    const resourceType = determineResourceType(path);

    await logAuditEvent(c, {
      user_id: user.user_id,
      firm_id: user.firm_id,
      action,
      resource_type: resourceType || 'api',
      metadata: {
        method,
        path,
        status,
        duration_ms: duration,
      },
    });
  }
}

/**
 * Determine action from HTTP method and path
 */
function determineAction(method: string, path: string): string {
  if (path.includes('/download')) return 'download';
  if (path.includes('/upload')) return 'upload';

  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    case 'GET':
      return 'view';
    default:
      return 'unknown';
  }
}

/**
 * Determine resource type from path
 */
function determineResourceType(path: string): string | null {
  if (path.includes('/deals')) return 'deal';
  if (path.includes('/documents')) return 'document';
  if (path.includes('/workflows')) return 'workflow';
  if (path.includes('/users')) return 'user';
  return null;
}

/**
 * Audit logging middleware for specific routes
 * Use this to add detailed logging to sensitive operations
 */
export function auditRoute(action: string, resourceType: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as UserContext | undefined;

    if (!user) {
      await next();
      return;
    }

    await next();

    // Log after successful request
    if (c.res.status < 400) {
      await logAuditEvent(c, {
        user_id: user.user_id,
        firm_id: user.firm_id,
        action,
        resource_type: resourceType,
        metadata: {
          path: c.req.path,
          method: c.req.method,
        },
      });
    }
  };
}
