import React from 'react';
import { PublicFormPage } from './public';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LoginPage } from './auth';
import { Layout } from './layout';
import { Dashboard } from './dashboard';
import { FormsPage } from './forms';
import { SettingsPage } from './settings';
import { UsersPage } from './users/UsersPage';

function AdminApp() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'forms':
        return <FormsPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </Layout>
  );
}

export function Router() {
  // Simple routing based on URL path
  const path = window.location.pathname;
  
  // Check if it's a public form URL (e.g., /form/uuid)
  const formMatch = path.match(/^\/form\/([a-f0-9-]{36})$/);
  
  if (formMatch) {
    const formId = formMatch[1];
    return <PublicFormPage formId={formId} />;
  }
  
  // Default to admin app
  return (
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  );
}