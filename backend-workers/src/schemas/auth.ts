import { z } from 'zod';

/**
 * Request magic link schema
 */
export const requestMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/**
 * Verify magic link schema (query params)
 */
export const verifyMagicLinkSchema = z.object({
  token: z.string().min(40, 'Invalid token'),
  email: z.string().email('Invalid email address').toLowerCase(),
});

export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
