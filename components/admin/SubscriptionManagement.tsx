/**
 * =================================================================================================
 * COMPONENTE DE GESTIÓN DE SUSCRIPCIONES
 * =================================================================================================
 * Componente para administrar suscripciones de usuarios desde el panel de administración.
 */

import React, { useState, useEffect } from 'react';
import { DbSubscription, DbUser } from '../../types';

interface SubscriptionManagementProps {
  onError: (error: string) => void;
}

interface SubscriptionWithUser extends DbSubscription {
  user?: DbUser;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ onError }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Cargar suscripciones al montar el componente
  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Función para cargar suscripciones desde la API
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/admin/subscriptions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar suscripciones');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
      onError('No se pudieron cargar las suscripciones. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar suscripciones según términos de búsqueda y filtros
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      subscription.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.stripe_subscription_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Función para mostrar mensaje de éxito
  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000); // Ocultar después de 5 segundos
  };

  // Función para modificar una suscripción
  const handleModifySubscription = async (action: 'cancel' | 'reactivate' | 'upgrade' | 'downgrade') => {
    if (!selectedSubscription) return;
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al ${getActionText(action)} la suscripción`);
      }

      // Actualizar la lista de suscripciones
      await fetchSubscriptions();
      setIsModalOpen(false);
      
      // Mostrar mensaje de éxito
      showSuccessNotification(`Suscripción ${getActionText(action)}da correctamente`);
    } catch (error) {
      console.error(`Error al ${getActionText(action)} la suscripción:`, error);
      onError(`No se pudo ${getActionText(action)} la suscripción. Intenta nuevamente.`);
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Función para cambiar el plan de una suscripción
  const handleChangePlan = async (newPlan: string) => {
    if (!selectedSubscription) return;
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/change-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: newPlan })
      });

      if (!response.ok) {
        throw new Error(`Error al cambiar el plan de la suscripción`);
      }

      // Actualizar la lista de suscripciones
      await fetchSubscriptions();
      setIsPlanModalOpen(false);
      
      // Mostrar mensaje de éxito
      showSuccessNotification(`Plan cambiado correctamente a ${newPlan}`);
    } catch (error) {
      console.error('Error al cambiar el plan de la suscripción:', error);
      onError('No se pudo cambiar el plan de la suscripción. Intenta nuevamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para procesar un reembolso
  const handleRefund = async () => {
    if (!selectedSubscription) return;
    
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar el reembolso');
      }

      // Actualizar la lista de suscripciones
      await fetchSubscriptions();
      setIsRefundModalOpen(false);
      setRefundAmount('');
      setRefundReason('');
      
      // Mostrar mensaje de éxito
      showSuccessNotification(`Reembolso de $${parseFloat(refundAmount).toFixed(2)} procesado correctamente`);
    } catch (error) {
      console.error('Error al procesar el reembolso:', error);
      onError('No se pudo procesar el reembolso. Intenta nuevamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para obtener texto de acción
  const getActionText = (action: string): string => {
    switch (action) {
      case 'cancel': return 'cancelar';
      case 'reactivate': return 'reactivar';
      case 'upgrade': return 'actualizar';
      case 'downgrade': return 'degradar';
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

  // Renderizar modal de detalles de suscripción
  const renderSubscriptionModal = () => {
    if (!selectedSubscription) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Detalles de Suscripción
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
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Información del Usuario</h4>
                <p><span className="font-medium">Nombre:</span> {selectedSubscription.user?.name || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {selectedSubscription.user?.email || 'N/A'}</p>
                <p><span className="font-medium">ID:</span> {selectedSubscription.user_id}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Detalles de Suscripción</h4>
                <p><span className="font-medium">ID:</span> {selectedSubscription.id}</p>
                <p><span className="font-medium">ID en Stripe:</span> {selectedSubscription.stripe_subscription_id || 'N/A'}</p>
                <p><span className="font-medium">Plan:</span> {selectedSubscription.plan}</p>
                <p><span className="font-medium">Estado:</span> 
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedSubscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    selectedSubscription.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {selectedSubscription.status === 'active' ? 'Activa' :
                     selectedSubscription.status === 'canceled' ? 'Cancelada' : 'Expirada'}
                  </span>
                </p>
                <p><span className="font-medium">Fecha de creación:</span> {formatDate(selectedSubscription.created_at)}</p>
                <p><span className="font-medium">Fin del período actual:</span> {formatDate(selectedSubscription.current_period_end)}</p>
                <p><span className="font-medium">Cancelar al final del período:</span> {selectedSubscription.cancel_at_period_end ? 'Sí' : 'No'}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end mt-4">
                {selectedSubscription.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleModifySubscription('cancel')}
                      disabled={processingAction}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {processingAction ? 'Procesando...' : 'Cancelar Suscripción'}
                    </button>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setIsRefundModalOpen(true);
                      }}
                      disabled={processingAction}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      Procesar Reembolso
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(selectedSubscription.plan);
                        setIsModalOpen(false);
                        setIsPlanModalOpen(true);
                      }}
                      disabled={processingAction}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      Cambiar Plan
                    </button>
                  </>
                )}
                
                {selectedSubscription.status === 'canceled' && (
                  <button
                    onClick={() => handleModifySubscription('reactivate')}
                    disabled={processingAction}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {processingAction ? 'Procesando...' : 'Reactivar Suscripción'}
                  </button>
                )}
                
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={processingAction}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar modal de reembolso
  const renderRefundModal = () => {
    if (!selectedSubscription) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Procesar Reembolso
              </h3>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Monto a reembolsar (USD)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="refundAmount"
                    id="refundAmount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">USD</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo del reembolso
                </label>
                <div className="mt-1">
                  <textarea
                    id="refundReason"
                    name="refundReason"
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Explica el motivo del reembolso"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={processingAction}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRefund}
                  disabled={processingAction || !refundAmount || !refundReason}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {processingAction ? 'Procesando...' : 'Procesar Reembolso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderizar modal de cambio de plan
  const renderPlanModal = () => {
    if (!selectedSubscription) return null;

    const plans = [
      { id: 'pro', name: 'Pro', description: 'Plan estándar con acceso ilimitado' },
      { id: 'pro-annual', name: 'Pro Anual', description: 'Plan anual con descuento' },
      { id: 'edu', name: 'Educación', description: 'Plan para instituciones educativas' },
      { id: 'team', name: 'Equipo', description: 'Plan para equipos de trabajo' }
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cambiar Plan de Suscripción
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Plan actual: <span className="font-medium">{selectedSubscription.plan}</span>
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seleccionar nuevo plan
                </label>
                <div className="mt-1 space-y-2">
                  {plans.map(plan => (
                    <div 
                      key={plan.id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedPlan === plan.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded-full border ${
                          selectedPlan === plan.id 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-400 bg-white dark:bg-gray-700'
                        }`}>
                          {selectedPlan === plan.id && (
                            <div className="h-2 w-2 m-1 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsPlanModalOpen(false)}
                  disabled={processingAction}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleChangePlan(selectedPlan)}
                  disabled={processingAction || selectedPlan === selectedSubscription.plan}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {processingAction ? 'Procesando...' : 'Cambiar Plan'}
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
          Gestión de Suscripciones
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
            <label htmlFor="statusFilter" className="sr-only">Filtrar por estado</label>
            <select
              id="statusFilter"
              name="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="canceled">Canceladas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
          
          <div className="w-full md:w-auto">
            <button
              onClick={fetchSubscriptions}
              className="w-full md:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
        
        {/* Tabla de suscripciones */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' ? 
                'No se encontraron suscripciones con los filtros aplicados.' : 
                'No hay suscripciones registradas.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha de Inicio
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fin del Período
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {subscription.user?.picture && (
                          <div className="flex-shrink-0 h-10 w-10">
                            <img className="h-10 w-10 rounded-full" src={subscription.user.picture} alt="" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {subscription.user?.name || 'Usuario Desconocido'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {subscription.user?.email || 'Email no disponible'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{subscription.plan}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {subscription.price_id ? `ID: ${subscription.price_id.substring(0, 8)}...` : 'Sin precio asociado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        subscription.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {subscription.status === 'active' ? 'Activa' :
                         subscription.status === 'canceled' ? 'Cancelada' : 'Expirada'}
                      </span>
                      {subscription.cancel_at_period_end && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Cancelación programada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(subscription.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(subscription.current_period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Modales */}
      {isModalOpen && renderSubscriptionModal()}
      {isRefundModalOpen && renderRefundModal()}
      {isPlanModalOpen && renderPlanModal()}
    </div>
  );
};