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
