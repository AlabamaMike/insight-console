# Magic Link Authentication Design

**Date**: 2025-10-21
**Status**: Approved
**Architecture**: Passwordless email-only authentication

## Overview

This design implements a passwordless authentication system using magic links for the DealInsights platform. Users authenticate by receiving a time-limited login link via email, eliminating the need for password management.

## Requirements

### Functional Requirements
- Email-only signup and login (no passwords)
- Magic links valid for 15 minutes
- Latest magic link invalidates all previous links for the same email
- JWT-based session management (stateless)
- Environment-aware email delivery (console logging in dev, email service in prod)

### Non-Functional Requirements
- Secure token generation and storage
- Protection against timing attacks
- Rate limiting to prevent abuse
- Single-use tokens

## Architecture Decision

**Selected Approach**: Database-stored tokens with cleanup

### Rationale
- Leverages existing PostgreSQL + Drizzle ORM stack
- Simple, explicit, and easy to debug
- Straightforward audit trail
- No additional infrastructure (Redis) required
- Explicit token invalidation via database deletion

### Alternatives Considered
- **Redis/cache-based tokens**: Requires additional infrastructure
- **Signed JWT magic links**: Stateless but requires generation counter in DB, partially defeating the stateless benefit

## Database Schema

### Updated Users Table
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

**Changes**: Removed `hashed_password` field (breaking change)

### New Magic Link Tokens Table
```typescript
export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(), // indexed
  token_hash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  used_at: timestamp('used_at', { withTimezone: true }), // nullable, set when consumed
});
```

**Indexes**:
- `email` (for lookup and cleanup)
- `token_hash` (for verification)

## API Endpoints

### POST /auth/request-magic-link
**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Check your email for your login link"
}
```

**Process**:
1. Validate email format
2. Delete all existing tokens for email (enforce "latest link only")
3. Generate secure random token (32 bytes, URL-safe base64)
4. Hash token with SHA-256
5. Store token hash in DB with 15-minute expiry
6. Send email with magic link (or log to console in dev)
7. Return success response

### GET /auth/verify-magic-link
**Query Parameters**:
- `token`: The magic link token
- `email`: User's email address

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "consultant"
  }
}
```

**Error Responses**:
- 401: Token expired, already used, or invalid
- 400: Missing parameters

**Process**:
1. Hash incoming token with SHA-256
2. Look up token in database by email and token_hash
3. Validate: exists, not expired, not used
4. Mark token as used (set `used_at`)
5. Get or create user by email
6. Generate JWT access token (1 hour) and refresh token (7 days)
7. Return tokens and user data

### POST /auth/refresh
**Request**:
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbG..."
}
```

**Process**:
1. Validate refresh token signature
2. Verify not expired
3. Generate new access token
4. Return new access token

## Token Generation & Security

### Token Generation
```typescript
// Generate 32 random bytes
const tokenBytes = crypto.getRandomValues(new Uint8Array(32));

// Convert to URL-safe base64
const token = btoa(String.fromCharCode(...tokenBytes))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

// Hash for storage (SHA-256)
const tokenHash = await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(token));
const tokenHashHex = Array.from(new Uint8Array(tokenHash))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

### Security Measures
1. **Cryptographically secure random tokens**: Using `crypto.getRandomValues()`
2. **Hash before storage**: SHA-256 prevents database compromise from revealing valid tokens
3. **Single-use tokens**: Mark as used after verification
4. **Time-limited**: 15-minute expiry
5. **Latest-only**: Delete previous tokens on new request
6. **Constant-time comparison**: Prevent timing attacks during token verification
7. **Rate limiting**: Max 3 requests per email per hour
8. **HTTPS only**: Enforce in production

## Email Delivery

### Development Mode
```typescript
if (env.ENVIRONMENT === 'development') {
  console.log(`🔐 Magic link for ${email}:`);
  console.log(`   ${magicLinkUrl}`);
  console.log(`   Expires in 15 minutes`);
}
```

### Production Mode
```typescript
await sendEmail({
  to: email,
  subject: "Your login link for DealInsights",
  html: emailTemplate({
    magicLinkUrl,
    expiryMinutes: 15
  })
});
```

**Email Service Options**:
- Resend (recommended for simplicity)
- SendGrid
- AWS SES

**Required Configuration**:
- API key in environment variables
- SPF/DKIM records for domain
- HTML email template with branding

## Frontend Integration

### Login Flow
1. User enters email on login page
2. Call `POST /auth/request-magic-link`
3. Show "Check your email" confirmation
4. User clicks link in email
5. Redirects to `/auth/verify?token=xxx&email=xxx`
6. Frontend extracts params, calls `GET /auth/verify-magic-link`
7. On success: Store tokens, redirect to dashboard
8. On error: Show error message with "Request new link" button

### Token Storage
- Store JWT access token in `localStorage` or `httpOnly` cookies
- Store refresh token securely
- Axios interceptor adds `Authorization: Bearer ${token}` header
- Auto-refresh before access token expires

### URL Format
```
https://dealinsights.ai/auth/verify?token=abc123xyz&email=user@example.com
```

## Error Handling

### User-Facing Messages
- **Token expired**: "This link has expired. Please request a new one."
- **Token used**: "This link has already been used. Please request a new one."
- **Invalid token**: "Invalid login link. Please request a new one."
- **Email send failure**: Log error server-side, but return success to prevent email enumeration

### Rate Limiting Response
```json
{
  "error": "Too many requests. Please try again in 60 minutes."
}
```

## Migration Strategy

### Breaking Changes
- Removes `hashed_password` from users table
- Existing password-based authentication will stop working

### Migration Steps
1. Deploy new schema with `magicLinkTokens` table
2. Make `hashed_password` nullable first (optional transition period)
3. Deploy magic link authentication endpoints
4. Update frontend to use magic link flow
5. Remove `hashed_password` column entirely

### Rollback Plan
- Keep `hashed_password` nullable during initial rollout
- Can revert to password auth if issues arise

## Testing Strategy

### Unit Tests
- Token generation and hashing
- Token validation (expired, used, invalid)
- Email format validation
- JWT generation and verification

### Integration Tests
- Full magic link request → verify flow
- Rate limiting behavior
- Token cleanup on new request
- Error cases (expired, used, invalid tokens)

### Security Tests
- Timing attack resistance
- Token enumeration prevention
- CSRF protection
- XSS in email rendering

## Future Enhancements

### Potential Additions
- Remember device / "Trust this browser"
- OAuth/SSO integration alongside magic links
- Email change flow with verification
- Admin ability to revoke all sessions for a user

### Out of Scope (YAGNI)
- SMS magic links
- Biometric authentication
- Multi-factor authentication
- Session activity tracking
