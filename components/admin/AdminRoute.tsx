/**
 * =================================================================================================
 * COMPONENTE DE PROTECCIÓN DE RUTAS ADMINISTRATIVAS
 * =================================================================================================
 * Componente que protege las rutas administrativas verificando autenticación y autorización.
 */

import React, { useEffect, useState } from 'react';
import { UserWithSubscription } from '../../types';
import authService from '../../services/authService';
import sessionManager from '../../services/sessionManager';

interface AdminRouteProps {
  children: React.ReactNode | ((props: { userProfile: UserWithSubscription }) => React.ReactNode);
  onError: (error: string) => void;
  onAuthRequired?: () => React.ReactNode;
  redirectPath?: string;
}

interface AdminRouteState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  userProfile: UserWithSubscription | null;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  onError, 
  onAuthRequired,
  redirectPath = '/'
}) => {
  const [state, setState] = useState<AdminRouteState>({
    isLoading: true,
    isAuthenticated: false,
    isAuthorized: false,
    userProfile: null
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Verificar si hay token de autenticación
      const token = authService.getAuthToken();
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Verificar que el token sea válido y tenga permisos de admin
      const response = await fetch('/api/admin/users?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        onError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente');
        authService.logout();
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (response.status === 403) {
        onError('No tienes permisos de administrador para acceder a este panel');
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: true }));
        return;
      }

      if (!response.ok) {
        onError('Error al verificar permisos de administrador');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Cargar datos de sesión
      const { userProfile } = await sessionManager.loadSession();
      if (!userProfile) {
        onError('Error al obtener información del usuario');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Verificar si el usuario tiene rol de administrador
      const isAdmin = userProfile.role === 'admin';
      
      setState({
        isLoading: false,
        isAuthenticated: true,
        isAuthorized: isAdmin,
        userProfile
      });

    } catch (error) {
      console.error('Error al verificar acceso:', error);
      onError('Error de conexión al verificar permisos');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Verificando permisos de administrador...
          </span>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return onAuthRequired ? onAuthRequired() : null;
  }

  if (!state.isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Acceso Denegado
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No tienes permisos de administrador para acceder a este panel.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = redirectPath}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver a la Aplicación
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si children es una función, llamarla con el perfil de usuario
  if (typeof children === 'function' && state.userProfile) {
    return <>{children({ userProfile: state.userProfile })}</>;
  }

  // Si children es un ReactNode, renderizarlo directamente
  return <>{children}</>;
};