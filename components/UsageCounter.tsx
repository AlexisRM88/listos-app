import React, { useState, useEffect } from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import subscriptionClientService, { SubscriptionStatus } from '../services/subscriptionClientService';

interface UsageCounterProps {
  userProfile: {
    id: string;
    email: string;
    name: string;
    picture: string;
    idToken: string;
  };
  language: string;
  onUpgrade?: () => void;
}

export const UsageCounter: React.FC<UsageCounterProps> = ({
  userProfile,
  language,
  onUpgrade
}) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = language === 'Español';

  // Textos en ambos idiomas
  const T = {
    // Títulos
    usageTitle: isSpanish ? 'Uso de Documentos' : 'Document Usage',
    unlimited: isSpanish ? 'Ilimitado' : 'Unlimited',
    
    // Estados
    documentsUsed: isSpanish ? 'Documentos Usados' : 'Documents Used',
    documentsRemaining: isSpanish ? 'Documentos Restantes' : 'Documents Remaining',
    of: isSpanish ? 'de' : 'of',
    
    // Notificaciones
    limitReached: isSpanish ? '¡Límite Alcanzado!' : 'Limit Reached!',
    nearLimit: isSpanish ? '¡Cerca del Límite!' : 'Near Limit!',
    upgradeMessage: isSpanish ? 'Actualiza a Pro para acceso ilimitado' : 'Upgrade to Pro for unlimited access',
    oneDocumentLeft: isSpanish ? 'Solo te queda 1 documento gratuito' : 'Only 1 free document left',
    
    // Botones
    upgradeNow: isSpanish ? 'Actualizar Ahora' : 'Upgrade Now',
    
    // Estados de carga
    loadingUsage: isSpanish ? 'Cargando uso...' : 'Loading usage...',
    errorLoading: isSpanish ? 'Error al cargar el uso' : 'Error loading usage',
  };

  // Cargar estado de suscripción y uso
  useEffect(() => {
    const loadUsageData = async () => {
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
        setError(T.errorLoading);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsageData();
  }, [userProfile?.idToken, T.errorLoading]);

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-slate-600 dark:text-slate-300 text-sm">{T.loadingUsage}</span>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-red-500">⚠️</div>
          <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus) return null;

  // Calcular datos de uso
  const isProUser = subscriptionStatus.isPro && subscriptionStatus.isActive;
  const currentUsage = subscriptionStatus.usage.current;
  const usageLimit = subscriptionStatus.usage.limit;
  const remainingUses = subscriptionClientService.getRemainingDocuments(subscriptionStatus);
  
  // Determinar el estado de la notificación
  const isAtLimit = !isProUser && remainingUses === 0;
  const isNearLimit = !isProUser && remainingUses === 1;
  
  // Calcular porcentaje de uso para usuarios gratuitos
  const usagePercentage = isProUser ? 0 : Math.min((currentUsage / usageLimit) * 100, 100);

  // No mostrar para usuarios Pro (ya tienen acceso ilimitado)
  if (isProUser) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-green-800 dark:text-green-200 text-sm">
              {T.usageTitle}
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              {T.unlimited}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Componente para usuarios gratuitos
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <ClockIcon className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-2">
              {T.usageTitle}
            </h3>
            
            {/* Barra de progreso */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>{currentUsage} {T.of} {usageLimit} {T.documentsUsed.toLowerCase()}</span>
                <span>{remainingUses} {T.documentsRemaining.toLowerCase()}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isAtLimit 
                      ? 'bg-red-500' 
                      : isNearLimit 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Notificaciones */}
            {isAtLimit && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500 text-sm">🚫</span>
                  <div>
                    <p className="text-red-800 dark:text-red-200 text-xs font-medium">
                      {T.limitReached}
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-xs">
                      {T.upgradeMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isNearLimit && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500 text-sm">⚠️</span>
                  <div>
                    <p className="text-yellow-800 dark:text-yellow-200 text-xs font-medium">
                      {T.nearLimit}
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                      {T.oneDocumentLeft}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón de actualización */}
        {(isAtLimit || isNearLimit) && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0"
          >
            {T.upgradeNow}
          </button>
        )}
      </div>
    </div>
  );
};