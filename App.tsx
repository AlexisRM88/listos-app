import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { Header } from './components/Header';
import { Worksheet, FormState, UserProfile } from './types';
import { generateWorksheet } from './services/geminiService';
import { redirectToCheckout } from './services/paymentService';
import { LANGUAGES } from './constants';
import { LoadingSpinner } from './components/LoadingSpinner';
import * as sessionManager from './sessionManager';

// Lazy loaded components
const InputForm = lazy(() => import('./components/InputForm').then(module => ({ default: module.InputForm })));
const WorksheetDisplay = lazy(() => import('./components/WorksheetDisplay').then(module => ({ default: module.WorksheetDisplay })));
const LandingPage = lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const PricingModal = lazy(() => import('./components/PricingModal').then(module => ({ default: module.PricingModal })));
const SubscriptionBanner = lazy(() => import('./components/SubscriptionBanner').then(module => ({ default: module.SubscriptionBanner })));
const SubscriptionSettings = lazy(() => import('./components/SubscriptionSettings').then(module => ({ default: module.SubscriptionSettings })));
const UsageCounter = lazy(() => import('./components/UsageCounter').then(module => ({ default: module.UsageCounter })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));

const FREE_GENERATIONS_LIMIT = 2;

const App: React.FC = () => {
  // Check if we're on admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  
  const [worksheetData, setWorksheetData] = useState<Worksheet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAsJson, setShowAsJson] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [formSnapshot, setFormSnapshot] = useState<Partial<FormState>>({});
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [worksheetCount, setWorksheetCount] = useState<number>(0);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showSubscriptionSettings, setShowSubscriptionSettings] = useState<boolean>(false);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });
  
  useEffect(() => {
    // This effect runs once on mount to restore the user session
    const session = sessionManager.loadSession();
    if (session.userProfile) {
      setUserProfile(session.userProfile);
      setIsPro(session.isPro);
      setWorksheetCount(session.worksheetCount);
      setShowLandingPage(false);
    } else {
      setShowLandingPage(true);
    }
  }, []);
  
  useEffect(() => {
    // This effect handles the redirect back from Stripe checkout.
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');

    if (paymentSuccess === 'true' && userProfile?.id) {
        console.log('Pago exitoso! Actualizando a Pro.');
        const updatedProStatus = sessionManager.setUserAsPro(userProfile.id, true);
        setIsPro(updatedProStatus);
        setShowPricingModal(false);
        setError('¡Felicidades! Tu cuenta ha sido actualizada al plan Pro.'); // Use error state for success message
    }
    
    if (paymentCancelled === 'true') {
        console.log('Pago cancelado.');
        setError('El proceso de pago fue cancelado. Puedes intentarlo de nuevo en cualquier momento.');
    }
    
    // Clean up URL query parameters after checking them
    if(paymentSuccess || paymentCancelled) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [userProfile?.id]);


  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleLogin = useCallback((user: UserProfile) => {
    const { isPro: loadedPro, worksheetCount: loadedCount } = sessionManager.saveSession(user);
    setUserProfile(user);
    setIsPro(loadedPro);
    setWorksheetCount(loadedCount);
    setShowLandingPage(false);
    setError(null);
  }, []);

  const handleLogout = useCallback(() => {
    sessionManager.clearSession();
    setUserProfile(null);
    setIsPro(false);
    setWorksheetCount(0);
    setShowLandingPage(true);
  }, []);

  const handleEnterApp = () => {
    setShowLandingPage(false);
  };

  const handleUpgrade = async () => {
    if (!userProfile || !userProfile.idToken) {
        setPaymentError("Por favor, inicia sesión para actualizar tu plan.");
        return;
    }
    
    setPaymentProcessing(true);
    setPaymentError(null);
    
    const { success, error: checkoutError } = await redirectToCheckout(userProfile.idToken);
    
    if (!success && checkoutError) {
      setPaymentError(checkoutError);
      setPaymentProcessing(false);
    } else if (success) {
      // Payment redirect successful, modal will be closed when user returns
      setShowPricingModal(false);
      setPaymentProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    setPaymentError(null);
    handleUpgrade();
  };

  const handleClosePricingModal = () => {
    setShowPricingModal(false);
    setPaymentError(null);
    setPaymentProcessing(false);
  };

  const handleManageSubscription = () => {
    setShowSubscriptionSettings(true);
  };

  const handleCloseSubscriptionSettings = () => {
    setShowSubscriptionSettings(false);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleGenerate = useCallback(async (formState: FormState) => {
    if (!userProfile || !userProfile.idToken) {
        setError("Por favor, inicia sesión para generar documentos.");
        return;
    }
    if (!isPro && worksheetCount >= FREE_GENERATIONS_LIMIT) {
      setShowPricingModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setWorksheetData(null);
    setShowAsJson(formState.showJson);
    setLanguage(formState.language);
    setFormSnapshot({ teacherName: formState.teacherName, schoolName: formState.schoolName });

    try {
      const data = await generateWorksheet(formState, userProfile.idToken);
      setWorksheetData(data);
      if (!isPro) {
        const newCount = sessionManager.incrementWorksheetCount(userProfile.id);
        setWorksheetCount(newCount);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isPro, worksheetCount]);

  // If we're on admin route, show admin panel
  if (isAdminRoute) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="large" /></div>}>
        <AdminPanel onError={setError} />
      </Suspense>
    );
  }

  if (showLandingPage || !userProfile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="large" /></div>}>
        <LandingPage onLogin={handleLogin} onEnterApp={handleEnterApp} userProfile={userProfile} onError={setError} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-300 transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} userProfile={userProfile} onLogout={handleLogout} />
      
      {showPricingModal && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"><LoadingSpinner size="medium" /></div>}>
          <PricingModal 
            onClose={handleClosePricingModal} 
            language={language} 
            onUpgrade={handleUpgrade}
            isProcessing={paymentProcessing}
            error={paymentError}
            onRetry={handleRetryPayment}
          />
        </Suspense>
      )}

      {showSubscriptionSettings && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"><LoadingSpinner size="medium" /></div>}>
          <SubscriptionSettings
            userProfile={userProfile}
            language={language}
            onClose={handleCloseSubscriptionSettings}
            onUpgrade={handleUpgrade}
          />
        </Suspense>
      )}

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-4">
              <Suspense fallback={<div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><LoadingSpinner size="small" /></div>}>
                <UsageCounter 
                  userProfile={userProfile}
                  language={language}
                  onUpgrade={() => setShowPricingModal(true)}
                />
              </Suspense>
              <Suspense fallback={<div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><LoadingSpinner size="small" /></div>}>
                <InputForm 
                  onGenerate={handleGenerate} 
                  isLoading={isLoading} 
                  isPro={isPro}
                  remainingGenerations={Math.max(0, FREE_GENERATIONS_LIMIT - worksheetCount)}
                />
              </Suspense>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {error && <ErrorAlert message={error} onClose={() => setError(null)} language={language} />}
            <Suspense fallback={<div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow mb-4"><LoadingSpinner size="small" /></div>}>
              <SubscriptionBanner 
                userProfile={userProfile}
                language={language}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
              />
            </Suspense>
            <Suspense fallback={<div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><LoadingSpinner size="medium" /></div>}>
              <WorksheetDisplay 
                data={worksheetData}
                isLoading={isLoading}
                showAsJson={showAsJson}
                language={language}
                teacherName={formSnapshot.teacherName}
                schoolName={formSnapshot.schoolName}
              />
            </Suspense>
          </div>
        </div>
      </main>

       <footer className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
          <p>{language === 'Inglés' ? 'Powered by AI. Generated content may require review.' : 'Impulsado por IA. El contenido generado puede requerir revisión.'}</p>
          <div className="mt-4 space-x-4">
              <a href="https://www.buenturno.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Buenturno.com</a>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <a href="https://www.cabuyacreativa.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">CabuyaCreativa.com</a>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <a href="/admin" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Admin</a>
          </div>
          <p className="mt-4">
              {language === 'Inglés' 
                  ? `© ${new Date().getFullYear()} ListosApp. All rights reserved.`
                  : `© ${new Date().getFullYear()} ListosApp. Todos los derechos reservados.`
              }
          </p>
      </footer>
    </div>
  );
};

export default App;
