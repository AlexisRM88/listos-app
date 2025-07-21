import React from 'react';
import { CheckIcon } from './icons/CheckIcon';

interface PricingModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  language: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose, onUpgrade, language }) => {
  const isSpanish = language === 'Español';
  
  const T = {
    title: isSpanish ? 'Has alcanzado tu límite gratuito' : 'You\'ve Reached Your Free Limit',
    subtitle: isSpanish ? '¡Gracias por probar ListosApp! Para seguir creando documentos ilimitados, por favor elige un plan.' : 'Thanks for trying ListosApp! To continue creating unlimited documents, please choose a plan.',
    trialPlan: isSpanish ? 'Prueba' : 'Trial',
    trialDesc: isSpanish ? '2 de 2 documentos usados' : '2 of 2 documents used',
    proPlan: isSpanish ? 'Pro' : 'Pro',
    proPrice: isSpanish ? '$9.99 / mes' : '$9.99 / month',
    proDesc: isSpanish ? 'Para el educador imparable.' : 'For the unstoppable educator.',
    unlimited: isSpanish ? 'Generaciones ilimitadas' : 'Unlimited generations',
    saveDocs: isSpanish ? 'Guardar y organizar documentos' : 'Save & organize documents',
    prioritySupport: isSpanish ? 'Soporte prioritario' : 'Priority support',
    upgradeButton: isSpanish ? 'Actualizar a Pro' : 'Upgrade to Pro',
    closeButton: isSpanish ? 'Cerrar' : 'Close'
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md m-4 transform transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{T.title}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{T.subtitle}</p>
        </div>
        
        <div className="px-6 sm:px-8 pb-8 space-y-4">
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center opacity-60">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">{T.trialPlan}</h3>
                <p className="text-sm text-slate-500">{T.trialDesc}</p>
            </div>
            <div className="border-2 border-blue-500 rounded-xl p-6">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-blue-500">{T.proPlan}</h3>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{T.proPrice.split(' ')[0]} <span className="text-base font-medium text-slate-500">{T.proPrice.split(' ')[1]} {T.proPrice.split(' ')[2]}</span></p>
                    <p className="text-sm text-slate-500 mt-1">{T.proDesc}</p>
                </div>
                <ul className="space-y-3 text-slate-600 dark:text-slate-300 text-sm mb-6">
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> {T.unlimited}</li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> {T.saveDocs}</li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> {T.prioritySupport}</li>
                </ul>
                 <button onClick={onUpgrade} className="w-full py-3 font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-md">
                    {T.upgradeButton}
                 </button>
            </div>
             <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                {T.closeButton}
             </button>
        </div>
      </div>
    </div>
  );
};