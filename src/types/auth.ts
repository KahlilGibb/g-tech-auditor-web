export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: 'admin' | 'inspector' | 'manager';
  avatar?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
