import React from 'react';
import type { PermissionRequirement } from '../../constants/rbac';
import { useRbac } from '../../hooks/useRbac';

interface CanProps {
  resource?: string;
  action?: string;
  permission?: PermissionRequirement;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  resource,
  action = 'read',
  permission,
  fallback = null,
  children,
}) => {
  const { can } = useRbac();
  const requirement = permission ?? (resource ? { resource, action } : undefined);

  if (!requirement || can(requirement)) return <>{children}</>;

  return <>{fallback}</>;
};
