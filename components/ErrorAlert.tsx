
import React from 'react';
import errorHandlingService, { ErrorType } from '../services/errorHandlingService';

interface ErrorAlertProps {
  message: string | Error | unknown;
  language: string;
  onClose: () => void;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  message, 
  language, 
  onClose, 
  onRetry,
  type: explicitType 
}) => {
  // Procesar el mensaje para asegurar que sea una cadena de texto
  const processedMessage = typeof message === 'string' 
    ? message 
    : errorHandlingService.getUserFriendlyMessage(message);
  
  // Determinar el tipo de alerta basado en el contenido o el tipo explícito
  const isError = explicitType === 'error' || 
    (explicitType === undefined && processedMessage.toLowerCase().includes('error'));
  const isWarning = explicitType === 'warning';
  const isSuccess = explicitType === 'success';
  
  // Determinar colores basados en el tipo
  let bgColor, borderColor, textColor, strongTextColor, iconColor;
  
  if (isError) {
    bgColor = 'bg-red-100 dark:bg-red-900/50';
    borderColor = 'border-red-400 dark:border-red-700';
    textColor = 'text-red-800 dark:text-red-300';
    strongTextColor = 'text-red-900 dark:text-red-200';
    iconColor = 'text-red-500 dark:text-red-400';
  } else if (isWarning) {
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/50';
    borderColor = 'border-yellow-400 dark:border-yellow-700';
    textColor = 'text-yellow-800 dark:text-yellow-300';
    strongTextColor = 'text-yellow-900 dark:text-yellow-200';
    iconColor = 'text-yellow-500 dark:text-yellow-400';
  } else if (isSuccess) {
    bgColor = 'bg-green-100 dark:bg-green-900/50';
    borderColor = 'border-green-400 dark:border-green-700';
    textColor = 'text-green-800 dark:text-green-300';
    strongTextColor = 'text-green-900 dark:text-green-200';
    iconColor = 'text-green-500 dark:text-green-400';
  } else {
    bgColor = 'bg-blue-100 dark:bg-blue-900/50';
    borderColor = 'border-blue-400 dark:border-blue-700';
    textColor = 'text-blue-800 dark:text-blue-300';
    strongTextColor = 'text-blue-900 dark:text-blue-200';
    iconColor = 'text-blue-500 dark:text-blue-400';
  }

  // Determinar título basado en el tipo y el idioma
  let title;
  if (isError) {
    title = language === 'Inglés' ? 'Error' : 'Error';
  } else if (isWarning) {
    title = language === 'Inglés' ? 'Warning' : 'Advertencia';
  } else if (isSuccess) {
    title = language === 'Inglés' ? 'Success' : 'Éxito';
  } else {
    title = language === 'Inglés' ? 'Notification' : 'Notificación';
  }

  // Verificar si el error es reintentable
  const isRetryable = message instanceof Error || typeof message === 'object' 
    ? errorHandlingService.isRetryable(message)
    : false;

  return (
    <div 
      className={`${bgColor} ${borderColor} ${textColor} border px-4 py-3 rounded-lg relative mb-6 flex justify-between items-start shadow-md`} 
      role="alert"
    >
      <div className="flex items-start">
        {/* Icono según el tipo de alerta */}
        <div className={`mr-3 ${iconColor}`}>
          {isError && (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {isWarning && (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {isSuccess && (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {!isError && !isWarning && !isSuccess && (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <div>
          <strong className={`font-bold ${strongTextColor}`}>{title}: </strong>
          <span className="block sm:inline">{processedMessage}</span>
          
          {/* Botón de reintento si es aplicable */}
          {isRetryable && onRetry && (
            <button 
              onClick={onRetry} 
              className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
            >
              {language === 'Inglés' ? 'Retry' : 'Reintentar'}
            </button>
          )}
        </div>
      </div>
      
      <button 
        onClick={onClose} 
        className="ml-4 -mt-1 -mr-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" 
        aria-label="Close"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
