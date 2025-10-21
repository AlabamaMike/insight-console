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
