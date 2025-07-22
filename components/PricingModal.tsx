import React, { useState, useEffect } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClockIcon } from './icons/ClockIcon';
import { getPricingConfig } from '../services/paymentService';
import errorHandlingService, { ErrorType } from '../services/errorHandlingService';

interface PricingModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  language: string;
  isProcessing?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ 
  onClose, 
  onUpgrade, 
  language, 
  isProcessing = false,
  error,
  onRetry
}) => {
  const [showDetailedBenefits, setShowDetailedBenefits] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<{
    priceId: string;
    amount: number;
    currency: string;
    interval: string;
    product: {
      name: string;
      description: string;
    };
  } | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const isSpanish = language === 'Español';
  
  // Cargar configuración de precios desde el servidor con manejo de errores mejorado
  useEffect(() => {
    const loadPricingConfig = async () => {
      setLoadingPricing(true);
      try {
        // Usar el servicio de manejo de errores con reintentos automáticos
        const result = await errorHandlingService.withRetry(
          async () => await getPricingConfig(),
          { maxRetries: 2, initialDelayMs: 500 }
        );
        
        if (result.success && result.config) {
          setPricingConfig(result.config);
        } else if (result.error) {
          // Registrar el error formateado
          const formattedError = errorHandlingService.formatError(result.error);
          console.error('Error loading pricing configuration:', formattedError);
        }
      } catch (err) {
        // Manejar cualquier error no capturado por getPricingConfig
        const formattedError = errorHandlingService.formatError(err);
        console.error('Error loading pricing configuration:', formattedError);
      } finally {
        setLoadingPricing(false);
      }
    };
    
    loadPricingConfig();
  }, []);
  
  // Enhanced error categorization for better user experience using our error handling service
  const getErrorType = (errorMessage: string | null | undefined): 'network' | 'payment' | 'auth' | 'server' | 'generic' => {
    if (!errorMessage) return 'generic';
    
    // Use our error handling service to determine the error type
    if (errorHandlingService.isErrorOfType(errorMessage, ErrorType.NETWORK)) {
      return 'network';
    }
    if (errorHandlingService.isErrorOfType(errorMessage, ErrorType.PAYMENT)) {
      return 'payment';
    }
    if (errorHandlingService.isErrorOfType(errorMessage, ErrorType.AUTHENTICATION) || 
        errorHandlingService.isErrorOfType(errorMessage, ErrorType.AUTHORIZATION)) {
      return 'auth';
    }
    if (errorHandlingService.isErrorOfType(errorMessage, ErrorType.SERVER)) {
      return 'server';
    }
    
    // Fallback to the previous implementation for backward compatibility
    const msg = errorMessage.toLowerCase();
    if (msg.includes('conexión') || msg.includes('connection') || msg.includes('network') || msg.includes('internet')) {
      return 'network';
    }
    if (msg.includes('tarjeta') || msg.includes('card') || msg.includes('payment') || msg.includes('stripe')) {
      return 'payment';
    }
    if (msg.includes('sesión') || msg.includes('session') || msg.includes('auth') || msg.includes('login')) {
      return 'auth';
    }
    if (msg.includes('servidor') || msg.includes('server') || msg.includes('500') || msg.includes('503')) {
      return 'server';
    }
    return 'generic';
  };

  const errorType = getErrorType(error);
  
  const T = {
    title: isSpanish ? 'Desbloquea todo el potencial de ListosApp' : 'Unlock ListosApp\'s Full Potential',
    subtitle: isSpanish ? 'Has usado tus 2 documentos gratuitos. Actualiza a Pro para crear contenido ilimitado y acceder a funciones exclusivas.' : 'You\'ve used your 2 free documents. Upgrade to Pro for unlimited content creation and exclusive features.',
    
    // Plan information
    currentPlan: isSpanish ? 'Tu plan actual' : 'Your current plan',
    trialPlan: isSpanish ? 'Plan Gratuito' : 'Free Plan',
    trialDesc: isSpanish ? '2 de 2 documentos usados' : '2 of 2 documents used',
    trialLimitation: isSpanish ? 'Límite alcanzado' : 'Limit reached',
    
    proPlan: isSpanish ? 'Plan Pro' : 'Pro Plan',
    proPrice: isSpanish ? '$9.99' : '$9.99',
    proPeriod: isSpanish ? 'por mes' : 'per month',
    proDesc: isSpanish ? 'Perfecto para educadores profesionales' : 'Perfect for professional educators',
    
    // Enhanced detailed benefits
    unlimited: isSpanish ? 'Documentos ilimitados' : 'Unlimited documents',
    unlimitedDesc: isSpanish ? 'Genera tantos trabajos, exámenes y actividades como necesites, sin restricciones' : 'Generate as many worksheets, exams, and activities as you need, without restrictions',
    
    cloudSync: isSpanish ? 'Sincronización en la nube' : 'Cloud synchronization',
    cloudSyncDesc: isSpanish ? 'Accede a tus documentos desde cualquier dispositivo, siempre actualizados' : 'Access your documents from any device, always up to date',
    
    advancedAI: isSpanish ? 'IA avanzada de Google' : 'Advanced Google AI',
    advancedAIDesc: isSpanish ? 'Contenido de máxima calidad generado con Gemini AI de última generación' : 'Highest quality content generated with cutting-edge Gemini AI',
    
    multiLanguage: isSpanish ? 'Soporte multiidioma' : 'Multi-language support',
    multiLanguageDesc: isSpanish ? 'Crea contenido en español, inglés y más idiomas próximamente' : 'Create content in Spanish, English, and more languages coming soon',
    
    prioritySupport: isSpanish ? 'Soporte prioritario' : 'Priority support',
    prioritySupportDesc: isSpanish ? 'Asistencia técnica rápida y personalizada cuando la necesites' : 'Fast and personalized technical assistance when you need it',
    
    exportOptions: isSpanish ? 'Opciones de exportación' : 'Export options',
    exportOptionsDesc: isSpanish ? 'Descarga en PDF, Word y otros formatos para máxima flexibilidad' : 'Download in PDF, Word, and other formats for maximum flexibility',
    
    // Value proposition
    valueProposition: isSpanish ? '¿Por qué elegir Pro?' : 'Why choose Pro?',
    timeValue: isSpanish ? 'Ahorra 5+ horas semanales' : 'Save 5+ hours weekly',
    timeValueDesc: isSpanish ? 'en preparación de materiales' : 'on material preparation',
    qualityValue: isSpanish ? 'Contenido de calidad profesional' : 'Professional quality content',
    qualityValueDesc: isSpanish ? 'adaptado a tu currículo' : 'adapted to your curriculum',
    
    // Buttons and actions
    upgradeButton: isSpanish ? 'Actualizar a Pro ahora' : 'Upgrade to Pro now',
    processingButton: isSpanish ? 'Procesando pago...' : 'Processing payment...',
    retryButton: isSpanish ? 'Reintentar pago' : 'Retry payment',
    closeButton: isSpanish ? 'Tal vez más tarde' : 'Maybe later',
    showMoreBenefits: isSpanish ? 'Ver todos los beneficios' : 'See all benefits',
    showLessBenefits: isSpanish ? 'Ver menos' : 'Show less',
    
    // Security and guarantee
    securePayment: isSpanish ? 'Pago 100% seguro' : '100% secure payment',
    stripeSecured: isSpanish ? 'Protegido por Stripe' : 'Secured by Stripe',
    cancelAnytime: isSpanish ? 'Cancela cuando quieras' : 'Cancel anytime',
    noCommitment: isSpanish ? 'Sin compromiso' : 'No commitment',
    moneyBack: isSpanish ? 'Garantía de 30 días' : '30-day guarantee',
    
    // Enhanced error messages with specific solutions
    errorTitle: isSpanish ? 'Problema con el pago' : 'Payment issue',
    networkErrorTitle: isSpanish ? 'Error de conexión' : 'Connection error',
    networkErrorMsg: isSpanish ? 'No se pudo conectar con el servidor de pagos. Verifica tu conexión a internet e intenta nuevamente.' : 'Could not connect to payment server. Check your internet connection and try again.',
    networkErrorSolution: isSpanish ? 'Solución: Verifica tu WiFi o datos móviles' : 'Solution: Check your WiFi or mobile data',
    
    paymentErrorTitle: isSpanish ? 'Error en el procesamiento' : 'Processing error',
    paymentErrorMsg: isSpanish ? 'Hubo un problema al procesar tu pago. Tu tarjeta no fue cargada.' : 'There was a problem processing your payment. Your card was not charged.',
    paymentErrorSolution: isSpanish ? 'Solución: Verifica los datos de tu tarjeta' : 'Solution: Check your card details',
    
    authErrorTitle: isSpanish ? 'Sesión expirada' : 'Session expired',
    authErrorMsg: isSpanish ? 'Tu sesión ha expirado. Por favor, cierra este modal e inicia sesión nuevamente.' : 'Your session has expired. Please close this modal and sign in again.',
    authErrorSolution: isSpanish ? 'Solución: Inicia sesión nuevamente' : 'Solution: Sign in again',
    
    serverErrorTitle: isSpanish ? 'Error del servidor' : 'Server error',
    serverErrorMsg: isSpanish ? 'Nuestros servidores están experimentando problemas temporales. Intenta nuevamente en unos minutos.' : 'Our servers are experiencing temporary issues. Please try again in a few minutes.',
    serverErrorSolution: isSpanish ? 'Solución: Intenta en unos minutos' : 'Solution: Try again in a few minutes',
    
    genericErrorTitle: isSpanish ? 'Error inesperado' : 'Unexpected error',
    genericErrorMsg: isSpanish ? 'Ocurrió un error inesperado. Si el problema persiste, contacta nuestro soporte.' : 'An unexpected error occurred. If the problem persists, contact our support.',
    genericErrorSolution: isSpanish ? 'Solución: Contacta soporte si persiste' : 'Solution: Contact support if it persists',
    
    // Success states
    redirecting: isSpanish ? 'Redirigiendo al pago seguro...' : 'Redirecting to secure payment...',
    redirectingDesc: isSpanish ? 'Te llevaremos a Stripe para completar tu pago de forma segura' : 'We\'ll take you to Stripe to complete your payment securely'
  };

  // Get error-specific content
  const getErrorContent = () => {
    const errorTitles = {
      network: T.networkErrorTitle,
      payment: T.paymentErrorTitle,
      auth: T.authErrorTitle,
      server: T.serverErrorTitle,
      generic: T.genericErrorTitle
    };

    const errorMessages = {
      network: T.networkErrorMsg,
      payment: T.paymentErrorMsg,
      auth: T.authErrorMsg,
      server: T.serverErrorMsg,
      generic: T.genericErrorMsg
    };

    const errorSolutions = {
      network: T.networkErrorSolution,
      payment: T.paymentErrorSolution,
      auth: T.authErrorSolution,
      server: T.serverErrorSolution,
      generic: T.genericErrorSolution
    };

    return {
      title: errorTitles[errorType],
      message: errorMessages[errorType],
      solution: errorSolutions[errorType]
    };
  };

  const errorContent = error ? getErrorContent() : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={!isProcessing ? onClose : undefined}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl m-4 transform transition-all max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Enhanced Header */}
        <div className="p-6 sm:p-8 text-center border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mr-3">
              <SparklesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{T.title}</h2>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">{T.currentPlan}</p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">{T.subtitle}</p>
        </div>
        
        <div className="px-6 sm:px-8 pb-8 space-y-6">
          {/* Enhanced Error Message */}
          {error && errorContent && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 rounded-lg p-5 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{errorContent.title}</h3>
                  <p className="text-red-700 dark:text-red-300 mt-2 leading-relaxed">{errorContent.message}</p>
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-800/30 rounded-md">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorContent.solution}</p>
                  </div>
                  {error && (
                    <details className="mt-3">
                      <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                        {isSpanish ? 'Ver detalles técnicos' : 'View technical details'}
                      </summary>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono bg-red-100 dark:bg-red-800/20 p-2 rounded">{error}</p>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && !error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 text-center">
              <div className="flex items-center justify-center mb-3">
                <ClockIcon className="h-6 w-6 text-blue-500 mr-3 animate-spin" />
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">{T.redirecting}</h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300">{T.redirectingDesc}</p>
            </div>
          )}

          {/* Enhanced Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Free Plan */}
            <div className="border-2 border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 relative">
              <div className="absolute top-3 right-3">
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium px-2 py-1 rounded-full">
                  {T.trialLimitation}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{T.trialPlan}</h3>
              <p className="text-2xl font-bold text-slate-500 mb-1">$0</p>
              <p className="text-sm text-slate-500 mb-4">{T.trialDesc}</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="h-4 w-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isSpanish ? 'Solo 2 documentos' : 'Only 2 documents'}
                </div>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="h-4 w-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isSpanish ? 'Sin historial' : 'No history'}
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-blue-500 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 relative shadow-lg">
              <div className="absolute top-3 right-3">
                <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {isSpanish ? 'Recomendado' : 'Recommended'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">
                {pricingConfig?.product?.name || T.proPlan}
              </h3>
              <div className="flex items-baseline mb-1">
                {loadingPricing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-slate-500">...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {pricingConfig ? 
                        `${pricingConfig.currency === 'usd' ? '$' : pricingConfig.currency}${(pricingConfig.amount / 100).toFixed(2)}` : 
                        T.proPrice}
                    </p>
                    <span className="text-sm text-slate-500 ml-2">
                      {pricingConfig ? 
                        `/${pricingConfig.interval}` : 
                        T.proPeriod}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {pricingConfig?.product?.description || T.proDesc}
              </p>
            </div>
          </div>

          {/* Enhanced Benefits Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">{T.valueProposition}</h3>
            
            {/* Core Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{T.timeValue}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{T.timeValueDesc}</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{T.qualityValue}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{T.qualityValueDesc}</div>
              </div>
            </div>

            {/* Detailed Benefits List */}
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{T.unlimited}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{T.unlimitedDesc}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{T.cloudSync}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{T.cloudSyncDesc}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{T.advancedAI}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{T.advancedAIDesc}</div>
                </div>
              </div>

              {/* Additional benefits - shown when expanded */}
              {showDetailedBenefits && (
                <>
                  <div className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{T.multiLanguage}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{T.multiLanguageDesc}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{T.prioritySupport}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{T.prioritySupportDesc}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{T.exportOptions}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{T.exportOptionsDesc}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Show More/Less Button */}
            <button
              onClick={() => setShowDetailedBenefits(!showDetailedBenefits)}
              className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
            >
              {showDetailedBenefits ? T.showLessBenefits : T.showMoreBenefits}
            </button>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="space-y-4">
            {error && onRetry ? (
              <button 
                onClick={onRetry}
                disabled={isProcessing}
                className="w-full py-4 font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-lg"
              >
                {isProcessing ? (
                  <>
                    <ClockIcon className="h-5 w-5 mr-3 animate-spin" />
                    {T.processingButton}
                  </>
                ) : (
                  T.retryButton
                )}
              </button>
            ) : (
              <button 
                onClick={onUpgrade}
                disabled={isProcessing}
                className="w-full py-4 font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-lg"
              >
                {isProcessing ? (
                  <>
                    <ClockIcon className="h-5 w-5 mr-3 animate-spin" />
                    {T.processingButton}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5 mr-3" />
                    {T.upgradeButton}
                  </>
                )}
              </button>
            )}

            {/* Enhanced Security and Trust Indicators */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="h-4 w-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {T.stripeSecured}
                </div>
                <div className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {T.cancelAnytime}
                </div>
                <div className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400">
                  <svg className="h-4 w-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {T.moneyBack}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-3 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {T.closeButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};