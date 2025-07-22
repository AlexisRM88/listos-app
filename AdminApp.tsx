/**
 * =================================================================================================
 * APLICACIÓN DE ADMINISTRACIÓN
 * =================================================================================================
 * Punto de entrada para el panel de administración de ListosApp.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy loaded components
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));

const AdminApp: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <ErrorAlert 
            message={error} 
            onClose={() => setError(null)} 
            language="Español" 
          />
        </div>
      )}
      
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="large" /></div>}>
        <AdminPanel onError={setError} />
      </Suspense>
    </div>
  );
};

export default AdminApp;