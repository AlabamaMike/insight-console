# Magic Link Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement passwordless authentication using magic links sent via email

**Architecture:** Database-stored tokens with Drizzle ORM, Hono API endpoints, Next.js frontend, JWT session management

**Tech Stack:** Cloudflare Workers, Hono, Drizzle ORM, PostgreSQL (Neon), Next.js 14, Web Crypto API

---

## Task 1: Update Database Schema

**Files:**
- Modify: `backend-workers/src/db/schema.ts`
- Create: `backend-workers/migrations/0001_magic_link_auth.sql`

**Step 1: Update users table schema (remove hashed_password)**

In `backend-workers/src/db/schema.ts`, modify the users table:

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }),
  firm_id: varchar('firm_id', { length: 100 }),
  role: varchar('role', { length: 50 }).default('consultant').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
```

**Step 2: Add magicLinkTokens table schema**

In `backend-workers/src/db/schema.ts`, add after the users table:

```typescript
export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token_hash: varchar('token_hash', { length: 64 }).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: index('magic_link_tokens_email_idx').on(table.email),
  tokenHashIdx: index('magic_link_tokens_token_hash_idx').on(table.token_hash),
}));

export type MagicLinkToken = InferSelectModel<typeof magicLinkTokens>;
export type NewMagicLinkToken = InferInsertModel<typeof magicLinkTokens>;
```

**Step 3: Generate migration**

Run: `cd backend-workers && npm run db:generate`

Expected: Migration file created in `migrations/` directory

**Step 4: Apply migration to database**

Run: `cd backend-workers && npm run db:push`

Expected: Tables updated in database

**Step 5: Commit**

```bash
git add backend-workers/src/db/schema.ts backend-workers/migrations/
git commit -m "feat: add magic link tokens table and remove password field

- Remove hashed_password from users table
- Add magic_link_tokens table with email and token_hash indexes
- Generate and apply database migration

🤖 Generated with Claude Code"
```

---

## Task 2: Create Token Utilities

**Files:**
- Create: `backend-workers/src/utils/tokens.ts`
- Create: `backend-workers/src/utils/tokens.test.ts`

**Step 1: Write the failing test**

Create `backend-workers/src/utils/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, verifyTokenHash } from './tokens';

