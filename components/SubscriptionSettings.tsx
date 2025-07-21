import React, { useState, useEffect } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClockIcon } from './icons/ClockIcon';
import subscriptionClientService, { SubscriptionStatus } from '../services/subscriptionClientService';

interface SubscriptionSettingsProps {
  userProfile: {
    id: string;
    email: string;
    name: string;
    picture: string;
    idToken: string;
  };
  language: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

export const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({
  userProfile,
  language,
  onClose,
  onUpgrade
}) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSpanish = language === 'Español';

  // Textos en ambos idiomas
  const T = {
    // Títulos y encabezados
    title: isSpanish ? 'Configuración de Suscripción' : 'Subscription Settings',
    currentPlan: isSpanish ? 'Plan Actual' : 'Current Plan',
    planDetails: isSpanish ? 'Detalles del Plan' : 'Plan Details',
    billingInfo: isSpanish ? 'Información de Facturación' : 'Billing Information',
    usage: isSpanish ? 'Uso' : 'Usage',
    
    // Estados de plan
    freePlan: isSpanish ? 'Plan Gratuito' : 'Free Plan',
    proPlan: isSpanish ? 'Plan Pro' : 'Pro Plan',
    activeStatus: isSpanish ? 'Activo' : 'Active',
    canceledStatus: isSpanish ? 'Cancelado' : 'Canceled',
    expiredStatus: isSpanish ? 'Expirado' : 'Expired',
    
    // Información de facturación
    nextBilling: isSpanish ? 'Próxima facturación' : 'Next billing',
    cancelDate: isSpanish ? 'Se cancela el' : 'Cancels on',
    monthlyPrice: isSpanish ? '$9.99/mes' : '$9.99/month',
    
    // Uso y límites
    documentsGenerated: isSpanish ? 'Documentos generados' : 'Documents generated',
    unlimited: isSpanish ? 'Ilimitado' : 'Unlimited',
    remaining: isSpanish ? 'restantes' : 'remaining',
    
    // Beneficios
    benefits: isSpanish ? 'Beneficios incluidos' : 'Included benefits',
    unlimitedDocs: isSpanish ? 'Documentos ilimitados' : 'Unlimited documents',
    cloudSync: isSpanish ? 'Sincronización en la nube' : 'Cloud synchronization',
    prioritySupport: isSpanish ? 'Soporte prioritario' : 'Priority support',
    advancedAI: isSpanish ? 'IA avanzada de Google' : 'Advanced Google AI',
    
    // Botones de acción
    upgradeButton: isSpanish ? 'Actualizar a Pro' : 'Upgrade to Pro',
    cancelButton: isSpanish ? 'Cancelar Suscripción' : 'Cancel Subscription',
    reactivateButton: isSpanish ? 'Reactivar Suscripción' : 'Reactivate Subscription',
    closeButton: isSpanish ? 'Cerrar' : 'Close',
    
    // Confirmación de cancelación
    cancelConfirmTitle: isSpanish ? 'Confirmar Cancelación' : 'Confirm Cancellation',
    cancelConfirmMessage: isSpanish 
      ? '¿Estás seguro de que quieres cancelar tu suscripción Pro? Perderás el acceso a las funciones premium al final del período actual.'
      : 'Are you sure you want to cancel your Pro subscription? You will lose access to premium features at the end of the current period.',
    cancelConfirmButton: isSpanish ? 'Sí, Cancelar' : 'Yes, Cancel',
    cancelKeepButton: isSpanish ? 'Mantener Suscripción' : 'Keep Subscription',
    
    // Estados de procesamiento
    processing: isSpanish ? 'Procesando...' : 'Processing...',
    canceling: isSpanish ? 'Cancelando...' : 'Canceling...',
    reactivating: isSpanish ? 'Reactivando...' : 'Reactivating...',
    
    // Mensajes de estado
    loadingStatus: isSpanish ? 'Cargando información...' : 'Loading information...',
    errorLoading: isSpanish ? 'Error al cargar la información' : 'Error loading information',
    cancelSuccess: isSpanish ? 'Suscripción cancelada exitosamente' : 'Subscription canceled successfully',
    reactivateSuccess: isSpanish ? 'Suscripción reactivada exitosamente' : 'Subscription reactivated successfully',
    
    // Información adicional
    cancelNote: isSpanish 
      ? 'Tu suscripción permanecerá activa hasta el final del período de facturación actual.'
      : 'Your subscription will remain active until the end of the current billing period.',
    reactivateNote: isSpanish
      ? 'Tu suscripción se reactivará inmediatamente y continuará con el ciclo de facturación normal.'
      : 'Your subscription will be reactivated immediately and continue with normal billing cycle.',
  };

