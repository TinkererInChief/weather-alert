/**
 * Centralized Secrets Management
 * Provides secure access to environment variables and sensitive configuration
 */

import { log } from './logger'

// Build-time flag to skip strict validation (set only during Docker build stage)
const SKIP_SECRETS_VALIDATION = process.env.SKIP_SECRETS_VALIDATION === 'true'

// Define all required environment variables
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string
  
  // NextAuth
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  
  // OTP Configuration
  OTP_SECRET: string
  OTP_LENGTH: string
  OTP_EXPIRY_MINUTES: string
  OTP_MAX_ATTEMPTS: string
  
  // Twilio
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_PHONE_NUMBER: string
  TWILIO_WHATSAPP_NUMBER?: string
  
  // SendGrid
  SENDGRID_API_KEY: string
  SENDGRID_FROM_EMAIL: string
  SENDGRID_FROM_NAME?: string
  
  // Redis
  REDIS_URL?: string
  REDIS_TOKEN?: string
  
  // Application
  NODE_ENV: string
  LOG_LEVEL?: string
  
  // Monitoring (optional)
  SENTRY_DSN?: string
  DATADOG_API_KEY?: string
  
  // Rate Limiting
  RATE_LIMIT_REDIS_URL?: string
  
  // CAPTCHA (hCaptcha)
  HCAPTCHA_SITE_KEY?: string
  HCAPTCHA_SECRET_KEY?: string
  CAPTCHA_FAIL_OPEN?: string
  EXPECTED_HOSTNAME?: string
  
  // IP Geolocation
  IPINFO_TOKEN?: string
}

// Validation patterns for different secret types
const secretValidation = {
  // Generic HTTP(S) URL
  url: /^https?:\/\/[^\s]+$/,
  // Database connection strings (support common drivers; primary target is PostgreSQL)
  dbUrl: /^(postgres(?:ql)?:\/\/[^\s]+|mysql:\/\/[^\s]+|mariadb:\/\/[^\s]+|sqlserver:\/\/[^\s]+|mongodb(?:\+srv)?:\/\/[^\s]+|sqlite:\/\/[^\s]+|file:.*)$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+[1-9]\d{1,14}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  base64: /^[A-Za-z0-9+/]+=*$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
}

// Secret classification for logging and audit
enum SecretType {
  DATABASE = 'database',
  API_KEY = 'api_key',
  TOKEN = 'token',
  URL = 'url',
  PHONE = 'phone',
  EMAIL = 'email',
  CONFIG = 'config'
}

interface SecretConfig {
  required: boolean
  type: SecretType
  validation?: RegExp
  masked?: boolean
  description: string
}

