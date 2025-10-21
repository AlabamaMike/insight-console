import { Context, Next } from 'hono';
import { Env } from '../types';

/**
 * Rate limit map: email -> { count, resetAt }
 * In production, this should use KV or Durable Objects
 * For now, using in-memory for simplicity (resets on worker restart)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 3;
const WINDOW_MINUTES = 60;

/**
 * Rate limit middleware for magic link requests
 * Limits to 3 requests per email per hour
 */
export async function authRateLimit(c: Context<{ Bindings: Env }>, next: Next) {
  // Clone the request to preserve body for downstream handlers
  const clonedRequest = c.req.raw.clone();
  const body = await clonedRequest.json().catch(() => ({}));
  const email = body.email?.toLowerCase();

  if (!email) {
    return next();
  }

  const now = Date.now();
  const rateLimitData = rateLimitMap.get(email);

  if (rateLimitData) {
    // Check if window has expired
    if (now > rateLimitData.resetAt) {
      // Reset window
      rateLimitMap.set(email, { count: 1, resetAt: now + WINDOW_MINUTES * 60 * 1000 });
    } else if (rateLimitData.count >= MAX_REQUESTS) {
      // Rate limit exceeded
      const minutesRemaining = Math.ceil((rateLimitData.resetAt - now) / (60 * 1000));
      return c.json(
        {
          error: 'Too many requests',
          message: `Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`,
        },
        429
      );
    } else {
      // Increment count
      rateLimitData.count++;
    }
  } else {
    // First request
    rateLimitMap.set(email, { count: 1, resetAt: now + WINDOW_MINUTES * 60 * 1000 });
  }

  await next();
}
