import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import InspectionsPage from './pages/InspectionsPage';
import TemplatesPage from './pages/TemplatesPage';
import ActionsPage from './pages/ActionsPage';
import CpsPage from './pages/CpsPage';
import TrainingPage from './pages/TrainingPage';
import ProfilePage from './pages/ProfilePage';
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
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="cps" element={<CpsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<div className="p-8"><h1 className="text-2xl font-bold text-foreground">Users</h1><p className="mt-2 text-muted-foreground">Manage organizational users and roles.</p></div>} />
        <Route path="settings" element={<ProfilePage />} />
      </Route>

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
