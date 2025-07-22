/**
 * =================================================================================================
 * SERVICIO DE CACHÉ
 * =================================================================================================
 * Este servicio proporciona una capa de caché en memoria para mejorar el rendimiento
 * de operaciones frecuentes y reducir la carga en la base de datos.
 */

/**
 * Clase para gestionar caché en memoria con expiración
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
  }

  /**
   * Genera una clave única para el caché
   * @param {string} namespace - Espacio de nombres para agrupar elementos relacionados
   * @param {string} key - Identificador único dentro del namespace
   * @returns {string} - Clave combinada
   */
  _generateKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  /**
   * Almacena un valor en caché
   * @param {string} namespace - Espacio de nombres
   * @param {string} key - Clave única
   * @param {any} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en milisegundos (opcional)
   */
  set(namespace, key, value, ttl = this.defaultTTL) {
    const cacheKey = this._generateKey(namespace, key);
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(cacheKey, {
      value,
      expiresAt
    });
    
    // Programar limpieza automática
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, ttl);
  }

  /**
   * Obtiene un valor de la caché
   * @param {string} namespace - Espacio de nombres
   * @param {string} key - Clave única
   * @returns {any|null} - Valor almacenado o null si no existe o expiró
   */
  get(namespace, key) {
    const cacheKey = this._generateKey(namespace, key);
    const item = this.cache.get(cacheKey);
    
    if (!item) {
      return null;
    }
    
    // Verificar si expiró
    if (item.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return item.value;
  }

  /**
   * Elimina un valor específico de la caché
   * @param {string} namespace - Espacio de nombres
   * @param {string} key - Clave única
   */
  delete(namespace, key) {
    const cacheKey = this._generateKey(namespace, key);
    this.cache.delete(cacheKey);
  }

  /**
   * Elimina todos los valores de un namespace
   * @param {string} namespace - Espacio de nombres a limpiar
   */
  clearNamespace(namespace) {
    const prefix = `${namespace}:`;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia toda la caché
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtiene un valor de la caché o lo genera si no existe
   * @param {string} namespace - Espacio de nombres
   * @param {string} key - Clave única
   * @param {Function} fetchFn - Función asíncrona que genera el valor si no está en caché
   * @param {number} ttl - Tiempo de vida en milisegundos (opcional)
   * @returns {Promise<any>} - Valor de la caché o generado por fetchFn
   */
  async getOrSet(namespace, key, fetchFn, ttl = this.defaultTTL) {
    // Intentar obtener de la caché primero
    const cachedValue = this.get(namespace, key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Si no está en caché, generar el valor
    const value = await fetchFn();
    
    // Almacenar en caché si el valor no es null o undefined
    if (value !== null && value !== undefined) {
      this.set(namespace, key, value, ttl);
    }
    
    return value;
  }
}

// Exportamos una instancia del servicio
const cacheService = new CacheService();
export default cacheService;