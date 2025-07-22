/**
 * =================================================================================================
 * SERVICIO DE LOGGING Y MONITOREO
 * =================================================================================================
 * Este servicio proporciona funcionalidades para logging estructurado, captura de errores
 * y configuración de alertas para eventos críticos.
 */

// Niveles de log
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Interfaz para logs estructurados
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

// Interfaz para configuración de alertas
export interface AlertConfig {
  enabled: boolean;
  minLevel: LogLevel;
  channels: {
    email?: boolean;
    slack?: boolean;
    dashboard?: boolean;
  };
  recipients?: string[];
}

/**
 * Servicio de logging estructurado y monitoreo
 */
class LoggingService {
  private alertConfig: AlertConfig;
  private sessionId: string;
  private environment: string;
  private logs: LogEntry[] = [];
  private maxLogsInMemory: number = 1000;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.environment = process.env.NODE_ENV || 'development';
    
    // Configuración por defecto para alertas
    this.alertConfig = {
      enabled: true,
      minLevel: LogLevel.ERROR,
      channels: {
        email: false,
        slack: true,
        dashboard: true
      }
    };
  }

  /**
   * Configura las opciones de alertas
   * @param config - Configuración de alertas
   */
  public configureAlerts(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Registra un mensaje de log
   * @param level - Nivel de log
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public log(
    level: LogLevel,
    message: string,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    const timestamp = new Date().toISOString();
    
    // Crear entrada de log estructurada
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context,
      userId,
      sessionId: this.sessionId,
      tags: [...tags, this.environment]
    };
    
    // Almacenar log en memoria (limitado)
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift(); // Eliminar el log más antiguo
    }
    
    // Enviar a consola con formato adecuado
    this.outputToConsole(logEntry);
    
    // Enviar a servicios externos si está configurado
    this.sendToExternalServices(logEntry);
    
    // Verificar si se debe enviar alerta
    this.checkForAlert(logEntry);
    
    return logEntry;
  }

  /**
   * Registra un mensaje de nivel debug
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public debug(
    message: string,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    return this.log(LogLevel.DEBUG, message, context, userId, tags);
  }

  /**
   * Registra un mensaje de nivel info
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public info(
    message: string,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    return this.log(LogLevel.INFO, message, context, userId, tags);
  }

  /**
   * Registra un mensaje de nivel warn
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public warn(
    message: string,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    return this.log(LogLevel.WARN, message, context, userId, tags);
  }

  /**
   * Registra un mensaje de nivel error
   * @param message - Mensaje a registrar
   * @param error - Error a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public error(
    message: string,
    error: Error | unknown,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    const errorContext = this.formatError(error);
    return this.log(
      LogLevel.ERROR,
      message,
      { ...context, error: errorContext },
      userId,
      tags
    );
  }

  /**
   * Registra un mensaje de nivel crítico
   * @param message - Mensaje a registrar
   * @param error - Error a registrar
   * @param context - Contexto adicional
   * @param userId - ID del usuario (opcional)
   * @param tags - Etiquetas para categorizar el log
   */
  public critical(
    message: string,
    error: Error | unknown,
    context: Record<string, any> = {},
    userId?: string,
    tags: string[] = []
  ): LogEntry {
    const errorContext = this.formatError(error);
    return this.log(
      LogLevel.CRITICAL,
      message,
      { ...context, error: errorContext },
      userId,
      [...tags, 'critical']
    );
  }

  /**
   * Obtiene los logs almacenados en memoria
   * @param level - Filtrar por nivel (opcional)
   * @param limit - Límite de logs a devolver
   * @returns Array de logs filtrados
   */
  public getLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }

  /**
   * Formatea un error para incluirlo en el log
   * @param error - Error a formatear
   * @returns Objeto con información del error
   */
  private formatError(error: Error | unknown): Record<string, any> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
    }
    
    return { raw: String(error) };
  }

  /**
   * Envía el log a la consola con formato adecuado
   * @param logEntry - Entrada de log a enviar
   */
  private outputToConsole(logEntry: LogEntry): void {
    const { level, message, context, userId, sessionId } = logEntry;
    
    // Formatear mensaje para consola
    let consoleMessage = `[${level.toUpperCase()}] ${message}`;
    if (userId) consoleMessage += ` | User: ${userId}`;
    if (sessionId) consoleMessage += ` | Session: ${sessionId}`;
    
    // Usar método de consola adecuado según nivel
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage, context || '');
        break;
      case LogLevel.INFO:
        console.info(consoleMessage, context || '');
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, context || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(consoleMessage, context || '');
        break;
    }
  }

  /**
   * Envía el log a servicios externos configurados
   * @param logEntry - Entrada de log a enviar
   */
  private sendToExternalServices(logEntry: LogEntry): void {
    // En producción, aquí se enviarían los logs a servicios como:
    // - Elasticsearch/Kibana
    // - Datadog
    // - Sentry
    // - CloudWatch
    
    if (this.environment === 'production') {
      // Ejemplo: enviar a Sentry si es error o crítico
      if (logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL) {
        this.sendToSentry(logEntry);
      }
    }
  }

  /**
   * Envía el log a Sentry (simulado)
   * @param logEntry - Entrada de log a enviar
   */
  private sendToSentry(logEntry: LogEntry): void {
    // Simulación de envío a Sentry
    console.debug('Sending to Sentry:', logEntry);
    
    // En implementación real:
    // Sentry.captureException(logEntry.context?.error, {
    //   level: logEntry.level,
    //   user: logEntry.userId ? { id: logEntry.userId } : undefined,
    //   tags: logEntry.tags?.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}),
    //   extra: logEntry.context
    // });
  }

  /**
   * Verifica si se debe enviar una alerta basada en el nivel del log
   * @param logEntry - Entrada de log a verificar
   */
  private checkForAlert(logEntry: LogEntry): void {
    const { level } = logEntry;
    const shouldAlert = this.alertConfig.enabled && this.shouldTriggerAlert(level);
    
    if (shouldAlert) {
      this.sendAlert(logEntry);
    }
  }

  /**
   * Determina si un nivel de log debe disparar una alerta
   * @param level - Nivel de log a verificar
   * @returns true si debe disparar alerta
   */
  private shouldTriggerAlert(level: LogLevel): boolean {
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.CRITICAL]: 4
    };
    
    return levelPriority[level] >= levelPriority[this.alertConfig.minLevel];
  }

  /**
   * Envía una alerta a los canales configurados
   * @param logEntry - Entrada de log que disparó la alerta
   */
  private sendAlert(logEntry: LogEntry): void {
    const { channels } = this.alertConfig;
    
    // Simulación de envío de alertas
    if (channels.email && this.alertConfig.recipients?.length) {
      console.debug('Sending email alert to:', this.alertConfig.recipients);
    }
    
    if (channels.slack) {
      console.debug('Sending Slack alert');
    }
    
    if (channels.dashboard) {
      console.debug('Sending dashboard alert');
    }
    
    // En implementación real:
    // - Enviar emails usando nodemailer o similar
    // - Enviar mensajes a Slack usando webhooks
    // - Actualizar estado en dashboard en tiempo real
  }

  /**
   * Genera un ID único para la sesión actual
   * @returns ID de sesión
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Exportamos una instancia del servicio
const loggingService = new LoggingService();
export default loggingService;