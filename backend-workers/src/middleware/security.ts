/**
 * Security headers middleware
 * Implements comprehensive security headers for production deployment
 */

import { Context, Next } from 'hono';
import { Env } from '../types';

/**
 * Add security headers to all responses
 * Implements OWASP security best practices
 */
export async function securityHeaders(c: Context<{ Bindings: Env }>, next: Next) {
  await next();

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - disable unnecessary features
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy
  // Strict CSP for API - only allow same origin
  c.header(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';"
  );

  // HSTS - Force HTTPS for 1 year
  if (c.env.ENVIRONMENT === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Prevent caching of sensitive data
  if (c.req.path.includes('/api/')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  }
}

/**
 * CORS configuration with strict origin validation
 */
export function configureCORS(allowedOrigins: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('Origin');

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      c.header('Access-Control-Max-Age', '86400'); // 24 hours

      return c.text('', 204);
    }

    await next();
  };
}

/**
 * Add request ID for tracing
 */
export async function requestId(c: Context<{ Bindings: Env }>, next: Next) {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  await next();
}

/**
 * Prevent information leakage in error responses
 */
export async function sanitizeErrors(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);

    // In production, don't expose internal error details
    if (c.env.ENVIRONMENT === 'production') {
      return c.json(
        {
          error: 'Internal Server Error',
          request_id: c.get('requestId'),
        },
        500
      );
    }

    // In development, provide more details
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: c.get('requestId'),
      },
      500
    );
  }
}
