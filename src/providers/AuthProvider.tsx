import React, { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { AUTH_EXPIRED_EVENT, authStorage } from '../lib/authStorage';
import type { AuthState, LoginRequest } from '../types/auth';
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

  const logoutAll = useCallback(async () => {
    let logoutError: unknown;
    try {
      await authService.logoutAll();
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
    console.log('[Auth] Found access token on mount, fetching user profile...');
    authService
      .getMe()
      .then(user => {
        if (!isMounted) return;
        console.log('[Auth] getMe success on mount:', user);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch((err) => {
        console.error('[Auth] getMe failed on mount:', err);
        if (!isMounted || authStorage.getUser()) {
          console.warn('[Auth] Skipping logout since user is already cached in storage.');
          return;
        }
        void logout();
      });

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(async (request: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true }));
    console.log('[Auth] Attempting login with identifier:', request.identifier);
    try {
      const result = await authService.login(request);
      console.log('[Auth] Login successful. User:', result.user);
      setState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Auth] Login failed with error:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
};
