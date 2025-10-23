'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, User } from '@/contexts/AuthContext';
import {
  getAccessToken,
  getUser,
  saveAuthTokens,
  saveUser,
  clearAuth,
} from '@/lib/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = () => {
      const token = getAccessToken();
      const storedUser = getUser();

      if (token && storedUser) {
        setUser(storedUser);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, userData: User) => {
    saveAuthTokens(accessToken, refreshToken);
    saveUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
