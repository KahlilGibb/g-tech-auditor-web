import { createContext } from 'react';
import type { AuthState, LoginRequest } from '../types/auth';

export interface AuthContextType extends AuthState {
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
