/**
 * =================================================================================================
 * SERVICIO DE MONITOREO
 * =================================================================================================
 * Este servicio proporciona funcionalidades para monitorear el rendimiento y estado de la aplicación,
 * configurar alertas para eventos críticos y recopilar métricas para análisis.
 */

import loggingService, { LogLevel } from './loggingService';

// Tipos de métricas que se pueden monitorear
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

// Interfaz para configuración de alertas
export interface AlertThreshold {
  metricName: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  duration?: number; // En segundos
  severity: 'warning' | 'error' | 'critical';
}

// Interfaz para métricas
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

/**
 * Servicio de monitoreo de la aplicación
 */
class MonitoringService {
  private metrics: Record<string, Metric[]> = {};
  private alertThresholds: AlertThreshold[] = [];
  private activeAlerts: Record<string, boolean> = {};
  private checkInterval: number | null = null;
  private metricsRetentionTime: number = 24 * 60 * 60 * 1000; // 24 horas en ms
  private isEnabled: boolean = true;
  
  constructor() {
    // Configurar alertas predeterminadas
    this.setupDefaultAlerts();
    
    // Iniciar verificación periódica de alertas
    this.startAlertChecking();
    
    // Configurar limpieza periódica de métricas antiguas
    this.setupMetricsCleanup();
  }

  /**
   * Habilita o deshabilita el servicio de monitoreo
   * @param enabled - true para habilitar, false para deshabilitar
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled && !this.checkInterval) {
      this.startAlertChecking();
    } else if (!enabled && this.checkInterval) {
      this.stopAlertChecking();
    }
    
    loggingService.info(`Servicio de monitoreo ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Registra una métrica de tipo contador
   * @param name - Nombre de la métrica
   * @param increment - Valor a incrementar (por defecto 1)
   * @param tags - Etiquetas para categorizar la métrica
   */
  public incrementCounter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
    if (!this.isEnabled) return;
    
    const metricName = this.formatMetricName(name);
    const currentValue = this.getLastMetricValue(metricName) + increment;
    
