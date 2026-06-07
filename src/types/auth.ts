export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  orgId?: string;
  role: string;
  roleId?: string;
  branchId?: string;
  groupId?: string;
  avatar?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