  // Cargar estado de suscripción
  const loadSubscriptionStatus = async (isRefresh = false) => {
    if (!userProfile?.idToken) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
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
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, [userProfile?.idToken]);

  // Manejar cancelación de suscripción
  const handleCancelSubscription = async () => {
    if (!userProfile?.idToken) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await subscriptionClientService.cancelSubscription(userProfile.idToken);
      if (result.success) {
        // Recargar estado de suscripción
        const statusResult = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
        if (statusResult.success && statusResult.data) {
          setSubscriptionStatus(statusResult.data);
        }
        setShowCancelConfirm(false);
        // Mostrar mensaje de éxito con información adicional
        const cancelDate = result.cancelAt ? subscriptionClientService.formatPeriodEndDate(result.cancelAt) : '';
        setError(`${T.cancelSuccess}${cancelDate ? ` Tu acceso Pro continuará hasta el ${cancelDate}.` : ''}`);
      } else {
        setError(result.error || 'Error al cancelar la suscripción');
      }
    } catch (err) {
      setError('Error al cancelar la suscripción');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejar reactivación de suscripción
  const handleReactivateSubscription = async () => {
    if (!userProfile?.idToken) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await subscriptionClientService.reactivateSubscription(userProfile.idToken);
      if (result.success) {
        // Recargar estado de suscripción
        const statusResult = await subscriptionClientService.getSubscriptionStatus(userProfile.idToken);
        if (statusResult.success && statusResult.data) {
          setSubscriptionStatus(statusResult.data);
        }
        setError(T.reactivateSuccess);
      } else {
        setError(result.error || 'Error al reactivar la suscripción');
      }
    } catch (err) {
      setError('Error al reactivar la suscripción');
    } finally {
      setIsProcessing(false);
    }
  };

  // Obtener información del plan actual
  const getPlanInfo = () => {
    if (!subscriptionStatus) return null;

    const isProUser = subscriptionStatus.isPro && subscriptionStatus.isActive;
    const isSubscriptionEnding = subscriptionStatus.subscription?.cancelAtPeriodEnd;
    
    return {
      name: isProUser ? T.proPlan : T.freePlan,
      status: isProUser 
        ? (isSubscriptionEnding ? T.canceledStatus : T.activeStatus)
        : T.activeStatus,
      price: isProUser ? T.monthlyPrice : '$0',
      isProUser,
      isSubscriptionEnding
    };
  };

