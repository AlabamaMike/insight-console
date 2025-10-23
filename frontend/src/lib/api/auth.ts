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
