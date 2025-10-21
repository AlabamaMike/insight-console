import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { Env } from '../types';
import { getDB } from '../db';
import { users, magicLinkTokens } from '../db/schema';
import { requestMagicLinkSchema, verifyMagicLinkSchema, refreshTokenSchema } from '../schemas/auth';
import { generateToken, hashToken } from '../utils/tokens';
import { createToken, verifyToken } from '../utils/jwt';
import { sendMagicLinkEmail } from '../services/email';
import { authRateLimit } from '../middleware/authRateLimit';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/request-magic-link
 * Request a magic link to be sent via email
 */
auth.post(
  '/request-magic-link',
  authRateLimit,
  zValidator('json', requestMagicLinkSchema),
  async (c) => {
    const { email } = c.req.valid('json');
    const database = getDB(c.env);

    try {
      // Delete all existing tokens for this email (enforce latest-only)
      await database.delete(magicLinkTokens).where(eq(magicLinkTokens.email, email));

      // Generate new token
      const token = await generateToken();
      const tokenHash = await hashToken(token);

      // Calculate expiry (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Store token hash in database
      await database.insert(magicLinkTokens).values({
        email,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      // Send email with magic link
      await sendMagicLinkEmail(
        { email, token, expiresInMinutes: 15 },
        c.env
      );

      return c.json({
        success: true,
        message: 'Check your email for your login link',
      });
    } catch (error) {
      console.error('Error requesting magic link:', error);

      // Always return success to prevent email enumeration
      return c.json({
        success: true,
        message: 'Check your email for your login link',
      });
    }
  }
);

/**
 * GET /auth/verify-magic-link
 * Verify a magic link token and issue JWT tokens
 */
auth.get('/verify-magic-link', zValidator('query', verifyMagicLinkSchema), async (c) => {
  const { token, email } = c.req.valid('query');
  const database = getDB(c.env);

  try {
    // Hash the incoming token
    const tokenHash = await hashToken(token);

    // Find the token in database
    const [storedToken] = await database
      .select()
      .from(magicLinkTokens)
      .where(
        and(
          eq(magicLinkTokens.email, email),
          eq(magicLinkTokens.token_hash, tokenHash)
        )
      )
      .limit(1);

    if (!storedToken) {
      return c.json({ error: 'Invalid login link' }, 401);
    }

    // Check if token is expired
    if (new Date() > storedToken.expires_at) {
      return c.json({ error: 'This link has expired. Please request a new one.' }, 401);
    }

    // Check if token was already used
    if (storedToken.used_at) {
      return c.json({ error: 'This link has already been used. Please request a new one.' }, 401);
    }

    // Mark token as used
    await database
      .update(magicLinkTokens)
      .set({ used_at: new Date() })
      .where(eq(magicLinkTokens.id, storedToken.id));

    // Get or create user
    const existingUsers = await database.select().from(users).where(eq(users.email, email)).limit(1);
    let user = existingUsers[0];

    if (!user) {
      // Create new user
      const newUsers = await database
        .insert(users)
        .values({
          email,
          full_name: email.split('@')[0], // Default to email username
          role: 'consultant',
        })
        .returning();
      user = newUsers[0];
    }

    // Safety check (should never happen)
    if (!user) {
      return c.json({ error: 'Failed to create or retrieve user' }, 500);
    }

    // Generate JWT tokens
    const accessToken = await createToken(
      {
        user_id: user.id,
        firm_id: user.firm_id || '',
        email: user.email,
        role: user.role as 'investor' | 'consultant',
      },
      c.env.JWT_SECRET,
      60 // 1 hour
    );

    const refreshToken = await createToken(
      {
        user_id: user.id,
        firm_id: user.firm_id || '',
        email: user.email,
        role: user.role as 'investor' | 'consultant',
      },
      c.env.JWT_SECRET,
      10080 // 7 days
    );

    return c.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return c.json({ error: 'Invalid login link' }, 401);
  }
});

/**
 * POST /auth/refresh
 * Refresh an access token using a refresh token
 */
auth.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  try {
    // Verify refresh token
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);

    // Generate new access token
    const accessToken = await createToken(
      {
        user_id: payload.user_id,
        firm_id: payload.firm_id,
        email: payload.email,
        role: payload.role,
      },
      c.env.JWT_SECRET,
      60 // 1 hour
    );

    return c.json({ accessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

export default auth;
