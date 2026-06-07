import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './providers/AuthProvider';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import InspectionsPage from './pages/InspectionsPage';
import InspectionFormPage from './pages/InspectionFormPage';
import TemplatesPage from './pages/TemplatesPage';
import ActionsPage from './pages/ActionsPage';
import CpsPage from './pages/CpsPage';
import TrainingPage from './pages/TrainingPage';
import ProfilePage from './pages/ProfilePage';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import BranchesPage from './pages/BranchesPage';
import OrganizationsPage from './pages/OrganizationsPage';
import SitesPage from './pages/SitesPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 animate-spin text-primary-blue" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

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
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="inspections/:id/session" element={<InspectionFormPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="documents" element={<DocumentManagementPage />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="cps" element={<CpsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="settings" element={<ProfilePage />} />
      </Route>

      <Route
        path="/templates/:id/builder"
        element={
          <ProtectedRoute>
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
