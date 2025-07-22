/**
 * =================================================================================================
 * PANEL PRINCIPAL DE ADMINISTRACIÓN
 * =================================================================================================
 * Componente principal que maneja el estado y navegación del panel de administración.
 */

import React, { useState } from 'react';
import { UserWithSubscription } from '../../types';
import { AdminAuth } from './AdminAuth';
import { AdminLayout } from './AdminLayout';
import { AdminRoute } from './AdminRoute';
import { SubscriptionManagement } from './SubscriptionManagement';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { UserManagement } from './UserManagement';
import authService from '../../services/authService';

interface AdminPanelProps {
  onError: (error: string) => void;
}

type AdminSection = 'dashboard' | 'users' | 'subscriptions' | 'analytics';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onError }) => {
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');

  const handleAuthSuccess = (user: UserWithSubscription) => {
    // Forzar recarga para reinicializar el componente con el usuario autenticado
    window.location.reload();
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  const renderSectionContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Bienvenido al Panel de Administración
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Desde aquí puedes gestionar usuarios, suscripciones y ver análisis del sistema.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  onClick={() => setCurrentSection('users')}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Usuarios</p>
                      <p className="text-xs text-blue-500 dark:text-blue-300">Gestionar usuarios del sistema</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={() => setCurrentSection('subscriptions')}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Suscripciones</p>
                      <p className="text-xs text-green-500 dark:text-green-300">Gestionar suscripciones</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  onClick={() => setCurrentSection('analytics')}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Análisis</p>
                      <p className="text-xs text-purple-500 dark:text-purple-300">Ver métricas y reportes</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Sistema</p>
                      <p className="text-xs text-orange-500 dark:text-orange-300">Estado del sistema</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'users':
        return <UserManagement onError={onError} />;
      
      case 'subscriptions':
        return <SubscriptionManagement onError={onError} />;
      
      case 'analytics':
        return <AnalyticsDashboard onError={onError} />;
      
      default:
        return null;
    }
  };

  // Usar AdminRoute para proteger el acceso al panel
  return (
    <AdminRoute 
      onError={onError}
      onAuthRequired={() => <AdminAuth onAuthSuccess={handleAuthSuccess} onError={onError} />}
    >
      {(props) => (
        <AdminLayout
          userProfile={props.userProfile}
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onLogout={handleLogout}
        >
          {renderSectionContent()}
        </AdminLayout>
      )}
    </AdminRoute>
  );
};