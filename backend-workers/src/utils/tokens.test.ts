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
