/**
 * =================================================================================================
 * SERVICIO DE SUSCRIPCIONES DEL CLIENTE
 * =================================================================================================
 * Este servicio maneja las interacciones del frontend con la API de suscripciones.
 */

/**
 * Interfaz para el estado de suscripción
 */
export interface SubscriptionStatus {
  isActive: boolean;
  isPro: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    plan: string;
  };
  usage: {
    current: number;
    limit: number;
    unlimited: boolean;
  };
}

/**
 * Interfaz para el resultado de verificación de generación
 */
export interface CanGenerateResult {
  canGenerate: boolean;
  reason?: string;
}

/**
 * Interfaz para el resultado de registro de uso
 */
export interface UsageRecordResult {
  success: boolean;
  remainingUses?: number;
  error?: string;
}

/**
 * Servicio para gestión de suscripciones en el cliente
 */
class SubscriptionClientService {
  /**
   * Obtiene el estado completo de suscripción del usuario
   * @param idToken Token de autenticación del usuario
   * @param retryCount Número de reintentos (para uso interno)
   * @returns Estado de la suscripción
   */
  async getSubscriptionStatus(
    idToken: string, 
    retryCount = 0
  ): Promise<{ success: boolean; data?: SubscriptionStatus; error?: string }> {
    try {
      const response = await fetch('/api/subscription/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        // Manejar errores específicos según el código de estado
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' 
          };
        }
        
        if (response.status >= 500) {
          // Reintentar automáticamente para errores del servidor (máximo 2 reintentos)
          if (retryCount < 2) {
            console.log(`Reintentando obtener estado de suscripción (intento ${retryCount + 1})...`);
            // Esperar un tiempo exponencial antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return this.getSubscriptionStatus(idToken, retryCount + 1);
          }
          
          return { 
            success: false, 
            error: 'Error del servidor. Por favor, intenta nuevamente más tarde.' 
          };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        return { success: false, error: errorData.error || `Error ${response.status}` };
      }

      const result = await response.json();
      
      // Convertir fechas de string a Date
      if (result.data.subscription?.currentPeriodEnd) {
        result.data.subscription.currentPeriodEnd = new Date(result.data.subscription.currentPeriodEnd);
      }

      return { success: true, data: result.data };

    } catch (error) {
      // Detectar errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.' 
        };
      }
      
      console.error('Error obteniendo estado de suscripción:', error);
      return { 
        success: false, 
        error: 'Error al obtener el estado de la suscripción' 
      };
    }
  }

  /**
   * Verifica si el usuario puede generar un documento
   * @param idToken Token de autenticación del usuario
   * @param retryCount Número de reintentos (para uso interno)
   * @returns Resultado de la verificación
   */
  async canGenerateDocument(
    idToken: string, 
    retryCount = 0
  ): Promise<{ success: boolean; data?: CanGenerateResult; error?: string }> {
    try {
      const response = await fetch('/api/subscription/can-generate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        // Manejar errores específicos según el código de estado
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' 
          };
        }
        
        if (response.status >= 500) {
          // Reintentar automáticamente para errores del servidor (máximo 2 reintentos)
          if (retryCount < 2) {
            console.log(`Reintentando verificar generación (intento ${retryCount + 1})...`);
            // Esperar un tiempo exponencial antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return this.canGenerateDocument(idToken, retryCount + 1);
          }
          
          return { 
            success: false, 
            error: 'Error del servidor. Por favor, intenta nuevamente más tarde.' 
          };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        return { success: false, error: errorData.error || `Error ${response.status}` };
      }

      const result = await response.json();
      return { success: true, data: result.data };

    } catch (error) {
      // Detectar errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.' 
        };
      }
      
      console.error('Error verificando límites de generación:', error);
      return { 
        success: false, 
        error: 'Error al verificar los límites de generación' 
      };
    }
  }

  /**
   * Registra el uso de un documento
   * @param idToken Token de autenticación del usuario
   * @param documentType Tipo de documento generado
   * @param metadata Metadatos del documento
   * @param retryCount Número de reintentos (para uso interno)
   * @returns Resultado del registro
   */
  async recordDocumentUsage(
    idToken: string,
    documentType: 'worksheet' | 'exam',
    metadata: { subject?: string; grade?: string; language?: string } = {},
    retryCount = 0
  ): Promise<UsageRecordResult> {
    try {
      const response = await fetch('/api/subscription/record-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          documentType,
          subject: metadata.subject,
          grade: metadata.grade,
          language: metadata.language,
        }),
      });

      if (!response.ok) {
        // Manejar errores específicos según el código de estado
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' 
          };
        }
        
        if (response.status >= 500) {
          // Reintentar automáticamente para errores del servidor (máximo 2 reintentos)
          if (retryCount < 2) {
            console.log(`Reintentando registrar uso (intento ${retryCount + 1})...`);
            // Esperar un tiempo exponencial antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return this.recordDocumentUsage(idToken, documentType, metadata, retryCount + 1);
          }
          
          return { 
            success: false, 
            error: 'Error del servidor. El documento se generó pero es posible que no se haya registrado correctamente.' 
          };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        return { success: false, error: errorData.error || `Error ${response.status}` };
      }

      const result = await response.json();
      return { 
        success: true, 
        remainingUses: result.data.remainingUses 
      };

    } catch (error) {
      // Detectar errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.' 
        };
      }
      
      console.error('Error registrando uso de documento:', error);
      return { 
        success: false, 
        error: 'Error al registrar el uso del documento' 
      };
    }
  }

  /**
   * Cancela la suscripción del usuario
   * @param idToken Token de autenticación del usuario
   * @param retryCount Número de reintentos (para uso interno)
   * @returns Resultado de la cancelación
   */
  async cancelSubscription(
    idToken: string, 
    retryCount = 0
  ): Promise<{ success: boolean; cancelAt?: Date; error?: string }> {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        // Manejar errores específicos según el código de estado
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' 
          };
        }
        
        if (response.status >= 500) {
          // Reintentar automáticamente para errores del servidor (máximo 2 reintentos)
          if (retryCount < 2) {
            console.log(`Reintentando cancelar suscripción (intento ${retryCount + 1})...`);
            // Esperar un tiempo exponencial antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return this.cancelSubscription(idToken, retryCount + 1);
          }
          
          return { 
            success: false, 
            error: 'Error del servidor. Por favor, intenta nuevamente más tarde.' 
          };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        return { success: false, error: errorData.error || `Error ${response.status}` };
      }

      const result = await response.json();
      return { 
        success: true, 
        cancelAt: result.data.cancelAt ? new Date(result.data.cancelAt) : undefined 
      };

    } catch (error) {
      // Detectar errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.' 
        };
      }
      
      console.error('Error cancelando suscripción:', error);
      return { 
        success: false, 
        error: 'Error al cancelar la suscripción' 
      };
    }
  }

  /**
   * Reactiva una suscripción cancelada
   * @param idToken Token de autenticación del usuario
   * @param retryCount Número de reintentos (para uso interno)
   * @returns Resultado de la reactivación
   */
  async reactivateSubscription(
    idToken: string,
    retryCount = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        // Manejar errores específicos según el código de estado
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Sesión expirada. Por favor, inicia sesión nuevamente.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.' 
          };
        }
        
        if (response.status >= 500) {
          // Reintentar automáticamente para errores del servidor (máximo 2 reintentos)
          if (retryCount < 2) {
            console.log(`Reintentando reactivar suscripción (intento ${retryCount + 1})...`);
            // Esperar un tiempo exponencial antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return this.reactivateSubscription(idToken, retryCount + 1);
          }
          
          return { 
            success: false, 
            error: 'Error del servidor. Por favor, intenta nuevamente más tarde.' 
          };
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        return { success: false, error: errorData.error || `Error ${response.status}` };
      }

      return { success: true };

    } catch (error) {
      // Detectar errores de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.' 
        };
      }
      
      console.error('Error reactivando suscripción:', error);
      return { 
        success: false, 
        error: 'Error al reactivar la suscripción' 
      };
    }
  }

  /**
   * Verifica si un usuario es Pro basado en el estado de suscripción
   * @param status Estado de suscripción
   * @returns true si el usuario es Pro
   */
  isProUser(status: SubscriptionStatus): boolean {
    return status.isPro && status.isActive;
  }

  /**
   * Obtiene el número de documentos restantes para usuarios gratuitos
   * @param status Estado de suscripción
   * @returns Número de documentos restantes o -1 si es ilimitado
   */
  getRemainingDocuments(status: SubscriptionStatus): number {
    if (status.usage.unlimited) {
      return -1; // Ilimitado
    }
    return Math.max(0, status.usage.limit - status.usage.current);
  }

  /**
   * Formatea la fecha de fin del período para mostrar al usuario
   * @param date Fecha de fin del período
   * @returns Fecha formateada
   */
  formatPeriodEndDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Obtiene un mensaje descriptivo del estado de la suscripción
   * @param status Estado de suscripción
   * @returns Mensaje descriptivo
   */
  getStatusMessage(status: SubscriptionStatus): string {
    if (!status.isActive) {
      const remaining = this.getRemainingDocuments(status);
      if (remaining === 0) {
        return 'Has alcanzado el límite de documentos gratuitos. Actualiza a Pro para acceso ilimitado.';
      }
      return `Te quedan ${remaining} documentos gratuitos. Actualiza a Pro para acceso ilimitado.`;
    }

    if (status.subscription?.cancelAtPeriodEnd) {
      const endDate = this.formatPeriodEndDate(status.subscription.currentPeriodEnd);
      return `Tu suscripción Pro se cancelará el ${endDate}. Puedes reactivarla en cualquier momento.`;
    }

    return 'Tienes acceso Pro con generación ilimitada de documentos.';
  }
}

// Exportar instancia del servicio
const subscriptionClientService = new SubscriptionClientService();
export default subscriptionClientService;