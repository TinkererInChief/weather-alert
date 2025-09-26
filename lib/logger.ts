import winston from 'winston'

// Define log levels with priorities
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Tell winston about our custom levels and colors
winston.addColors(logColors)

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info
    
    const logEntry: Record<string, any> = {
      timestamp,
      level: level.toUpperCase(),
      service: 'emergency-alert-system',
      environment: process.env.NODE_ENV || 'development',
      message,
    }
    
    if (stack) {
      logEntry.stack = stack
    }
    
    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta
    }
    
    return JSON.stringify(logEntry)
  })
)

// Console format for development (human readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info
    const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : ''
    const stackStr = stack ? `\n${stack}` : ''
    return `${timestamp} [${level}]: ${message}${metaStr}${stackStr}`
  })
)

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: structuredFormat,
  defaultMeta: {
    service: 'emergency-alert-system',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
    }),
    
    // File transport for errors (always enabled)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs (only in production)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ] : []),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
})

// Security and audit logging
export interface SecurityLogData {
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  action: string
  resource?: string
  success: boolean
  reason?: string
  metadata?: Record<string, any>
  [key: string]: unknown
}

export interface PerformanceLogData {
  operation: string
  duration: number
  success: boolean
  metadata?: Record<string, any>
}

export interface AlertLogData {
  alertId?: string
  type: 'earthquake' | 'tsunami' | 'test'
  severity: number
  contactCount: number
  channels: string[]
  success: boolean
  errors?: string[]
  metadata?: Record<string, any>
}

// Enhanced logging functions with context
export const log = {
  // Standard logging levels
  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack, ...meta })
    } else if (error) {
      logger.error(message, { error: String(error), ...meta })
    } else {
      logger.error(message, meta)
    }
  },

  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta)
  },

  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta)
  },

  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta)
  },

  http: (message: string, meta?: Record<string, any>) => {
    logger.http(message, meta)
  },

  // Specialized logging functions
  security: (message: string, data: SecurityLogData) => {
    logger.info(message, {
      type: 'security',
      timestamp: new Date().toISOString(),
      ...data
    })
  },

  performance: (message: string, data: PerformanceLogData) => {
    const level = data.duration > 5000 ? 'warn' : 'info'
    logger.log(level, message, {
      type: 'performance',
      timestamp: new Date().toISOString(),
      ...data
    })
  },

  alert: (message: string, data: AlertLogData) => {
    const level = data.success ? 'info' : 'error'
    logger.log(level, message, {
      ...data,
      logType: 'alert', // Renamed to avoid conflict
      timestamp: new Date().toISOString()
    })
  },

  rateLimitViolation: (ip: string, endpoint: string, limit: number) => {
    logger.warn('Rate limit violation', {
      type: 'rate_limit',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    })
  },

  authFailure: (phone: string, ip: string, reason: string) => {
    logger.warn('Authentication failure', {
      type: 'auth_failure',
      phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
      ip,
      reason,
      timestamp: new Date().toISOString()
    })
  },

  circuitBreakerStateChange: (service: string, oldState: string, newState: string) => {
    logger.warn('Circuit breaker state change', {
      type: 'circuit_breaker',
      service,
      oldState,
      newState,
      timestamp: new Date().toISOString()
    })
  },

  // Request logging middleware helper
  request: (req: Request, res: Response, duration: number) => {
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    logger.http('HTTP Request', {
      type: 'http_request',
      method: req.method,
      url: req.url,
      ip: clientIp,
      userAgent: userAgent.substring(0, 200), // Limit user agent length
      duration,
      timestamp: new Date().toISOString()
    })
  }
}

// Performance monitoring wrapper
export function withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      
      log.performance(`${operation} completed`, {
        operation,
        duration,
        success: true
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      log.performance(`${operation} failed`, {
        operation,
        duration,
        success: false,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      })
      
      throw error
    }
  }) as T
}

// Create logs directory if it doesn't exist (for file transports)
if (typeof window === 'undefined') {
  import('fs').then(fs => {
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true })
    }
  }).catch(() => {
    // Ignore errors creating logs directory
  })
}

export default logger