describe('Token utilities', () => {
  it('should generate a URL-safe token', async () => {
    const token = await generateToken();

    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // URL-safe base64
  });

  it('should hash a token to SHA-256 hex', async () => {
    const token = 'test-token-123';
    const hash = await hashToken(token);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should verify token against hash', async () => {
    const token = 'test-token-456';
    const hash = await hashToken(token);

    const isValid = await verifyTokenHash(token, hash);
    expect(isValid).toBe(true);
  });

  it('should reject invalid token', async () => {
    const token = 'correct-token';
    const hash = await hashToken(token);

    const isValid = await verifyTokenHash('wrong-token', hash);
    expect(isValid).toBe(false);
  });

  it('should generate unique tokens', async () => {
    const token1 = await generateToken();
    const token2 = await generateToken();

    expect(token1).not.toBe(token2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend-workers && npm test src/utils/tokens.test.ts`

Expected: FAIL with "Cannot find module './tokens'"

**Step 3: Write minimal implementation**

Create `backend-workers/src/utils/tokens.ts`:

```typescript
/**
 * Token generation and hashing utilities for magic links
 * Uses Web Crypto API available in Cloudflare Workers
 */

/**
 * Generate a cryptographically secure random token
 * @returns URL-safe base64 encoded token (32 bytes = ~43 chars)
 */
export async function generateToken(): Promise<string> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));

  // Convert to URL-safe base64
  const token = btoa(String.fromCharCode(...tokenBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return token;
}

/**
 * Hash a token using SHA-256
 * @param token The token to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify a token against its hash using constant-time comparison
 * @param token The token to verify
 * @param expectedHash The expected hash
 * @returns True if token matches hash
 */
export async function verifyTokenHash(token: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashToken(token);

  // Constant-time comparison to prevent timing attacks
  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < actualHash.length; i++) {
    result |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }

  return result === 0;
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend-workers && npm test src/utils/tokens.test.ts`

Expected: PASS (5 tests passing)

**Step 5: Commit**

```bash
git add backend-workers/src/utils/tokens.ts backend-workers/src/utils/tokens.test.ts
git commit -m "feat: add token generation and hashing utilities

- Generate cryptographically secure random tokens
- Hash tokens with SHA-256 for secure storage
- Verify tokens with constant-time comparison

🤖 Generated with Claude Code"
```

---

## Task 3: Create Auth Request Validation Schemas

**Files:**
- Create: `backend-workers/src/schemas/auth.ts`

**Step 1: Create Zod validation schemas**

Create `backend-workers/src/schemas/auth.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add backend-workers/src/schemas/auth.ts
git commit -m "feat: add auth validation schemas

- Request magic link email validation
- Verify magic link token and email validation
- Refresh token validation

🤖 Generated with Claude Code"
```

---

## Task 4: Create Email Service

**Files:**
- Create: `backend-workers/src/services/email.ts`
- Modify: `backend-workers/src/types.ts`

**Step 1: Add email service types to Env**

Modify `backend-workers/src/types.ts`, add to Env interface:

```typescript
export interface Env {
  // ... existing fields

  // Email service (optional, for production)
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  FRONTEND_URL: string;
}
```

**Step 2: Create email service**

Create `backend-workers/src/services/email.ts`:

```typescript
import { Env } from '../types';

interface MagicLinkEmailParams {
  email: string;
  token: string;
  expiresInMinutes: number;
}

/**
 * Send magic link email
 * Environment-aware: console log in dev, email service in production
 */
export async function sendMagicLinkEmail(
  params: MagicLinkEmailParams,
  env: Env
): Promise<void> {
  const { email, token, expiresInMinutes } = params;

  // Construct magic link URL
  const magicLinkUrl = `${env.FRONTEND_URL}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  // Development: Log to console
  if (env.ENVIRONMENT === 'development') {
    console.log('🔐 Magic Link Email:');
    console.log(`   To: ${email}`);
    console.log(`   URL: ${magicLinkUrl}`);
    console.log(`   Expires in: ${expiresInMinutes} minutes`);
    return;
  }

  // Production: Send via Resend (or other email service)
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured for production');
  }

  const emailBody = generateEmailHTML(magicLinkUrl, expiresInMinutes);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'noreply@dealinsights.ai',
      to: email,
      subject: 'Your login link for DealInsights',
      html: emailBody,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Email send failed:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(magicLinkUrl: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">DealInsights.ai</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Your Login Link</h2>

    <p>Click the button below to securely log in to your account:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}"
         style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        Log In to DealInsights
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request this login link, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; text-align: center;">
      DealInsights.ai - AI-Powered Deal Analysis
    </p>
  </div>
</body>
</html>
  `.trim();
}
```

**Step 3: Commit**

```bash
git add backend-workers/src/services/email.ts backend-workers/src/types.ts
git commit -m "feat: add email service for magic links

- Environment-aware email delivery (console in dev, Resend in prod)
- HTML email template with branding
- Magic link URL construction

🤖 Generated with Claude Code"
```

---

## Task 5: Create Rate Limiting for Auth Endpoints

**Files:**
- Create: `backend-workers/src/middleware/authRateLimit.ts`

**Step 1: Create auth-specific rate limiter**

Create `backend-workers/src/middleware/authRateLimit.ts`:

```typescript
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
  const body = await c.req.json().catch(() => ({}));
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
```

**Step 2: Commit**

```bash
git add backend-workers/src/middleware/authRateLimit.ts
git commit -m "feat: add rate limiting for auth endpoints

- Limit magic link requests to 3 per email per hour
- In-memory rate limit tracking (TODO: move to KV for production)
- Return user-friendly error with time remaining

🤖 Generated with Claude Code"
```

---

## Task 6: Create Auth Routes

**Files:**
- Create: `backend-workers/src/routes/auth.ts`
- Modify: `backend-workers/src/index.ts`

**Step 1: Create auth routes**

Create `backend-workers/src/routes/auth.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gt } from 'drizzle-orm';
import { Env } from '../types';
import { db } from '../db';
import { users, magicLinkTokens } from '../db/schema';
import { requestMagicLinkSchema, verifyMagicLinkSchema, refreshTokenSchema } from '../schemas/auth';
import { generateToken, hashToken, verifyTokenHash } from '../utils/tokens';
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
    const database = db(c.env.DATABASE_URL);

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
  const database = db(c.env.DATABASE_URL);

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
    let [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // Create new user
      [user] = await database
        .insert(users)
        .values({
          email,
          full_name: email.split('@')[0], // Default to email username
          role: 'consultant',
        })
        .returning();
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
```

**Step 2: Register auth routes in main app**

Modify `backend-workers/src/index.ts`, add import:

```typescript
import auth from './routes/auth';
```

Add route registration after other routes:

```typescript
// API routes
app.route('/api/deals', deals);
app.route('/api/documents', documents);
app.route('/api/deals', workflows);
app.route('/api/workflows', workflows);
app.route('/auth', auth); // Add this line
```

**Step 3: Update environment variables**

Add to `backend-workers/.env.example`:

```
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=noreply@dealinsights.ai
```

**Step 4: Commit**

```bash
git add backend-workers/src/routes/auth.ts backend-workers/src/index.ts backend-workers/.env.example
git commit -m "feat: add auth API endpoints

- POST /auth/request-magic-link - send magic link email
- GET /auth/verify-magic-link - verify token and issue JWTs
- POST /auth/refresh - refresh access token
- Rate limiting on magic link requests
- Auto-create users on first login

🤖 Generated with Claude Code"
```

---

## Task 7: Create Frontend Auth API Client

**Files:**
- Create: `frontend/src/lib/api/auth.ts`

**Step 1: Create auth API client**

Create `frontend/src/lib/api/auth.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export interface RequestMagicLinkResponse {
  success: boolean;
  message: string;
}

export interface VerifyMagicLinkResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    full_name: string | null;
    role: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
}

/**
 * Request a magic link to be sent to the provided email
 */
export async function requestMagicLink(email: string): Promise<RequestMagicLinkResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/request-magic-link`, {
    email,
  });
  return response.data;
}

/**
 * Verify a magic link token and get JWT tokens
 */
export async function verifyMagicLink(
  token: string,
  email: string
): Promise<VerifyMagicLinkResponse> {
  const response = await axios.get(`${API_BASE_URL}/auth/verify-magic-link`, {
    params: { token, email },
  });
  return response.data;
}

/**
 * Refresh the access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refreshToken,
  });
  return response.data;
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api/auth.ts
git commit -m "feat: add frontend auth API client

- Request magic link function
- Verify magic link function
- Refresh token function

🤖 Generated with Claude Code"
```

---

## Task 8: Create Auth State Management

**Files:**
- Create: `frontend/src/lib/auth.ts`

**Step 1: Create auth utilities**

Create `frontend/src/lib/auth.ts`:

```typescript
/**
 * Auth state management and token storage
 */

const ACCESS_TOKEN_KEY = 'dealinsights_access_token';
const REFRESH_TOKEN_KEY = 'dealinsights_refresh_token';
const USER_KEY = 'dealinsights_user';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
}

/**
 * Save auth tokens to localStorage
 */
export function saveAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Save user data to localStorage
 */
export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Clear all auth data (logout)
 */
export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/auth.ts
git commit -m "feat: add auth state management

- Token storage in localStorage
- User data persistence
- Auth check utilities
- Logout function

🤖 Generated with Claude Code"
```

---

## Task 9: Create Axios Interceptor for Auth

**Files:**
- Create: `frontend/src/lib/axios.ts`

**Step 1: Create configured axios instance**

Create `frontend/src/lib/axios.ts`:

```typescript
import axios from 'axios';
import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuth } from './auth';
import { refreshAccessToken } from './api/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor: Add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // No refresh token, redirect to login
        clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the access token
        const { accessToken } = await refreshAccessToken(refreshToken);
        saveAuthTokens(accessToken, refreshToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

**Step 2: Commit**

```bash
git add frontend/src/lib/axios.ts
git commit -m "feat: add axios interceptor for auth

- Attach access token to API requests
- Auto-refresh token on 401 errors
- Redirect to login if refresh fails

🤖 Generated with Claude Code"
```

---

## Task 10: Create Login Page

**Files:**
- Create: `frontend/src/app/auth/login/page.tsx`

**Step 1: Create login page component**

Create `frontend/src/app/auth/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { requestMagicLink } from '@/lib/api/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestMagicLink(email);
      setSubmitted(true);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(err.response.data.message || 'Too many requests. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Click the link in the email to log in. The link will expire in 15 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DealInsights.ai</h1>
          <p className="text-gray-600">AI-Powered Deal Analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            We'll send you a secure login link. No password needed.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/auth/login/page.tsx
git commit -m "feat: add login page with magic link request

- Email input form
- Success state showing 'check your email'
- Error handling with user-friendly messages
- Rate limit error display

🤖 Generated with Claude Code"
```

---

## Task 11: Create Verify Page

**Files:**
- Create: `frontend/src/app/auth/verify/page.tsx`

**Step 1: Create verify page component**

Create `frontend/src/app/auth/verify/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyMagicLink } from '@/lib/api/auth';
import { saveAuthTokens, saveUser } from '@/lib/auth';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setError('Invalid link. Missing token or email.');
        setVerifying(false);
        return;
      }

      try {
        const response = await verifyMagicLink(token, email);

        // Save auth tokens and user data
        saveAuthTokens(response.accessToken, response.refreshToken);
        saveUser(response.user);

        // Redirect to dashboard
        router.push('/deals');
      } catch (err: any) {
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('Invalid or expired link. Please request a new one.');
        }
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying...</h2>
            <p className="text-gray-600">Please wait while we log you in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Request a new link
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/auth/verify/page.tsx
git commit -m "feat: add verify page for magic link tokens

- Extract token and email from URL params
- Verify token via API
- Save tokens and user data on success
- Redirect to dashboard after login
- Show error state with link to request new magic link

🤖 Generated with Claude Code"
```

---

## Task 12: Add Environment Variables

**Files:**
- Modify: `frontend/.env.local.example` (create if doesn't exist)
- Modify: `backend-workers/wrangler.toml`

**Step 1: Add frontend environment variables**

Create or modify `frontend/.env.local.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

**Step 2: Update wrangler.toml for local development**

Add to `backend-workers/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "development"
FRONTEND_URL = "http://localhost:3000"
```

**Step 3: Commit**

```bash
git add frontend/.env.local.example backend-workers/wrangler.toml
git commit -m "chore: add environment variables for magic link auth

- Frontend API URL configuration
- Backend environment and frontend URL
- Development defaults for local testing

🤖 Generated with Claude Code"
```

---

## Task 13: Add README for Magic Link Setup

**Files:**
- Create: `docs/AUTH_SETUP.md`

**Step 1: Create setup documentation**

Create `docs/AUTH_SETUP.md`:

```markdown
# Magic Link Authentication Setup

## Overview

This project uses passwordless authentication via magic links. Users receive a time-limited login link via email instead of using passwords.

## Local Development

### Backend Setup

1. Navigate to backend-workers:
   \`\`\`bash
   cd backend-workers
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables (copy from example):
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Update `.env` with your values:
   \`\`\`
   DATABASE_URL=your_neon_database_url
   JWT_SECRET=your_secret_key_here
   FRONTEND_URL=http://localhost:3000
   ENVIRONMENT=development
   \`\`\`

5. Run database migrations:
   \`\`\`bash
   npm run db:push
   \`\`\`

6. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

Backend will be running at `http://localhost:8787`

**In development mode**, magic links are logged to the console instead of being emailed.

### Frontend Setup

1. Navigate to frontend:
   \`\`\`bash
   cd frontend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

4. Update `.env.local`:
   \`\`\`
   NEXT_PUBLIC_API_URL=http://localhost:8787
   \`\`\`

5. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

Frontend will be running at `http://localhost:3000`

## Testing Magic Link Flow

1. Go to `http://localhost:3000/auth/login`
2. Enter your email address
3. Check the backend console logs for the magic link URL
4. Copy the URL and paste it into your browser
5. You should be logged in and redirected to the dashboard

## Production Setup

### Email Service (Resend)

1. Sign up for [Resend](https://resend.com)
2. Add and verify your domain
3. Get your API key
4. Add to production environment:
   \`\`\`
   RESEND_API_KEY=your_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ENVIRONMENT=production
   \`\`\`

### Security Checklist

- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up SPF/DKIM records for email domain
- [ ] Use HTTPS in production (magic links over HTTP are insecure)
- [ ] Configure rate limiting in production (consider KV or Durable Objects)
- [ ] Monitor failed login attempts

## API Endpoints

- `POST /auth/request-magic-link` - Request a magic link
- `GET /auth/verify-magic-link?token=xxx&email=xxx` - Verify and login
- `POST /auth/refresh` - Refresh access token

## Troubleshooting

### "Too many requests" error
- Rate limit is 3 requests per email per hour
- Wait for the cooldown period or clear rate limit (development only)

### Magic link expired
- Links expire after 15 minutes
- Request a new magic link

### Email not sending (production)
- Verify Resend API key is correct
- Check domain verification in Resend dashboard
- Review Cloudflare Workers logs for email errors
\`\`\`

**Step 2: Commit**

\`\`\`bash
git add docs/AUTH_SETUP.md
git commit -m "docs: add magic link authentication setup guide

- Local development setup instructions
- Production deployment checklist
- Testing guide
- Troubleshooting section

🤖 Generated with Claude Code"
\`\`\`

---

## Testing & Verification

### Manual Testing Checklist

After implementation, test these scenarios:

1. **Happy Path**
   - [ ] Request magic link with valid email
   - [ ] Receive email (or see console log in dev)
   - [ ] Click magic link
   - [ ] Redirected to dashboard with valid tokens
   - [ ] Can access protected API endpoints

2. **Error Cases**
   - [ ] Request magic link 4 times → get rate limited
   - [ ] Use expired token → get error message
   - [ ] Use token twice → get "already used" error
   - [ ] Request new magic link → old link becomes invalid

3. **Token Refresh**
   - [ ] Access token expires → auto-refreshes
   - [ ] Refresh token expires → redirect to login

4. **Logout**
   - [ ] Logout clears tokens
   - [ ] Cannot access protected routes after logout

### Unit Test Coverage

Tests are included for:
- Token generation and hashing (`tokens.test.ts`)

Additional tests should cover:
- Auth routes (request, verify, refresh)
- Rate limiting middleware
- Email service (mock in tests)

---

## Implementation Notes

### DRY (Don't Repeat Yourself)
- Reused existing JWT utilities from `src/utils/jwt.ts`
- Shared validation schemas in `src/schemas/auth.ts`
- Environment-aware email service (one function, multiple modes)

### YAGNI (You Aren't Gonna Need It)
- No SMS magic links
- No OAuth/social login (yet)
- No "remember device" feature
- No session activity tracking
- Rate limiting uses in-memory storage (simple, good enough for MVP)

### TDD (Test-Driven Development)
- Token utilities have comprehensive tests
- Each route should have integration tests (TODO)

### Security Best Practices
- Tokens hashed with SHA-256 before storage
- Constant-time comparison prevents timing attacks
- Single-use tokens
- 15-minute expiry
- Rate limiting prevents abuse
- Latest-only enforcement prevents token accumulation

---

## Deployment Order

1. Deploy backend with new schema and routes
2. Run database migration
3. Deploy frontend with new auth pages
4. Configure environment variables in production
5. Test magic link flow end-to-end
6. Monitor logs for errors

**Rollback Plan**: Keep this feature behind a feature flag or deploy to staging first for validation.
```

**Step 2: Commit**

```bash
git add docs/plans/2025-10-21-magic-link-auth-implementation.md
git commit -m "docs: add comprehensive implementation plan

Complete step-by-step plan for magic link authentication:
- 13 bite-sized tasks with TDD approach
- Database schema, token utilities, API routes
- Frontend login and verify pages
- Email service and rate limiting
- Environment configuration and documentation

🤖 Generated with Claude Code"
```

---

## Plan Complete

Plan saved to `docs/plans/2025-10-21-magic-link-auth-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration with quality gates

**2. Parallel Session (separate)** - Open new session with executing-plans skill in the worktree, batch execution with checkpoints

Which approach would you prefer?
