import React, { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { AUTH_EXPIRED_EVENT, authStorage } from '../lib/authStorage';
import type { AuthState } from '../types/auth';
import { AuthContext } from '../hooks/authContext';

const getInitialAuthState = (): AuthState => {
  const savedUser = authStorage.getUser();
  const hasToken = Boolean(authStorage.getAccessToken());

  return {
    user: hasToken ? savedUser : null,
    isAuthenticated: Boolean(hasToken && savedUser),
    isLoading: false,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  const logout = useCallback(async () => {
    let logoutError: unknown;
    try {
      await authService.logout();
    } catch (error) {
      logoutError = error;
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    if (logoutError) throw logoutError;
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      void logout();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  useEffect(() => {
    if (!authStorage.getAccessToken()) return;

    let isMounted = true;
    authService
      .getMe()
      .then(user => {
        if (!isMounted) return;
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => {
        if (!isMounted || authStorage.getUser()) return;
        void logout();
      });

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await authService.login(email, password);
      setState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