// Configuration for all secrets
const secretsConfig: Record<keyof EnvironmentConfig, SecretConfig> = {
  DATABASE_URL: {
    required: true,
    type: SecretType.DATABASE,
    validation: secretValidation.dbUrl,
    masked: true,
    description: 'Database connection string (e.g., postgresql://...)'
  },
  NEXTAUTH_SECRET: {
    required: true,
    type: SecretType.TOKEN,
    validation: /^.{32,}$/, // At least 32 characters
    masked: true,
    description: 'NextAuth.js encryption secret'
  },
  NEXTAUTH_URL: {
    required: true,
    type: SecretType.URL,
    validation: secretValidation.url,
    masked: false,
    description: 'NextAuth.js callback URL'
  },
  OTP_SECRET: {
    required: true,
    type: SecretType.TOKEN,
    validation: /^.{16,}$/, // At least 16 characters
    masked: true,
    description: 'OTP generation secret'
  },
  OTP_LENGTH: {
    required: true,
    type: SecretType.CONFIG,
    validation: /^[4-8]$/, // 4-8 digits
    masked: false,
    description: 'OTP code length'
  },
  OTP_EXPIRY_MINUTES: {
    required: true,
    type: SecretType.CONFIG,
    validation: /^[1-9]\d*$/, // Positive integer
    masked: false,
    description: 'OTP expiry time in minutes'
  },
  OTP_MAX_ATTEMPTS: {
    required: true,
    type: SecretType.CONFIG,
    validation: /^[1-9]\d*$/, // Positive integer
    masked: false,
    description: 'Maximum OTP verification attempts'
  },
  TWILIO_ACCOUNT_SID: {
    required: true,
    type: SecretType.API_KEY,
    validation: /^AC[a-z0-9]{32}$/i,
    masked: true,
    description: 'Twilio account SID'
  },
  TWILIO_AUTH_TOKEN: {
    required: true,
    type: SecretType.TOKEN,
    validation: /^[a-z0-9]{32}$/i,
    masked: true,
    description: 'Twilio authentication token'
  },
  TWILIO_PHONE_NUMBER: {
    required: true,
    type: SecretType.PHONE,
    validation: secretValidation.phone,
    masked: false,
    description: 'Twilio SMS phone number'
  },
  TWILIO_WHATSAPP_NUMBER: {
    required: false,
    type: SecretType.PHONE,
    validation: secretValidation.phone,
    masked: false,
    description: 'Twilio WhatsApp number'
  },
  SENDGRID_API_KEY: {
    required: true,
    type: SecretType.API_KEY,
    validation: /^SG\..{66}$/,
    masked: true,
    description: 'SendGrid API key'
  },
  SENDGRID_FROM_EMAIL: {
    required: true,
    type: SecretType.EMAIL,
    validation: secretValidation.email,
    masked: false,
    description: 'SendGrid sender email address'
  },
  SENDGRID_FROM_NAME: {
    required: false,
    type: SecretType.CONFIG,
    validation: /^.{1,100}$/,
    masked: false,
    description: 'SendGrid sender name'
  },
  REDIS_URL: {
    required: false,
    type: SecretType.URL,
    validation: /^redis:\/\/[^\s]+$/,
    masked: true,
    description: 'Redis connection URL'
  },
  REDIS_TOKEN: {
    required: false,
    type: SecretType.TOKEN,
    masked: true,
    description: 'Redis authentication token'
  },
  NODE_ENV: {
    required: true,
    type: SecretType.CONFIG,
    validation: /^(development|production|test)$/,
    masked: false,
    description: 'Node.js environment'
  },
  LOG_LEVEL: {
    required: false,
    type: SecretType.CONFIG,
    validation: /^(error|warn|info|http|debug)$/,
    masked: false,
    description: 'Logging level'
  },
  SENTRY_DSN: {
    required: false,
    type: SecretType.URL,
    validation: secretValidation.url,
    masked: true,
    description: 'Sentry error tracking DSN'
  },
  DATADOG_API_KEY: {
    required: false,
    type: SecretType.API_KEY,
    validation: /^[a-z0-9]{32}$/i,
    masked: true,
    description: 'DataDog monitoring API key'
  },
  RATE_LIMIT_REDIS_URL: {
    required: false,
    type: SecretType.URL,
    validation: /^redis:\/\/[^\s]+$/,
    masked: true,
    description: 'Redis URL for rate limiting'
  },
  HCAPTCHA_SITE_KEY: {
    required: false,
    type: SecretType.API_KEY,
    validation: /^[a-z0-9-]{8,}$/i,
    masked: false,
    description: 'hCaptcha site key for client-side integration'
  },
  HCAPTCHA_SECRET_KEY: {
    required: false,
    type: SecretType.TOKEN,
    validation: /^[a-z0-9-]{8,}$/i,
    masked: true,
    description: 'hCaptcha secret key for server-side verification'
  },
  CAPTCHA_FAIL_OPEN: {
    required: false,
    type: SecretType.CONFIG,
    validation: /^(true|false)$/,
    masked: false,
    description: 'Whether to allow requests when CAPTCHA service fails'
  },
  EXPECTED_HOSTNAME: {
    required: false,
    type: SecretType.CONFIG,
    validation: /^[a-zA-Z0-9.-]+$/,
    masked: false,
    description: 'Expected hostname for CAPTCHA verification'
  },
  IPINFO_TOKEN: {
    required: false,
    type: SecretType.API_KEY,
    validation: /^[a-z0-9]{14}$/i,
    masked: true,
    description: 'IPInfo.io API token for enhanced geolocation data'
  }
}

class SecretsManager {
  private config: EnvironmentConfig
  private validated: boolean = false
  private validationErrors: string[] = []

  constructor() {
    this.config = this.loadFromEnvironment()
    this.validateSecrets()
  }

  private loadFromEnvironment(): EnvironmentConfig {
    const env: any = {}
    
    for (const [key, config] of Object.entries(secretsConfig)) {
      const value = process.env[key]
      
      if (config.required && !value) {
        this.validationErrors.push(`Required environment variable ${key} is not set`)
      }
      
      if (value && config.validation && !config.validation.test(value)) {
        this.validationErrors.push(`Environment variable ${key} has invalid format`)
      }
      
      env[key] = value || undefined
    }
    
    return env as EnvironmentConfig
  }

