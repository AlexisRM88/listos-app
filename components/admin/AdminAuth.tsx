/**
 * =================================================================================================
 * COMPONENTE DE AUTENTICACIÓN PARA ADMINISTRADORES
 * =================================================================================================
 * Maneja la autenticación y autorización específica para el panel de administración.
 */

import React, { useState, useEffect } from 'react';
import { UserWithSubscription } from '../../types';
import authService from '../../services/authService';

interface AdminAuthProps {
  onAuthSuccess: (user: UserWithSubscription) => void;
  onError: (error: string) => void;
}

export const AdminAuth: React.FC<AdminAuthProps> = ({ onAuthSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeGoogleAuth();
  }, []);

  const initializeGoogleAuth = async () => {
    try {
      const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        onError('Configuración de Google Auth no encontrada');
        return;
      }

      await authService.initGoogleAuth(clientId, handleGoogleResponse);
      setIsInitialized(true);

      // Verificar si ya hay una sesión activa
      const token = authService.getAuthToken();
      if (token) {
        await verifyAdminAccess(token);
      }
    } catch (error) {
      console.error('Error al inicializar Google Auth:', error);
      onError('Error al inicializar la autenticación');
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const result = await authService.processGoogleAuthResponse(response);
      
      if (result.success && result.user) {
        // Verificar que el usuario tenga permisos de administrador
        const hasAdminAccess = await verifyAdminAccess(result.user.idToken);
        if (hasAdminAccess) {
          onAuthSuccess(result.user);
        } else {
          onError('No tienes permisos de administrador para acceder a este panel');
        }
      } else {
        onError(result.message || 'Error en la autenticación');
      }
    } catch (error) {
      console.error('Error en la autenticación:', error);
      onError('Error al procesar la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAdminAccess = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/users?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        onError('No tienes permisos de administrador para acceder a este panel');
        return false;
      }

      if (response.status === 401) {
        onError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente');
        return false;
      }

      if (!response.ok) {
        onError('Error al verificar permisos de administrador');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error al verificar permisos de admin:', error);
      onError('Error de conexión al verificar permisos');
      return false;
    }
  };

  const renderGoogleButton = () => {
    if (!isInitialized) return null;

    return (
      <div 
        id="google-signin-button"
        ref={(element) => {
          if (element && window.google?.accounts?.id) {
            authService.renderGoogleButton(element, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              shape: 'pill',
              width: 320
            });
          }
        }}
      />
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Panel de Administración
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Inicia sesión con tu cuenta de administrador
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Acceso Restringido
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>Solo los usuarios con permisos de administrador pueden acceder a este panel.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Verificando permisos...
                </span>
              </div>
            ) : (
              renderGoogleButton()
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Al iniciar sesión, confirmas que tienes autorización para acceder al panel de administración de ListosApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};