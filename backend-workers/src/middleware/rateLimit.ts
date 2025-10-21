/**
 * Rate limiting middleware for Cloudflare Workers
 * Uses KV for distributed rate limit tracking
 */

import { Context, Next } from 'hono';
import { Env } from '../types';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /**
   * Maximum requests allowed in the window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Key prefix for KV storage
   */
  keyPrefix?: string;
}

/**
 * Default rate limits for different endpoint types
 */
export const RATE_LIMITS = {
  // General API requests: 100 requests per minute
  DEFAULT: { limit: 100, windowSeconds: 60 },

  // Authentication endpoints: 5 attempts per 15 minutes
  AUTH: { limit: 5, windowSeconds: 900 },

  // Document uploads: 10 per hour
  UPLOAD: { limit: 10, windowSeconds: 3600 },

  // AI workflow execution: 20 per hour
  WORKFLOW: { limit: 20, windowSeconds: 3600 },

  // Downloads: 50 per 10 minutes
  DOWNLOAD: { limit: 50, windowSeconds: 600 },
};

/**
 * Rate limiting middleware
 * Tracks requests by IP address or user ID
 */
export function rateLimit(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const { limit, windowSeconds, keyPrefix = 'ratelimit' } = config;

    // Get identifier (prefer user ID, fallback to IP)
    const user = c.get('user') as { user_id: number } | undefined;
    const userId = user?.user_id;
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    const identifier = userId ? `user:${userId}` : `ip:${ipAddress}`;
    const key = `${keyPrefix}:${identifier}`;

    try {
      // Get current count from KV
      const data = await c.env.SESSIONS.get(key, 'json') as { count: number; resetAt: number } | null;

      const now = Math.floor(Date.now() / 1000);

      if (data && data.resetAt > now) {
        // Within existing window
        if (data.count >= limit) {
          // Rate limit exceeded
          const retryAfter = data.resetAt - now;

          return c.json(
            {
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
              retry_after: retryAfter,
            },
            429,
            {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': data.resetAt.toString(),
            }
          );
        }

        // Increment count
        const newCount = data.count + 1;
        await c.env.SESSIONS.put(
          key,
          JSON.stringify({ count: newCount, resetAt: data.resetAt }),
          { expirationTtl: data.resetAt - now }
        );

        // Set rate limit headers
        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', (limit - newCount).toString());
        c.header('X-RateLimit-Reset', data.resetAt.toString());
      } else {
        // New window
        const resetAt = now + windowSeconds;

        await c.env.SESSIONS.put(
          key,
          JSON.stringify({ count: 1, resetAt }),
          { expirationTtl: windowSeconds }
        );

        // Set rate limit headers
        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', (limit - 1).toString());
        c.header('X-RateLimit-Reset', resetAt.toString());
      }

      await next();
    } catch (error) {
      // If rate limiting fails, don't block the request
      console.error('Rate limiting error:', error);
      await next();
    }
  };
}

/**
 * Rate limit by IP address only
 * Useful for public endpoints before authentication
 */
export function rateLimitByIP(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const { limit, windowSeconds, keyPrefix = 'ratelimit:ip' } = config;

    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const key = `${keyPrefix}:${ipAddress}`;

    try {
      const data = await c.env.SESSIONS.get(key, 'json') as { count: number; resetAt: number } | null;
      const now = Math.floor(Date.now() / 1000);

      if (data && data.resetAt > now) {
        if (data.count >= limit) {
          const retryAfter = data.resetAt - now;

          return c.json(
            {
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
              retry_after: retryAfter,
            },
            429,
            {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': data.resetAt.toString(),
            }
          );
        }

        const newCount = data.count + 1;
        await c.env.SESSIONS.put(
          key,
          JSON.stringify({ count: newCount, resetAt: data.resetAt }),
          { expirationTtl: data.resetAt - now }
        );

        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', (limit - newCount).toString());
        c.header('X-RateLimit-Reset', data.resetAt.toString());
      } else {
        const resetAt = now + windowSeconds;

        await c.env.SESSIONS.put(
          key,
          JSON.stringify({ count: 1, resetAt }),
          { expirationTtl: windowSeconds }
        );

        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', (limit - 1).toString());
        c.header('X-RateLimit-Reset', resetAt.toString());
      }

      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      await next();
    }
  };
}

/**
 * Check if an identifier is currently rate limited
 * Useful for pre-checking before expensive operations
 */
export async function isRateLimited(
  env: Env,
  identifier: string,
  config: RateLimitConfig
): Promise<boolean> {
  const { limit, keyPrefix = 'ratelimit' } = config;
  const key = `${keyPrefix}:${identifier}`;

  const data = await env.SESSIONS.get(key, 'json') as { count: number; resetAt: number } | null;

  if (!data) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);

  if (data.resetAt <= now) {
    return false;
  }

  return data.count >= limit;
}
