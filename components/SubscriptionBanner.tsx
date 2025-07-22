import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ClockIcon } from './icons/ClockIcon';
import subscriptionClientService, { SubscriptionStatus } from '../services/subscriptionClientService';

interface SubscriptionBannerProps {
  userProfile: {
    id: string;
    email: string;
    name: string;
    picture: string;
    idToken: string;
  };
  language: string;
  onUpgrade: () => void;
  onManageSubscription?: () => void;
  documentGenerated?: number; // Counter that increments when a document is generated
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  userProfile,
  language,
  onUpgrade,
  onManageSubscription,
  documentGenerated = 0
}) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = language === 'Español';

  // Textos en ambos idiomas
  const T = {
    // Estados de suscripción
    proActive: isSpanish ? 'Plan Pro Activo' : 'Pro Plan Active',
    freeUser: isSpanish ? 'Usuario Gratuito' : 'Free User',
    subscriptionEnding: isSpanish ? 'Suscripción Terminando' : 'Subscription Ending',
    
    // Beneficios
    unlimitedGenerations: isSpanish ? 'Generaciones ilimitadas' : 'Unlimited generations',
    prioritySupport: isSpanish ? 'Soporte prioritario' : 'Priority support',
    saveDocuments: isSpanish ? 'Guardar documentos' : 'Save documents',
    remainingDocs: isSpanish ? 'documentos restantes' : 'documents remaining',
    
    // Botones de acción
    upgradeNow: isSpanish ? 'Actualizar Ahora' : 'Upgrade Now',
    manageSubscription: isSpanish ? 'Gestionar Suscripción' : 'Manage Subscription',
    reactivate: isSpanish ? 'Reactivar' : 'Reactivate',
    
    // Mensajes
    loadingStatus: isSpanish ? 'Cargando estado...' : 'Loading status...',
    errorLoading: isSpanish ? 'Error al cargar el estado' : 'Error loading status',
    willCancelOn: isSpanish ? 'Se cancelará el' : 'Will cancel on',
    enjoyPro: isSpanish ? '¡Disfruta de todos los beneficios Pro!' : 'Enjoy all Pro benefits!',
    upgradeMessage: isSpanish ? 'Actualiza para acceso ilimitado' : 'Upgrade for unlimited access',
  };

  // Cargar estado de suscripción
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (!userProfile?.idToken) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
        if (result.success && result.data) {
          setSubscriptionStatus(result.data);
        } else {
          setError(result.error || T.errorLoading);
        }
      } catch (err) {
        console.error('Error loading subscription status:', err);
        setError(T.errorLoading);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();
    
    // Configurar intervalo para actualizar el estado cada 5 minutos
    // Esto asegura que los cambios en la suscripción se reflejen sin recargar la página
    const intervalId = setInterval(loadSubscriptionStatus, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [userProfile?.idToken, T.errorLoading]);
  
  // Actualizar cuando se genera un nuevo documento
  useEffect(() => {
    if (documentGenerated > 0 && userProfile?.idToken) {
      const updateAfterGeneration = async () => {
        try {
          const result = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
          if (result.success && result.data) {
            setSubscriptionStatus(result.data);
          }
        } catch (err) {
          console.error('Error updating subscription after document generation:', err);
          // No mostramos error aquí para no interrumpir la experiencia del usuario
        }
      };
      
      // Pequeño retraso para asegurar que el servidor ha procesado el nuevo documento
      const timeoutId = setTimeout(updateAfterGeneration, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [documentGenerated, userProfile?.idToken]);

  // Manejar reactivación de suscripción
  const handleReactivate = async () => {
    if (!userProfile?.idToken) return;
    
    // Mostrar estado de carga durante la reactivación
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await subscriptionClientService.reactivateSubscription(userProfile.idToken);
      if (result.success) {
        // Recargar estado de suscripción
        const statusResult = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
        if (statusResult.success && statusResult.data) {
          setSubscriptionStatus(statusResult.data);
        } else {
          setError(statusResult.error || 'Error al verificar estado de suscripción');
        }
      } else {
        setError(result.error || 'Error al reactivar la suscripción');
      }
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      setError('Error al reactivar la suscripción. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para reintentar cargar el estado de suscripción
  const handleRetry = async () => {
    if (!userProfile?.idToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
      if (result.success && result.data) {
        setSubscriptionStatus(result.data);
      } else {
        setError(result.error || T.errorLoading);
      }
    } catch (err) {
      console.error('Error retrying subscription status load:', err);
      setError(T.errorLoading);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border border-blue-200 dark:border-slate-600 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-slate-600 dark:text-slate-300">{T.loadingStatus}</span>
        </div>
      </div>
    );
  }

  // Mostrar error con opción de reintentar
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-red-500">⚠️</div>
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
          <button 
            onClick={handleRetry}
            className="text-xs text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
          >
            {isSpanish ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus) return null;

  // Determinar el tipo de banner a mostrar
  const isProUser = subscriptionStatus.isPro && subscriptionStatus.isActive;
  const isSubscriptionEnding = subscriptionStatus.subscription?.cancelAtPeriodEnd;
  const remainingDocs = subscriptionClientService.getRemainingDocuments(subscriptionStatus);

  // Banner para usuario Pro activo
  if (isProUser && !isSubscriptionEnding) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center">
                {T.proActive}
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">
                  PRO
                </span>
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {T.enjoyPro}
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.unlimitedGenerations}
                </div>
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.prioritySupport}
                </div>
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.saveDocuments}
                </div>
              </div>
            </div>
          </div>
          {onManageSubscription && (
            <button
              onClick={onManageSubscription}
              className="px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 border border-green-300 dark:border-green-600 rounded-md hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
            >
              {T.manageSubscription}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Banner para suscripción que se cancela
  if (isProUser && isSubscriptionEnding && subscriptionStatus.subscription) {
    const endDate = subscriptionClientService.formatPeriodEndDate(subscriptionStatus.subscription.currentPeriodEnd);
    
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                {T.subscriptionEnding}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {T.willCancelOn} {endDate}
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.unlimitedGenerations}
                </div>
                <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.prioritySupport}
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleReactivate}
              className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
            >
              {T.reactivate}
            </button>
            {onManageSubscription && (
              <button
                onClick={onManageSubscription}
                className="px-3 py-1 text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 border border-yellow-300 dark:border-yellow-600 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-800/30 transition-colors"
              >
                {T.manageSubscription}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Banner para usuario gratuito
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border border-blue-200 dark:border-slate-600 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <SparklesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center">
              {T.freeUser}
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                FREE
              </span>
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {remainingDocs > 0 
                ? `${remainingDocs} ${T.remainingDocs}` 
                : T.upgradeMessage
              }
            </p>
            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="font-medium mb-1">
                {isSpanish ? 'Con Pro obtienes:' : 'With Pro you get:'}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.unlimitedGenerations}
                </div>
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.prioritySupport}
                </div>
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {T.saveDocuments}
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
        >
          {T.upgradeNow}
        </button>
      </div>
    </div>
  );
};