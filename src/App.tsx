import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './providers/AuthProvider';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import InspectionsPage from './pages/InspectionsPage';
import InspectionFormPage from './pages/InspectionFormPage';
import TemplatesPage from './pages/TemplatesPage';
import MasterFieldsPage from './pages/MasterFieldsPage';
import ActionsPage from './pages/ActionsPage';
import CpsPage from './pages/CpsPage';
import CpsSessionPage from './pages/CpsSessionPage';
import TrainingPage from './pages/TrainingPage';
import ProfilePage from './pages/ProfilePage';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import PermissionsPage from './pages/PermissionsPage';
import BranchesPage from './pages/BranchesPage';
import OrganizationsPage from './pages/OrganizationsPage';
import SitesPage from './pages/SitesPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import ActionStatusesPage from './pages/ActionStatusesPage';
import TrashBinPage from './pages/TrashBinPage';
import { Loader2 } from 'lucide-react';
import AccessDenied from './components/rbac/AccessDenied';
import { NAV_PERMISSIONS, type NavPermissionRequirement } from './constants/rbac';
import { useRbac } from './hooks/useRbac';
import { useNotificationStore } from './stores/notificationStore';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission?: NavPermissionRequirement;
}> = ({ children, permission }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canRequirement, isLoadingPermissions } = useRbac();

  if (isLoading || (permission && isLoadingPermissions)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 animate-spin text-primary-blue" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canRequirement(permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { fetchNotifications, disconnect } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      disconnect();
    }
  }, [isAuthenticated, fetchNotifications, disconnect]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="inspections"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.inspections}>
              <InspectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inspections/:id/session"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.inspectionSession}>
              <InspectionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="templates"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.templates}>
              <TemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="master-fields"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.masterFields}>
              <MasterFieldsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.documents}>
              <DocumentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="actions"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.actions}>
              <ActionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cps"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.cps}>
              <CpsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cps/session/:id"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.cps}>
              <CpsSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="training"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.training}>
              <TrainingPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.users}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.roles}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.permissions}>
              <PermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="branches"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.branches}>
              <BranchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="organizations"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.organizations}>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sites"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.sites}>
              <SitesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="action-statuses"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.actionStatuses}>
              <ActionStatusesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trash-bin"
          element={
            <ProtectedRoute permission={NAV_PERMISSIONS.trashBin}>
              <TrashBinPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<ProfilePage />} />
      </Route>

      <Route
        path="/templates/:id/builder"
        element={
          <ProtectedRoute permission={NAV_PERMISSIONS.templateBuilder}>
            <TemplateBuilderPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