  const planInfo = getPlanInfo();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl m-4 transform transition-all max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mr-4">
                <SparklesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{T.title}</h2>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">{userProfile.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadSubscriptionStatus(true)}
                disabled={refreshing || isLoading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isSpanish ? 'Actualizar información' : 'Refresh information'}
              >
                <svg className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">{T.loadingStatus}</p>
            </div>
          )}

          {/* Error/Success Message */}
          {error && (
            <div className={`border-l-4 rounded-lg p-4 ${
              error.includes(T.cancelSuccess) || error === T.reactivateSuccess
                ? 'bg-green-50 dark:bg-green-900/20 border-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border-red-400'
            }`}>
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${
                  error.includes(T.cancelSuccess) || error === T.reactivateSuccess
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {error.includes(T.cancelSuccess) || error === T.reactivateSuccess ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`font-medium ${
                    error.includes(T.cancelSuccess) || error === T.reactivateSuccess
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {error}
                  </p>
                  {!error.includes(T.cancelSuccess) && error !== T.reactivateSuccess && (
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                    >
                      {isSpanish ? 'Cerrar' : 'Dismiss'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Details */}
          {!isLoading && subscriptionStatus && planInfo && (
            <>
              {/* Current Plan Section */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{T.currentPlan}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan Info */}
                  <div>
                    <div className="flex items-center mb-3">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{planInfo.name}</h4>
                      <span className={`ml-3 px-3 py-1 text-xs font-medium rounded-full ${
                        planInfo.isProUser 
                          ? planInfo.isSubscriptionEnding
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}>
                        {planInfo.status}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{planInfo.price}</p>
                    
                    {/* Billing Information */}
                    {planInfo.isProUser && subscriptionStatus.subscription && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {planInfo.isSubscriptionEnding ? (
                          <>
                            <p className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-2 text-yellow-500" />
                              {T.cancelDate}: {subscriptionClientService.formatPeriodEndDate(subscriptionStatus.subscription.currentPeriodEnd)}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                              {isSpanish ? 'Acceso Pro hasta esta fecha' : 'Pro access until this date'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p>{T.nextBilling}: {subscriptionClientService.formatPeriodEndDate(subscriptionStatus.subscription.currentPeriodEnd)}</p>
                            <p className="text-xs">
                              {isSpanish ? 'Renovación automática' : 'Auto-renewal'}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Usage Info */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">{T.usage}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">{T.documentsGenerated}:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {subscriptionStatus.usage.unlimited 
                            ? T.unlimited 
                            : `${subscriptionStatus.usage.current}/${subscriptionStatus.usage.limit}`
                          }
                        </span>
                      </div>
                      {!subscriptionStatus.usage.unlimited && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">{T.remaining}:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {Math.max(0, subscriptionStatus.usage.limit - subscriptionStatus.usage.current)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits Section */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{T.benefits}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 flex-shrink-0 mt-1 ${
                      planInfo.isProUser ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm ${
                      planInfo.isProUser ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {T.unlimitedDocs}
                    </span>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 flex-shrink-0 mt-1 ${
                      planInfo.isProUser ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm ${
                      planInfo.isProUser ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {T.cloudSync}
                    </span>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 flex-shrink-0 mt-1 ${
                      planInfo.isProUser ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm ${
                      planInfo.isProUser ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {T.prioritySupport}
                    </span>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 flex-shrink-0 mt-1 ${
                      planInfo.isProUser ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm ${
                      planInfo.isProUser ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {T.advancedAI}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {!planInfo.isProUser ? (
                  // Upgrade button for free users
                  <button
                    onClick={onUpgrade}
                    className="w-full py-4 font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-lg"
                  >
                    <SparklesIcon className="h-5 w-5 mr-3" />
                    {T.upgradeButton}
                  </button>
                ) : (
                  // Cancel/Reactivate buttons for Pro users
                  <div className="space-y-3">
                    {planInfo.isSubscriptionEnding ? (
                      <>
                        <button
                          onClick={handleReactivateSubscription}
                          disabled={isProcessing}
                          className="w-full py-3 font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                        >
                          {isProcessing ? (
                            <>
                              <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                              {T.reactivating}
                            </>
                          ) : (
                            T.reactivateButton
                          )}
                        </button>
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                          {T.reactivateNote}
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={isProcessing}
                          className="w-full py-3 font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          {T.cancelButton}
                        </button>
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                          {T.cancelNote}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {T.closeButton}
          </button>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{T.cancelConfirmTitle}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{T.cancelConfirmMessage}</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-4 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {T.cancelKeepButton}
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-4 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      {T.canceling}
                    </>
                  ) : (
                    T.cancelConfirmButton
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};