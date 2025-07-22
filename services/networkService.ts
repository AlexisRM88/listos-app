/**
 * =================================================================================================
 * SERVICIO DE RED
 * =================================================================================================
 * Este servicio proporciona funciones para realizar solicitudes HTTP con manejo de errores mejorado,
 * reintentos automáticos y formateo de errores para una mejor experiencia de usuario.
 */

import errorHandlingService, { RetryOptions } from './errorHandlingService';

/**
 * Opciones para solicitudes fetch
 */
interface FetchOptions extends RequestInit {
  retryOptions?: Partial<RetryOptions>;
  parseJson?: boolean;
}

/**
 * Realiza una solicitud HTTP con manejo de errores mejorado y reintentos automáticos
 * @param url - URL de la solicitud
 * @param options - Opciones de fetch y reintentos
 * @returns Respuesta de la solicitud
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { retryOptions, parseJson = true, ...fetchOptions } = options;

  return errorHandlingService.withRetry(async () => {
    try {
      const response = await fetch(url, fetchOptions);

      // Manejar errores HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || `Error HTTP: ${response.status} ${response.statusText}`
        );
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = errorData;
        throw error;
      }

      // Parsear respuesta según el tipo solicitado
      if (parseJson) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      // Formatear y relanzar el error para que sea manejado por withRetry
      const formattedError = errorHandlingService.formatError(error);
      throw formattedError;
    }
  }, retryOptions);
}

/**
 * Realiza una solicitud GET con manejo de errores mejorado
 * @param url - URL de la solicitud
 * @param options - Opciones adicionales
 * @returns Respuesta de la solicitud
 */
export async function get<T = any>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return fetchWithRetry<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Realiza una solicitud POST con manejo de errores mejorado
 * @param url - URL de la solicitud
 * @param data - Datos a enviar
 * @param options - Opciones adicionales
 * @returns Respuesta de la solicitud
 */
export async function post<T = any>(
  url: string,
  data: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetchWithRetry<T>(url, {
    ...options,
    headers,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Realiza una solicitud PUT con manejo de errores mejorado
 * @param url - URL de la solicitud
 * @param data - Datos a enviar
 * @param options - Opciones adicionales
 * @returns Respuesta de la solicitud
 */
export async function put<T = any>(
  url: string,
  data: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetchWithRetry<T>(url, {
    ...options,
    headers,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Realiza una solicitud DELETE con manejo de errores mejorado
 * @param url - URL de la solicitud
 * @param options - Opciones adicionales
 * @returns Respuesta de la solicitud
 */
export async function del<T = any>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return fetchWithRetry<T>(url, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * Verifica si hay conexión a internet
 * @returns true si hay conexión, false si no
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Registra un callback para cuando la conexión a internet cambie
 * @param callback - Función a llamar cuando cambie la conexión
 * @returns Función para eliminar el listener
 */
export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export default {
  fetchWithRetry,
  get,
  post,
  put,
  del,
  isOnline,
  onConnectionChange,
};