/**
 * =================================================================================================
 * SERVICIO DE MANEJO DE ERRORES
 * =================================================================================================
 * Este servicio proporciona funcionalidades para el manejo uniforme de errores en la aplicación,
 * incluyendo reintentos automáticos para errores de red, formateo de mensajes de error para
 * usuarios finales, y registro centralizado de errores.
 */

// Tipos de errores que pueden ocurrir en la aplicación
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  UNKNOWN = 'UNKNOWN'
}

// Interfaz para errores estructurados
export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string;
  originalError?: any;
  retryable: boolean;
}

// Opciones para reintentos
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

// Opciones por defecto para reintentos
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffFactor: 2
};

/**
 * Clase para el manejo centralizado de errores
 */
class ErrorHandlingService {
  /**
   * Formatea un error para presentarlo al usuario
   * @param error - Error original
   * @returns Error formateado para el usuario
   */
  formatError(error: unknown): AppError {
    // Si ya es un AppError, lo devolvemos tal cual
    if (this.isAppError(error)) {
      return error;
    }

    // Error de red (fetch)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: ErrorType.NETWORK,
        message: 'Error de conexión de red',
        userMessage: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        originalError: error,
        retryable: true
      };
    }

    // Error HTTP
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; statusText?: string; message?: string };
      
      switch (httpError.status) {
        case 401:
          return {
            type: ErrorType.AUTHENTICATION,
            message: 'Error de autenticación',
            userMessage: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            code: 'AUTH_EXPIRED',
            originalError: error,
            retryable: false
          };
        case 403:
          return {
            type: ErrorType.AUTHORIZATION,
            message: 'Error de autorización',
            userMessage: 'No tienes permiso para realizar esta acción.',
            code: 'FORBIDDEN',
            originalError: error,
            retryable: false
          };
        case 400:
          return {
            type: ErrorType.VALIDATION,
            message: 'Error de validación',
            userMessage: httpError.message || 'Los datos proporcionados no son válidos.',
            code: 'INVALID_INPUT',
            originalError: error,
            retryable: false
          };
        case 429:
          return {
            type: ErrorType.SERVER,
            message: 'Demasiadas solicitudes',
            userMessage: 'Estamos recibiendo demasiadas solicitudes. Por favor, intenta nuevamente en unos momentos.',
            code: 'RATE_LIMITED',
            originalError: error,
            retryable: true
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: ErrorType.SERVER,
            message: `Error del servidor (${httpError.status})`,
            userMessage: 'Estamos experimentando problemas técnicos. Por favor, intenta nuevamente más tarde.',
            code: 'SERVER_ERROR',
            originalError: error,
            retryable: true
          };
        default:
          return {
            type: ErrorType.UNKNOWN,
            message: httpError.statusText || `Error HTTP ${httpError.status}`,
            userMessage: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
            code: `HTTP_${httpError.status}`,
            originalError: error,
            retryable: httpError.status >= 500
          };
      }
    }

    // Error de Stripe
    if (error && typeof error === 'object' && 'type' in error && typeof error.type === 'string' && error.type.startsWith('stripe_')) {
      const stripeError = error as { type: string; message?: string };
      return {
        type: ErrorType.PAYMENT,
        message: `Error de Stripe: ${stripeError.type}`,
        userMessage: stripeError.message || 'Ocurrió un error durante el proceso de pago.',
        code: stripeError.type,
        originalError: error,
        retryable: false
      };
    }

    // Error estándar de JavaScript
    if (error instanceof Error) {
      return {
        type: ErrorType.UNKNOWN,
        message: error.message,
        userMessage: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
        originalError: error,
        retryable: false
      };
    }

    // Cualquier otro tipo de error
    return {
      type: ErrorType.UNKNOWN,
      message: String(error),
      userMessage: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
      originalError: error,
      retryable: false
    };
  }

  /**
   * Verifica si un error es de tipo AppError
   * @param error - Error a verificar
   * @returns true si es un AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      'message' in error &&
      'userMessage' in error &&
      'retryable' in error
    );
  }

  /**
   * Ejecuta una función con reintentos automáticos en caso de error
   * @param fn - Función a ejecutar
   * @param options - Opciones de reintento
   * @returns Resultado de la función
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const retryOptions: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: AppError | null = null;
    let attempt = 0;

    while (attempt <= retryOptions.maxRetries) {
      try {
        // Intentar ejecutar la función
        return await fn();
      } catch (error) {
        // Formatear el error
        const formattedError = this.formatError(error);
        lastError = formattedError;
        attempt++;

        // Si no es reintentable o ya alcanzamos el máximo de reintentos, lanzar el error
        if (!formattedError.retryable || attempt > retryOptions.maxRetries) {
          this.logError(formattedError, attempt);
          throw formattedError;
        }

        // Calcular tiempo de espera con backoff exponencial
        const delay = Math.min(
          retryOptions.initialDelayMs * Math.pow(retryOptions.backoffFactor, attempt - 1),
          retryOptions.maxDelayMs
        );

        // Agregar jitter (variación aleatoria) para evitar sincronización
        const jitteredDelay = delay * (0.8 + Math.random() * 0.4);

        // Registrar el intento fallido
        console.warn(`Intento ${attempt}/${retryOptions.maxRetries} fallido. Reintentando en ${Math.round(jitteredDelay)}ms...`, formattedError);

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    // Este punto no debería alcanzarse, pero por si acaso
    if (lastError) {
      throw lastError;
    }

    throw new Error('Error inesperado en el sistema de reintentos');
  }

  /**
   * Registra un error en el sistema de logging
   * @param error - Error a registrar
   * @param attempts - Número de intentos realizados (para reintentos)
   */
  logError(error: AppError, attempts: number = 1): void {
    // Importar el servicio de logging
    import('./loggingService').then(({ default: loggingService, LogLevel }) => {
      // Contexto adicional para el log
      const context = {
        errorType: error.type,
        code: error.code,
        attempts,
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryable: error.retryable
      };

      // Determinar el nivel de log basado en el tipo de error
      let logLevel = LogLevel.ERROR;
      if (error.type === ErrorType.NETWORK) {
        logLevel = attempts > 2 ? LogLevel.ERROR : LogLevel.WARN;
      } else if (error.type === ErrorType.SERVER && error.code === 'SERVER_ERROR') {
        logLevel = LogLevel.CRITICAL;
      } else if (error.type === ErrorType.PAYMENT) {
        logLevel = LogLevel.ERROR;
      } else if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
        logLevel = LogLevel.INFO; // Estos son errores esperados en flujo normal
      }

      // Registrar el error con el servicio de logging
      loggingService.log(
        logLevel,
        error.message,
        context,
        undefined, // userId (no disponible aquí)
        [error.type.toLowerCase(), error.code?.toLowerCase() || 'unknown']
      );
    }).catch(e => {
      // Fallback a console.error si no se puede cargar el servicio de logging
      console.error('Error en la aplicación:', {
        timestamp: new Date().toISOString(),
        errorType: error.type,
        message: error.message,
        code: error.code,
        attempts,
        userAgent: navigator.userAgent,
        url: window.location.href,
      }, error.originalError || error);
    });
  }

  /**
   * Obtiene un mensaje de error amigable para el usuario basado en el tipo de error
   * @param error - Error original o mensaje de error
   * @returns Mensaje formateado para el usuario
   */
  getUserFriendlyMessage(error: unknown): string {
    if (typeof error === 'string') {
      return this.humanizeErrorMessage(error);
    }

    const formattedError = this.formatError(error);
    return formattedError.userMessage;
  }

  /**
   * Convierte un mensaje de error técnico en uno más amigable para el usuario
   * @param message - Mensaje técnico
   * @returns Mensaje humanizado
   */
  private humanizeErrorMessage(message: string): string {
    // Mapeo de mensajes técnicos a mensajes amigables
    const errorMap: Record<string, string> = {
      'Failed to fetch': 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      'Network error': 'Error de conexión. Verifica tu conexión a internet.',
      'Unauthorized': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      'Forbidden': 'No tienes permiso para realizar esta acción.',
      'Not Found': 'El recurso solicitado no existe.',
      'Timeout': 'La solicitud ha tardado demasiado tiempo. Por favor, intenta nuevamente.',
      'Internal Server Error': 'Estamos experimentando problemas técnicos. Por favor, intenta nuevamente más tarde.',
      'Bad Request': 'La solicitud no pudo ser procesada. Verifica los datos e intenta nuevamente.',
    };

    // Buscar coincidencias parciales en el mensaje
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    // Si no hay coincidencias, devolver un mensaje genérico
    return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
  }

  /**
   * Verifica si un error es de un tipo específico
   * @param error - Error a verificar
   * @param type - Tipo de error a comparar
   * @returns true si el error es del tipo especificado
   */
  isErrorOfType(error: unknown, type: ErrorType): boolean {
    const formattedError = this.formatError(error);
    return formattedError.type === type;
  }

  /**
   * Verifica si un error es reintentable
   * @param error - Error a verificar
   * @returns true si el error es reintentable
   */
  isRetryable(error: unknown): boolean {
    const formattedError = this.formatError(error);
    return formattedError.retryable;
  }
}

// Exportar instancia del servicio
const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;