  private validateSecrets(): void {
    if (this.validationErrors.length > 0) {
      log.error('Environment validation failed', new Error('Invalid configuration'), {
        errors: this.validationErrors,
        environment: process.env.NODE_ENV
      })
      
      // Do not block builds: allow skipping validation strictly during build time
      if (process.env.NODE_ENV === 'production' && !SKIP_SECRETS_VALIDATION) {
        throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`)
      }
    } else {
      this.validated = true
      log.info('Environment validation successful', {
        configuredSecrets: Object.keys(secretsConfig).filter(key => !!this.config[key as keyof EnvironmentConfig]).length,
        totalSecrets: Object.keys(secretsConfig).length,
        environment: process.env.NODE_ENV
      })
    }
  }

  // Get a secret with optional default value
  get<K extends keyof EnvironmentConfig>(
    key: K, 
    defaultValue?: string
  ): EnvironmentConfig[K] {
    if (!this.validated && process.env.NODE_ENV === 'production' && !SKIP_SECRETS_VALIDATION) {
      throw new Error('Secrets not validated. Cannot access secrets in production.')
    }
    
    const value = this.config[key] || defaultValue
    
    if (!value && secretsConfig[key].required) {
      // During build (skip mode), avoid throwing to prevent Next.js from failing when importing modules
      if (SKIP_SECRETS_VALIDATION) {
        return '' as EnvironmentConfig[K]
      }
      throw new Error(`Required secret ${key} is not available`)
    }
    
    return value as EnvironmentConfig[K]
  }

  // Get a secret as number with validation
  getNumber(key: keyof EnvironmentConfig, defaultValue?: number): number {
    const value = this.get(key, defaultValue?.toString())
    if (!value) return defaultValue || 0
    
    const num = parseInt(value, 10)
    if (isNaN(num)) {
      throw new Error(`Secret ${key} is not a valid number: ${value}`)
    }
    
    return num
  }

  // Get a secret as boolean
  getBoolean(key: keyof EnvironmentConfig, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue?.toString())
    if (!value) return defaultValue || false
    
    return value.toLowerCase() === 'true'
  }

  // Check if a secret is configured
  has(key: keyof EnvironmentConfig): boolean {
    return !!this.config[key]
  }

  // Get masked value for logging
  getMasked(key: keyof EnvironmentConfig): string {
    const value = this.config[key]
    if (!value) return 'NOT_SET'
    
    const config = secretsConfig[key]
    if (!config.masked) return value
    
    // Mask the secret but show some characters for identification
    if (value.length <= 4) return '***'
    return `${value.slice(0, 2)}***${value.slice(-2)}`
  }

  // Get configuration summary for health checks
  getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {}
    
    for (const [key, config] of Object.entries(secretsConfig)) {
      summary[key] = {
        configured: this.has(key as keyof EnvironmentConfig),
        required: config.required,
        type: config.type,
        description: config.description,
        ...(this.has(key as keyof EnvironmentConfig) && { 
          value: this.getMasked(key as keyof EnvironmentConfig) 
        })
      }
    }
    
    return summary
  }

  // Audit all secrets configuration
  audit(): void {
    log.security('Secrets configuration audit', {
      success: this.validated,
      action: 'audit_secrets',
      metadata: {
        totalSecrets: Object.keys(secretsConfig).length,
        configuredSecrets: Object.keys(secretsConfig).filter(key => 
          this.has(key as keyof EnvironmentConfig)
        ).length,
        requiredSecrets: Object.values(secretsConfig).filter(c => c.required).length,
        validationErrors: this.validationErrors.length,
        environment: process.env.NODE_ENV
      }
    })
  }
}

// Singleton instance
export const secrets = new SecretsManager()

// Convenience functions
export const getSecret = <K extends keyof EnvironmentConfig>(
  key: K, 
  defaultValue?: string
): EnvironmentConfig[K] => secrets.get(key, defaultValue)

export const getSecretNumber = (key: keyof EnvironmentConfig, defaultValue?: number): number => 
  secrets.getNumber(key, defaultValue)

export const getSecretBoolean = (key: keyof EnvironmentConfig, defaultValue?: boolean): boolean => 
  secrets.getBoolean(key, defaultValue)

export const hasSecret = (key: keyof EnvironmentConfig): boolean => secrets.has(key)

// Initialize secrets validation on module load
if (typeof process !== 'undefined') {
  secrets.audit()
}
