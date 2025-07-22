/**
 * =================================================================================================
 * COMPONENTE DE GESTIÓN DE USUARIOS
 * =================================================================================================
 * Componente para administrar usuarios desde el panel de administración.
 */

import React, { useState, useEffect } from 'react';
import { DbUser } from '../../types';

interface UserManagementProps {
  onError: (error: string) => void;
}

interface UserWithStats extends DbUser {
  subscription_count: number;
  last_subscription_date?: Date;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onError }) => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<{ name: string; role: string }>({ name: '', role: 'user' });
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Función para cargar usuarios desde la API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/admin/users?limit=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data.data.users);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      onError('No se pudieron cargar los usuarios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios según términos de búsqueda y filtros
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Función para mostrar mensaje de éxito
  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  // Función para abrir modal de edición
  const openEditModal = (user: UserWithStats) => {
    setSelectedUser(user);
    setEditingUser({ name: user.name || '', role: user.role || 'user' });
    setIsModalOpen(true);
  };

  // Función para actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingUser)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }

      // Actualizar la lista de usuarios
      await fetchUsers();
      setIsModalOpen(false);
      
      // Mostrar mensaje de éxito
      showSuccessNotification('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      onError('No se pudo actualizar el usuario. Intenta nuevamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para gestionar suscripción de usuario
  const handleManageSubscription = async (userId: string, action: 'create' | 'cancel' | 'reactivate') => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Error al ${getActionText(action)} la suscripción`);
      }

      // Actualizar la lista de usuarios
      await fetchUsers();
      
      // Mostrar mensaje de éxito
      showSuccessNotification(`Suscripción ${getActionText(action)}da correctamente`);
    } catch (error) {
      console.error(`Error al ${getActionText(action)} la suscripción:`, error);
      onError(`No se pudo ${getActionText(action)} la suscripción. Intenta nuevamente.`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para obtener texto de acción
  const getActionText = (action: string): string => {
    switch (action) {
      case 'create': return 'crear';
      case 'cancel': return 'cancelar';
      case 'reactivate': return 'reactivar';
      default: return action;
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString?: Date) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar modal de edición de usuario
  const renderEditModal = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Editar Usuario
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre
                </label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol
                </label>
                <select
                  id="userRole"
                  name="userRole"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Email:</span> {selectedUser.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">ID:</span> {selectedUser.id}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Suscripciones:</span> {selectedUser.subscription_count}
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={processingAction}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={processingAction || !editingUser.name}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {processingAction ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar notificación de éxito
  const renderSuccessNotification = () => {
    if (!showSuccess) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md">
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg shadow-lg border border-green-200 dark:border-green-700">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="inline-flex text-green-500 hover:text-green-600 focus:outline-none"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notificación de éxito */}
      {renderSuccessNotification()}
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Gestión de Usuarios
        </h3>
        
        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4 mb-6">
          <div className="w-full md:w-1/3">
            <label htmlFor="search" className="sr-only">Buscar</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Buscar por email, nombre o ID"
              />
            </div>
          </div>
          
          <div className="w-full md:w-1/4">
            <label htmlFor="roleFilter" className="sr-only">Filtrar por rol</label>
            <select
              id="roleFilter"
              name="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">Todos los roles</option>
              <option value="user">Usuarios</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
          
          <div className="w-full md:w-auto">
            <button
              onClick={fetchUsers}
              className="w-full md:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
        
        {/* Tabla de usuarios */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || roleFilter !== 'all' ? 
                'No se encontraron usuarios con los filtros aplicados.' : 
                'No hay usuarios registrados.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Suscripciones
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img 
                            className="h-10 w-10 rounded-full" 
                            src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=3B82F6&color=fff`}
                            alt={user.name || 'Usuario'}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.subscription_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                        {user.subscription_count === 0 ? (
                          <button
                            onClick={() => handleManageSubscription(user.id, 'create')}
                            disabled={processingAction}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          >
                            Crear Suscripción
                          </button>
                        ) : (
                          <button
                            onClick={() => handleManageSubscription(user.id, 'cancel')}
                            disabled={processingAction}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            Cancelar Suscripción
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Modal de edición */}
      {isModalOpen && renderEditModal()}
    </div>
  );
};