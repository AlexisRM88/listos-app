/**
 * =================================================================================================
 * APLICACIÓN DE ADMINISTRACIÓN
 * =================================================================================================
 * Punto de entrada para el panel de administración de ListosApp.
 */

import React, { useState, useEffect } from 'react';
import { AdminPanel } from './components/admin/AdminPanel';
import { ErrorAlert } from './components/ErrorAlert';

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
      
      <AdminPanel onError={setError} />
    </div>
  );
};

export default AdminApp;