
import React from 'react';

interface ErrorAlertProps {
  message: string;
  language: string;
  onClose: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, language, onClose }) => {
  const isError = message.toLowerCase().includes('error');
  const bgColor = isError ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50';
  const borderColor = isError ? 'border-red-400 dark:border-red-700' : 'border-blue-400 dark:border-blue-700';
  const textColor = isError ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300';
  const strongTextColor = isError ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200';

  const title = isError ? (language === 'Inglés' ? 'Error' : 'Error') : (language === 'Inglés' ? 'Notification' : 'Notificación');

  return (
    <div className={`${bgColor} ${borderColor} ${textColor} border px-4 py-3 rounded-lg relative mb-6 flex justify-between items-start`} role="alert">
      <div>
        <strong className={`font-bold ${strongTextColor}`}>{title}: </strong>
        <span className="block sm:inline">{message}</span>
      </div>
       <button onClick={onClose} className="ml-4 -mt-1 -mr-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" aria-label="Close">
         <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
