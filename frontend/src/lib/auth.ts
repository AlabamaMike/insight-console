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
