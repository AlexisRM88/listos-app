

import React, { useState, useEffect, useCallback } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserProfile } from '../types';
import config from '../config';

interface LandingPageProps {
  onLogin: (user: UserProfile) => void;
  onError: (message: string) => void;
  onEnterApp: () => void;
  userProfile: UserProfile | null;
}

// Simple JWT decoder
const decodeJwt = (token: string): any => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
};

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onEnterApp, userProfile, onError }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const isGoogleConfigured = config.googleClientId && !config.googleClientId.startsWith('TU_ID');

  const handleDemoLogin = () => {
    const demoUser: UserProfile = {
        id: 'demo-user-123',
        email: 'demo@listosapp.com',
        name: 'Usuario Demo',
        picture: `https://api.dicebear.com/8.x/initials/svg?seed=Demo&backgroundColor=00897b`,
        idToken: 'demo-token', // Dummy token for demo mode
    };
    onLogin(demoUser);
    setShowLoginModal(false);
  };

  const handleCredentialResponse = useCallback((response: any) => {
    const idToken = response.credential;
    const userObject = decodeJwt(idToken);
    
    if (userObject) {
      const userProfile: UserProfile = {
        id: userObject.sub,
        email: userObject.email,
        name: userObject.name,
        picture: userObject.picture,
        idToken: idToken,
      };
      onLogin(userProfile);
      setShowLoginModal(false);
    } else {
      console.error('Could not decode user from Google response.');
      onError('Hubo un problema al iniciar sesión con Google. Por favor, inténtalo de nuevo.');
    }
  }, [onLogin, onError]);

  const handleStartCreating = () => {
    if (userProfile) {
        onEnterApp();
    } else {
        setShowLoginModal(true);
    }
  };

  const LoginModal: React.FC<{
    onClose: () => void;
    show: boolean;
    onDemoLogin: () => void;
  }> = ({ onClose, show, onDemoLogin }) => {
      useEffect(() => {
          if (show && isGoogleConfigured) {
              let attempts = 0;
              const interval = setInterval(() => {
                  const buttonContainer = document.getElementById('google-signin-button-container');
                  if (window.google?.accounts?.id && buttonContainer) {
                      clearInterval(interval);
                      try {
                          window.google.accounts.id.initialize({
                            client_id: config.googleClientId,
                            callback: handleCredentialResponse,
                          });
                          window.google.accounts.id.renderButton(
                              buttonContainer,
                              { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'pill', width: 280 }
                          );
                      } catch (error) {
                          console.error("Error initializing or rendering Google Sign-In:", error);
                           if (buttonContainer) {
                              buttonContainer.innerHTML = `<p class="text-xs text-red-500">Error al configurar el inicio de sesión de Google.</p>`;
                          }
                      }
                  } else if (attempts > 10) { 
                      clearInterval(interval);
                      if (buttonContainer) {
                          buttonContainer.innerHTML = `<p class="text-xs text-red-500">Error al cargar el botón de Google.</p>`;
                      }
                  }
                  attempts++;
              }, 200);
  
              return () => clearInterval(interval);
          }
      }, [show, isGoogleConfigured, handleCredentialResponse]);
      
      if (!show) return null;
      
      return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm m-4 p-8 text-center" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inicia sesión o regístrate</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Usa tu cuenta de Google para comenzar a crear hojas de trabajo en segundos.
                  </p>
                  <div className="mt-6 flex flex-col justify-center items-center min-h-[50px]">
                      {isGoogleConfigured ? (
                         <div id="google-signin-button-container">
                             <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-[280px] rounded-full"></div>
                         </div>
                      ) : (
                          <div className="w-full">
                              <div className="text-sm text-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 p-3 rounded-md w-full">
                                  <p className="font-semibold">Configuración Incompleta</p>
                                  <p className="text-xs mt-1">La autenticación de Google no está habilitada. Añade tu ID de cliente en 'config.js'.</p>
                              </div>
                              <div className="flex items-center my-4">
                                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                  <span className="flex-shrink mx-4 text-slate-500 text-xs">O</span>
                                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                              </div>
                              <button 
                                  onClick={onDemoLogin} 
                                  className="w-full py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                  Continuar como Demo
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onDemoLogin={handleDemoLogin} />
      <header className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <LogoIcon className="h-8 w-8 text-slate-900 dark:text-white" />
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Listos<span className="text-blue-500">App</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
             <a href="#precios" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors">Precios</a>
            <button onClick={handleStartCreating} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-md">
              Comenzar a Crear
            </button>
          </div>
        </nav>
      </header>
      
      <main>
        {/* Hero Section */}
        <section className="text-center py-20 sm:py-28 lg:py-32 px-4 bg-white dark:bg-slate-900/50">
            <div className="container mx-auto">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tighter">
                    Recupera tu tiempo. <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Inspira a tus estudiantes.</span>
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                    Crea hojas de trabajo, prácticas y exámenes personalizados en segundos. Deja que la inteligencia artificial sea tu asistente de enseñanza personal.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <button onClick={handleStartCreating} className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-transform hover:scale-105 shadow-lg">
                        Crear mi primera hoja (Gratis)
                    </button>
                </div>
                <p className="mt-4 text-xs text-slate-500">2 creaciones gratuitas. No se requiere tarjeta de crédito.</p>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tu Asistente de Enseñanza Inteligente</h2>
              <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">Diseñado para educadores que valoran su tiempo y la calidad de la enseñanza.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
                  <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Ahorro de Tiempo Radical</h3>
                <p className="text-slate-600 dark:text-slate-400">Genera en minutos lo que antes te tomaba horas. Dedica más tiempo a enseñar y menos a preparar material.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
                  <SparklesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Personalización Inteligente</h3>
                <p className="text-slate-600 dark:text-slate-400">Adapta el contenido por materia, grado y dificultad. Sube tus propios textos o imágenes para crear ejercicios a medida.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
                  <BookOpenIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Variedad Pedagógica</h3>
                <p className="text-slate-600 dark:text-slate-400">Crea diferentes tipos de preguntas: selección múltiple, pareo, respuesta abierta y más, para una evaluación completa.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="precios" className="py-20 sm:py-24 px-4 bg-white dark:bg-slate-900/50">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Un plan simple para potenciar tu enseñanza</h2>
              <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">Comienza gratis y actualiza cuando estés listo para creaciones ilimitadas.</p>
            </div>
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                {/* Free Plan */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col">
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Prueba</h3>
                  <p className="text-slate-500 mt-2">Perfecto para empezar.</p>
                  <p className="text-4xl font-bold my-6 text-slate-900 dark:text-white">$0</p>
                  <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> 2 generaciones de documentos</li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> Acceso a todos los tipos de pregunta</li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> Subir textos e imágenes</li>
                  </ul>
                  <button onClick={handleStartCreating} className="mt-auto w-full py-3 font-semibold text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Comenzar Gratis
                  </button>
                </div>
                {/* Pro Plan */}
                <div className="border-2 border-blue-500 rounded-2xl p-8 flex flex-col relative">
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-sm font-semibold text-white bg-blue-500 rounded-full">Más Popular</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Pro</h3>
                  <p className="text-slate-500 mt-2">Para el educador imparable.</p>
                  <p className="text-4xl font-bold my-6 text-slate-900 dark:text-white">$9.99 <span className="text-base font-normal text-slate-500">/ mes</span></p>
                  <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> <span className="font-semibold text-slate-700 dark:text-slate-300">Todo lo de Prueba, y además:</span></li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> Generaciones <span className="font-semibold text-blue-500 ml-1">ilimitadas</span></li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> Guardar y organizar documentos</li>
                    <li className="flex items-center"><CheckIcon className="h-5 w-5 text-green-500 mr-2" /> Soporte prioritario</li>
                  </ul>
                  <button onClick={handleStartCreating} className="mt-auto w-full py-3 font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-md">
                    Suscribirse al Plan Pro
                  </button>
                </div>
              </div>
            </div>
        </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <LogoIcon className="h-8 w-8 mx-auto mb-4 text-slate-400" />
          <div className="mb-4 space-x-4">
              <a href="https://www.buenturno.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Buenturno.com</a>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <a href="https://www.cabuyacreativa.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">CabuyaCreativa.com</a>
          </div>
          <p>&copy; {new Date().getFullYear()} ListosApp. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};