
import { loadStripe, Stripe } from '@stripe/stripe-js';
import config from '../config';
import errorHandlingService, { ErrorType } from './errorHandlingService';

// Cache para la instancia de Stripe
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Obtiene la instancia de Stripe de forma lazy
 */
const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(config.stripePublishableKey);
  }
  return stripePromise;
};

/**
 * Interfaz para el resultado del checkout
 */
interface CheckoutResult {
  success: boolean;
  error?: string;
  sessionId?: string;
}

/**
 * Interfaz para la respuesta del servidor
 */
interface CheckoutSessionResponse {
  sessionId: string;
}

/**
 * Interfaz para errores del servidor
 */
interface ServerErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Handles the full secure checkout flow.
 * 1. Validates frontend configuration.
 * 2. Calls a secure backend proxy to create a Stripe Checkout Session.
 * 3. Redirects the user to Stripe's hosted checkout page.
 * @param idToken The user's Google ID token for backend authentication.
 * @returns An object indicating success or failure, with an optional error message.
 */
export const redirectToCheckout = async (idToken: string): Promise<CheckoutResult> => {
  return errorHandlingService.withRetry(async () => {
    // 1. Validate frontend configuration
    const validationError = validateConfiguration();
    if (validationError) {
      return validationError;
    }

    try {
      // 2. Create checkout session
      const sessionResult = await createCheckoutSession(idToken);
      if (!sessionResult.success) {
        return sessionResult;
      }

      // 3. Redirect to Stripe's hosted checkout page
      return await redirectToStripeCheckout(sessionResult.sessionId!);

    } catch (error) {
      const formattedError = errorHandlingService.formatError(error);
      console.error('Error en el proceso de checkout:', formattedError);
      return {
        success: false,
        error: errorHandlingService.getUserFriendlyMessage(error)
      };
    }
  }, { 
    maxRetries: 2,
    initialDelayMs: 500
  });
};

/**
 * Valida la configuración del frontend
 */
const validateConfiguration = (): CheckoutResult | null => {
  if (!config.stripePublishableKey) {
    const errorMsg = "La clave publicable de Stripe no está configurada en 'config.js'.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // Validar que la clave tenga el formato correcto (pk_test_ o pk_live_)
  if (!config.stripePublishableKey.startsWith('pk_test_') && !config.stripePublishableKey.startsWith('pk_live_')) {
    const errorMsg = "La clave publicable de Stripe no tiene el formato correcto.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!config.stripeProxyUrl) {
    const errorMsg = "La URL del proxy de pago de Stripe no está configurada en 'config.js'.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  return null;
};

/**
 * Crea una sesión de checkout en el servidor
 */
const createCheckoutSession = async (idToken: string): Promise<CheckoutResult> => {
  try {
    // Importar el servicio de red de forma dinámica para evitar problemas de dependencia circular
    const networkService = await import('./networkService').then(module => module.default);
    
    try {
      // Usar el servicio de red con reintentos automáticos
      const responseData = await networkService.post<CheckoutSessionResponse>(
        config.stripeProxyUrl,
        {}, // No necesitamos enviar datos en el cuerpo
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
          retryOptions: {
            maxRetries: 2,
            initialDelayMs: 500
          }
        }
      );
      
      if (!responseData.sessionId) {
        return { success: false, error: "No se recibió un ID de sesión del servidor." };
      }

      return { success: true, sessionId: responseData.sessionId };
    } catch (error) {
      // El error ya ha sido formateado por networkService
      const formattedError = errorHandlingService.formatError(error);
      
      // Personalizar mensajes según el tipo de error
      switch (formattedError.type) {
        case ErrorType.AUTHENTICATION:
          return { success: false, error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' };
        case ErrorType.NETWORK:
          return { 
            success: false, 
            error: 'Error de red: No se pudo conectar con el servidor de pagos. Verifica tu conexión a internet.' 
          };
        case ErrorType.SERVER:
          return { success: false, error: 'Error interno del servidor. Intenta más tarde.' };
        default:
          return { success: false, error: formattedError.userMessage };
      }
    }
  } catch (error) {
    // Manejar errores inesperados
    const formattedError = errorHandlingService.formatError(error);
    console.error('Error inesperado al crear sesión de checkout:', formattedError);
    return { 
      success: false, 
      error: errorHandlingService.getUserFriendlyMessage(error)
    };
  }
};

/**
 * Redirige al usuario a Stripe Checkout
 */
const redirectToStripeCheckout = async (sessionId: string): Promise<CheckoutResult> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return { success: false, error: 'No se pudo cargar Stripe.js. Verifica tu conexión a internet.' };
    }

    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

    if (stripeError) {
      // Manejo específico de errores de Stripe
      switch (stripeError.type) {
        case 'validation_error':
          return { success: false, error: 'Error de validación en el proceso de pago.' };
        case 'card_error':
          return { success: false, error: stripeError.message || 'Error con la tarjeta de crédito.' };
        case 'api_connection_error':
          return { success: false, error: 'Error de conexión. Verifica tu conexión a internet.' };
        case 'api_error':
          return { success: false, error: 'Error del servicio de pagos. Intenta más tarde.' };
        case 'authentication_error':
          return { success: false, error: 'Error de autenticación. Contacta al soporte.' };
        case 'rate_limit_error':
          return { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' };
        default:
          return { success: false, error: stripeError.message || 'Error en el proceso de pago.' };
      }
    }

    // Esta parte normalmente no se alcanza si la redirección es exitosa
    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: 'Error inesperado durante la redirección al pago.' 
    };
  }
};

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof TypeError) {
    return 'Error de red: No se pudo conectar con el servidor de pagos. Verifica tu conexión a internet.';
  } else if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado durante el pago.';
};

