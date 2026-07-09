export interface AuthPermission {
  id?: string;
  name: string;
  resource?: string;
  action?: string;
}

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
  organizationName?: string;
  groupName?: string;
  groupAddress?: string;
  avatar?: string;
  permissions?: AuthPermission[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}
