
import { loadStripe } from '@stripe/stripe-js';
import config from '../config';

/**
 * Handles the full secure checkout flow.
 * 1. Validates frontend configuration.
 * 2. Calls a secure backend proxy to create a Stripe Checkout Session.
 * 3. Redirects the user to Stripe's hosted checkout page.
 * @param idToken The user's Google ID token for backend authentication.
 * @returns An object indicating success or failure, with an optional error message.
 */
export const redirectToCheckout = async (idToken: string): Promise<{ success: boolean; error?: string }> => {
  // 1. Validate frontend configuration
  if (!config.stripePublishableKey || !config.stripePublishableKey.startsWith('pk_live')) {
    const errorMsg = "La clave publicable de Stripe no está configurada correctamente en 'config.js'.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!config.stripeProxyUrl) {
    const errorMsg = "La URL del proxy de pago de Stripe no está configurada en 'config.js'.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    // 2. Call the secure backend to create a checkout session
    const proxyResponse = await fetch(config.stripeProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({ error: 'Respuesta de error no es JSON' }));
      throw new Error(errorData.error || `Error del servidor de pagos (${proxyResponse.status})`);
    }

    const { sessionId } = await proxyResponse.json();
    if (!sessionId) {
      throw new Error("No se recibió un ID de sesión del servidor.");
    }

    // 3. Redirect to Stripe's hosted checkout page
    const stripe = await loadStripe(config.stripePublishableKey);
    if (!stripe) {
      throw new Error('Stripe.js no se pudo cargar.');
    }

    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

    if (stripeError) {
        throw new Error(stripeError.message);
    }

    // This part is not typically reached if redirection is successful.
    return { success: true };

  } catch (error) {
    console.error('Error en el proceso de checkout:', error);
    let finalErrorMessage = 'Ocurrió un error inesperado durante el pago.';

    if (error instanceof TypeError) { // Catches network errors from fetch
      finalErrorMessage = `Error de red: No se pudo conectar con el servidor de pagos. Por favor, revisa tu conexión a internet.`;
    } else if (error instanceof Error) { // Catches errors from proxy response and stripe.js
        finalErrorMessage = error.message;
    }
    
    return { success: false, error: finalErrorMessage };
  }
};