/**
 * Verifica el estado de una sesión de checkout
 * @param sessionId ID de la sesión de Stripe
 * @returns Promise con el estado de la sesión
 */
export const getCheckoutSessionStatus = async (sessionId: string): Promise<{ success: boolean; status?: string; error?: string }> => {
  try {
    // Importar el servicio de red de forma dinámica para evitar problemas de dependencia circular
    const networkService = await import('./networkService').then(module => module.default);
    
    try {
      // Usar el servicio de red con reintentos automáticos
      const data = await networkService.get(`/api/stripe/session/${sessionId}`, {
        retryOptions: { maxRetries: 3 }
      });
      
      return { success: true, status: data.status };
    } catch (error) {
      const formattedError = errorHandlingService.formatError(error);
      console.error('Error al verificar estado de sesión:', formattedError);
      return { 
        success: false, 
        error: errorHandlingService.getUserFriendlyMessage(error)
      };
    }
  } catch (error) {
    // Manejar errores inesperados
    const formattedError = errorHandlingService.formatError(error);
    console.error('Error inesperado al verificar estado de sesión:', formattedError);
    return { 
      success: false, 
      error: errorHandlingService.getUserFriendlyMessage(error)
    };
  }
};

/**
 * Obtiene la configuración de precios desde el servidor
 * @returns Promise con la configuración de precios
 */
export const getPricingConfig = async (): Promise<{ 
  success: boolean; 
  config?: {
    priceId: string;
    amount: number;
    currency: string;
    interval: string;
    product: {
      name: string;
      description: string;
    };
  };
  error?: string;
}> => {
  try {
    // Importar el servicio de red de forma dinámica para evitar problemas de dependencia circular
    const networkService = await import('./networkService').then(module => module.default);
    
    try {
      // Usar el servicio de red con reintentos automáticos
      const config = await networkService.get('/api/stripe/config', {
        retryOptions: { maxRetries: 3 }
      });
      
      return { success: true, config };
    } catch (error) {
      const formattedError = errorHandlingService.formatError(error);
      console.error('Error al obtener configuración de precios:', formattedError);
      return { 
        success: false, 
        error: errorHandlingService.getUserFriendlyMessage(error)
      };
    }
  } catch (error) {
    // Manejar errores inesperados
    const formattedError = errorHandlingService.formatError(error);
    console.error('Error inesperado al obtener configuración de precios:', formattedError);
    return { 
      success: false, 
      error: errorHandlingService.getUserFriendlyMessage(error)
    };
  }
};

/**
 * Cancela una suscripción
 * @param idToken Token de autenticación del usuario
 * @returns Promise con el resultado de la cancelación
 */
export const cancelSubscription = async (idToken: string): Promise<{ 
  success: boolean; 
  error?: string; 
  cancelAt?: string;
}> => {
  try {
    // Importar el servicio de red de forma dinámica para evitar problemas de dependencia circular
    const networkService = await import('./networkService').then(module => module.default);
    
    try {
      // Usar el servicio de red con reintentos automáticos
      const data = await networkService.post('/api/stripe/cancel-subscription', 
        {}, // No necesitamos enviar datos en el cuerpo
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
          retryOptions: {
            maxRetries: 2,
            initialDelayMs: 800
          }
        }
      );
      
      return { 
        success: true, 
        cancelAt: data.cancelAt 
      };
    } catch (error) {
      const formattedError = errorHandlingService.formatError(error);
      console.error('Error al cancelar suscripción:', formattedError);
      return { 
        success: false, 
        error: errorHandlingService.getUserFriendlyMessage(error)
      };
    }
  } catch (error) {
    // Manejar errores inesperados
    const formattedError = errorHandlingService.formatError(error);
    console.error('Error inesperado al cancelar suscripción:', formattedError);
    return { 
      success: false, 
      error: errorHandlingService.getUserFriendlyMessage(error)
    };
  }
};