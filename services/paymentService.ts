
import { loadStripe, Stripe } from '@stripe/stripe-js';
import config from '../config';

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
    console.error('Error en el proceso de checkout:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
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
    const proxyResponse = await fetch(config.stripeProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!proxyResponse.ok) {
      const errorData: ServerErrorResponse = await proxyResponse.json()
        .catch(() => ({ error: 'Respuesta de error no es JSON' }));
      
      // Manejo específico de códigos de estado HTTP
      switch (proxyResponse.status) {
        case 400:
          return { success: false, error: errorData.error || 'Solicitud inválida' };
        case 401:
          return { success: false, error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' };
        case 429:
          return { success: false, error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' };
        case 500:
          return { success: false, error: 'Error interno del servidor. Intenta más tarde.' };
        default:
          return { success: false, error: errorData.error || `Error del servidor (${proxyResponse.status})` };
      }
    }

    const responseData: CheckoutSessionResponse = await proxyResponse.json();
    if (!responseData.sessionId) {
      return { success: false, error: "No se recibió un ID de sesión del servidor." };
    }

    return { success: true, sessionId: responseData.sessionId };

  } catch (error) {
    if (error instanceof TypeError) {
      return { 
        success: false, 
        error: 'Error de red: No se pudo conectar con el servidor de pagos. Verifica tu conexión a internet.' 
      };
    }
    throw error;
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
    const response = await fetch(`/api/stripe/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'No se pudo verificar el estado del pago' };
    }

    const data = await response.json();
    return { success: true, status: data.status };

  } catch (error) {
    return { success: false, error: 'Error al verificar el estado del pago' };
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
    const response = await fetch('/api/stripe/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'No se pudo obtener la configuración de precios' };
    }

    const config = await response.json();
    return { success: true, config };

  } catch (error) {
    return { success: false, error: 'Error al obtener la configuración de precios' };
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
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      return { success: false, error: errorData.error };
    }

    const data = await response.json();
    return { 
      success: true, 
      cancelAt: data.cancelAt 
    };

  } catch (error) {
    return { 
      success: false, 
      error: 'Error al cancelar la suscripción' 
    };
  }
};