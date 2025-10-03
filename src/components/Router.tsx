import React from 'react';
import { PublicFormPage } from './public';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LoginPage } from './auth';
import { Layout } from './layout';
import { Dashboard } from './dashboard';
import { FormsPage } from './forms';
import { SettingsPage } from './settings';
import { UsersPage } from './users/UsersPage';
import { Form } from '../types';
import FormsService from '../services/forms';

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

function DisplayedFormPage() {
  const [displayedForm, setDisplayedForm] = React.useState<Form | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDisplayedForm = async () => {
      try {
        console.log('Fetching displayed form using FormsService');
        const form = await FormsService.getDisplayedForm();
        console.log('Displayed form data:', form);
        setDisplayedForm(form);
      } catch (err: unknown) {
        console.error('Error fetching displayed form:', err);
        // Handle different types of errors
        const errorMessage = FormsService.handleApiError(err);
        if (errorMessage.includes('not found') || errorMessage.includes('No form')) {
          setError('No form is currently displayed');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisplayedForm();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !displayedForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No form is currently displayed'}</p>
          <a href="/admin" className="text-blue-600 hover:underline">Go to Admin Panel</a>
        </div>
      </div>
    );
  }

  return <PublicFormPage formId={displayedForm.id} form={displayedForm} />;
}

export function Router() {
  // Simple routing based on URL path
  const path = window.location.pathname;
  
  // Check if it's an admin URL
  if (path.startsWith('/admin')) {
    return (
      <AuthProvider>
        <AdminApp />
      </AuthProvider>
    );
  }
  
  // Check if it's a public form URL (e.g., /form/uuid)
  const formMatch = path.match(/^\/form\/([a-f0-9-]{36})$/);
  
  if (formMatch) {
    const formId = formMatch[1];
    return <PublicFormPage formId={formId} />;
  }
  
  // Root path - show displayed form
  if (path === '/') {
    return <DisplayedFormPage />;
  }
  
  // Default to displayed form for any other path
  return <DisplayedFormPage />;
}