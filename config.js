/**
 * =================================================================================================
 * ARCHIVO DE CONFIGURACIÓN DEL FRONTEND
 * =================================================================================================
 * Este archivo consolida las configuraciones para el cliente.
 * Las claves secretas se manejan en el servidor (`server.js`) y se leen de variables de entorno.
 *
 * Para desarrollo local, crea un archivo `.env` y añade VITE_GOOGLE_CLIENT_ID y VITE_STRIPE_PUBLISHABLE_KEY.
 * En producción (Cloud Run), configura estas variables de entorno en tu servicio.
 */

// Accedemos a import.meta.env de forma segura usando el encadenamiento opcional (?.) para prevenir errores
// en entornos donde podría ser indefinido (por ejemplo, durante el renderizado del lado del servidor o en algunos ejecutores de pruebas).
const config = {
  /**
   * URL del proxy de Gemini. Ahora es un endpoint local en nuestro propio servidor.
   */
  geminiProxyUrl: '/api/gemini',

  /**
   * ID de Cliente de Google para el inicio de sesión. Obtenido de `import.meta.env`.
   * Es seguro que sea pública. Se mantiene el valor antiguo como respaldo.
   */
  googleClientId: import.meta.env?.VITE_GOOGLE_CLIENT_ID || '390459366402-ojk0rh46qthbefi4opb72irdn7rqqut3.apps.googleusercontent.com',

  /**
   * Clave publicable de Stripe. Obtenida de `import.meta.env`.
   * Es seguro que esté en el frontend. Se mantiene el valor antiguo como respaldo.
   */
  stripePublishableKey: import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RcC52JISbXHAl7Z3UZv5Rb4ZVhidjHYrAwEHZu5JSs6wgQrbO6YsyfvD7OYvz8ktk6WV8XT7GJjUip0Btep8diA00LGL2K47V',

  /**
   * URL del proxy de pago de Stripe. Ahora es un endpoint local en nuestro propio servidor.
   */
  stripeProxyUrl: '/api/stripe/create-checkout-session',
};

export default config;