    this.recordMetric({
      name: metricName,
      type: MetricType.COUNTER,
      value: currentValue,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Registra una métrica de tipo gauge (valor actual)
   * @param name - Nombre de la métrica
   * @param value - Valor actual
   * @param tags - Etiquetas para categorizar la métrica
   */
  public setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.isEnabled) return;
    
    const metricName = this.formatMetricName(name);
    
    this.recordMetric({
      name: metricName,
      type: MetricType.GAUGE,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Registra un valor en un histograma
   * @param name - Nombre de la métrica
   * @param value - Valor a registrar
   * @param tags - Etiquetas para categorizar la métrica
   */
  public recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.isEnabled) return;
    
    const metricName = this.formatMetricName(name);
    
    this.recordMetric({
      name: metricName,
      type: MetricType.HISTOGRAM,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Inicia la medición de tiempo para una operación
   * @param name - Nombre de la métrica
   * @returns Función para finalizar la medición
   */
  public startTimer(name: string, tags: Record<string, string> = {}): () => void {
    if (!this.isEnabled) return () => {};
    
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordHistogram(name, duration, { ...tags, unit: 'ms' });
    };
  }

  /**
   * Registra el tiempo de ejecución de una función
   * @param name - Nombre de la métrica
   * @param fn - Función a ejecutar y medir
   * @param tags - Etiquetas para categorizar la métrica
   * @returns Resultado de la función
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>, tags: Record<string, string> = {}): Promise<T> {
    if (!this.isEnabled) return fn();
    
    const endTimer = this.startTimer(name, tags);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Configura una alerta basada en una métrica
   * @param threshold - Configuración del umbral de alerta
   */
  public setAlertThreshold(threshold: AlertThreshold): void {
    // Verificar si ya existe una alerta con el mismo nombre
    const existingIndex = this.alertThresholds.findIndex(t => t.metricName === threshold.metricName);
    
    if (existingIndex >= 0) {
      this.alertThresholds[existingIndex] = threshold;
    } else {
      this.alertThresholds.push(threshold);
    }
    
    loggingService.info(`Alerta configurada para ${threshold.metricName}`, { threshold });
  }

  /**
   * Elimina una alerta configurada
   * @param metricName - Nombre de la métrica
   */
  public removeAlertThreshold(metricName: string): void {
    const index = this.alertThresholds.findIndex(t => t.metricName === metricName);
    
    if (index >= 0) {
      this.alertThresholds.splice(index, 1);
      delete this.activeAlerts[metricName];
      loggingService.info(`Alerta eliminada para ${metricName}`);
    }
  }

  /**
   * Obtiene todas las métricas registradas
   * @param filter - Filtro opcional por nombre de métrica
   * @returns Métricas filtradas
   */
  public getMetrics(filter?: string): Record<string, Metric[]> {
    if (!filter) {
      return this.metrics;
    }
    
    const result: Record<string, Metric[]> = {};
    
    Object.keys(this.metrics).forEach(key => {
      if (key.includes(filter)) {
        result[key] = this.metrics[key];
      }
    });
    
    return result;
  }

  /**
   * Obtiene el último valor de una métrica
   * @param name - Nombre de la métrica
   * @returns Último valor registrado o 0 si no existe
   */
  public getLastMetricValue(name: string): number {
    const metricName = this.formatMetricName(name);
    const metricValues = this.metrics[metricName];
    
    if (!metricValues || metricValues.length === 0) {
      return 0;
    }
    
    return metricValues[metricValues.length - 1].value;
  }

  /**
   * Registra una métrica en el sistema
   * @param metric - Métrica a registrar
   */
  private recordMetric(metric: Metric): void {
    if (!this.metrics[metric.name]) {
      this.metrics[metric.name] = [];
    }
    
    this.metrics[metric.name].push(metric);
    
    // Verificar alertas inmediatamente para métricas críticas
    if (this.shouldCheckImmediately(metric.name)) {
      this.checkAlertForMetric(metric.name);
    }
  }

  /**
   * Verifica si una métrica debe ser verificada inmediatamente
   * @param metricName - Nombre de la métrica
   * @returns true si debe verificarse inmediatamente
   */
  private shouldCheckImmediately(metricName: string): boolean {
    // Verificar inmediatamente métricas relacionadas con errores o rendimiento crítico
    return metricName.includes('error') || 
           metricName.includes('critical') || 
           metricName.includes('payment') ||
           metricName.includes('subscription');
  }

  /**
   * Inicia la verificación periódica de alertas
   */
  private startAlertChecking(): void {
    if (this.checkInterval) return;
    
    this.checkInterval = window.setInterval(() => {
      this.checkAllAlerts();
    }, 30000); // Verificar cada 30 segundos
  }

  /**
   * Detiene la verificación periódica de alertas
   */
  private stopAlertChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Verifica todas las alertas configuradas
   */
  private checkAllAlerts(): void {
    if (!this.isEnabled) return;
    
    this.alertThresholds.forEach(threshold => {
      this.checkAlertForMetric(threshold.metricName);
    });
  }

  /**
   * Verifica una alerta específica para una métrica
   * @param metricName - Nombre de la métrica a verificar
   */
  private checkAlertForMetric(metricName: string): void {
    const threshold = this.alertThresholds.find(t => t.metricName === metricName);
    if (!threshold) return;
    
    const currentValue = this.getLastMetricValue(metricName);
    const isTriggered = this.evaluateThreshold(currentValue, threshold);
    
    // Si la alerta cambia de estado, notificar
    if (isTriggered !== this.activeAlerts[metricName]) {
      this.activeAlerts[metricName] = isTriggered;
      
      if (isTriggered) {
        this.triggerAlert(threshold, currentValue);
      } else {
        this.resolveAlert(threshold);
      }
    }
  }

  /**
   * Evalúa si un valor supera un umbral
   * @param value - Valor a evaluar
   * @param threshold - Umbral de comparación
   * @returns true si se supera el umbral
   */
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '==': return value === threshold.value;
      case '!=': return value !== threshold.value;
      default: return false;
    }
  }

  /**
   * Dispara una alerta cuando se supera un umbral
   * @param threshold - Umbral superado
   * @param currentValue - Valor actual de la métrica
   */
  private triggerAlert(threshold: AlertThreshold, currentValue: number): void {
    const message = `Alerta: ${threshold.metricName} ${threshold.operator} ${threshold.value} (actual: ${currentValue})`;
    
    // Determinar nivel de log según severidad
    let logLevel: LogLevel;
    switch (threshold.severity) {
      case 'warning':
        logLevel = LogLevel.WARN;
        break;
      case 'error':
        logLevel = LogLevel.ERROR;
        break;
      case 'critical':
        logLevel = LogLevel.CRITICAL;
        break;
      default:
        logLevel = LogLevel.WARN;
    }
    
    // Registrar alerta en el sistema de logging
    loggingService.log(
      logLevel,
      message,
      {
        metricName: threshold.metricName,
        threshold: threshold.value,
        currentValue,
        operator: threshold.operator
      },
      undefined,
      ['alert', threshold.severity]
    );
  }

  /**
   * Resuelve una alerta cuando vuelve a la normalidad
   * @param threshold - Umbral que volvió a la normalidad
   */
  private resolveAlert(threshold: AlertThreshold): void {
    const message = `Alerta resuelta: ${threshold.metricName} ha vuelto a valores normales`;
    
    loggingService.info(
      message,
      {
        metricName: threshold.metricName,
        threshold: threshold.value
      },
      undefined,
      ['alert-resolved', threshold.severity]
    );
  }

  /**
   * Configura la limpieza periódica de métricas antiguas
   */
  private setupMetricsCleanup(): void {
    // Limpiar métricas antiguas cada hora
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  /**
   * Elimina métricas antiguas para liberar memoria
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoffTime = now - this.metricsRetentionTime;
    
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = this.metrics[key].filter(metric => metric.timestamp >= cutoffTime);
    });
    
    // Eliminar métricas vacías
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].length === 0) {
        delete this.metrics[key];
      }
    });
  }

  /**
   * Formatea el nombre de una métrica para consistencia
   * @param name - Nombre original
   * @returns Nombre formateado
   */
  private formatMetricName(name: string): string {
    // Convertir a minúsculas y reemplazar espacios por guiones bajos
    return name.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Configura alertas predeterminadas para el sistema
   */
  private setupDefaultAlerts(): void {
    // Alertas para errores
    this.setAlertThreshold({
      metricName: 'error_rate',
      operator: '>',
      value: 5, // Más de 5 errores por minuto
      severity: 'error'
    });
    
    // Alertas para tiempos de respuesta
    this.setAlertThreshold({
      metricName: 'api_response_time',
      operator: '>',
      value: 2000, // Más de 2 segundos
      severity: 'warning'
    });
    
    // Alertas para errores de pago
    this.setAlertThreshold({
      metricName: 'payment_error_count',
      operator: '>',
      value: 3, // Más de 3 errores de pago
      severity: 'critical'
    });
    
    // Alertas para uso de memoria
    this.setAlertThreshold({
      metricName: 'memory_usage_mb',
      operator: '>',
      value: 500, // Más de 500 MB
      severity: 'warning'
    });
  }
}

// Exportar instancia del servicio
const monitoringService = new MonitoringService();
export default monitoringService;