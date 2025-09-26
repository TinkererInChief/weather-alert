/**
 * Circuit Breaker Implementation for External Service Calls
 * Prevents cascading failures by monitoring service availability
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerOptions {
  failureThreshold: number      // Number of failures before opening circuit
  resetTimeout: number          // Time to wait before transitioning to HALF_OPEN (ms)
  monitoringWindow: number      // Time window for failure counting (ms)
  minimumCallsThreshold: number // Minimum calls before calculating failure rate
}

interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  totalCalls: number
  lastFailureTime?: number
  nextAttemptTime?: number
  failureRate: number
}

export class CircuitBreaker {
  private name: string
  private options: CircuitBreakerOptions
  private state: CircuitState = 'CLOSED'
  private failures: number[] = [] // Timestamps of failures
  private successes: number[] = [] // Timestamps of successes
  private lastFailureTime?: number
  private nextAttemptTime?: number

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      minimumCallsThreshold: 10,
      ...options
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    
    // Clean old entries
    this.cleanOldEntries()
    
    // Check if circuit should be opened
    if (this.state === 'CLOSED' && this.shouldOpenCircuit()) {
      this.openCircuit()
    }
    
    // Check if circuit should transition to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.state = 'HALF_OPEN'
    }
    
    // If circuit is open, reject immediately
    if (this.state === 'OPEN') {
      const error = new CircuitBreakerError(
        `Circuit breaker for ${this.name} is OPEN. Next attempt at ${new Date(this.nextAttemptTime!).toISOString()}`
      )
      error.circuitState = this.state
      error.nextAttemptTime = this.nextAttemptTime
      throw error
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private shouldOpenCircuit(): boolean {
    const totalCalls = this.failures.length + this.successes.length
    
    if (totalCalls < this.options.minimumCallsThreshold) {
      return false
    }
    
    const failureRate = this.failures.length / totalCalls
    return failureRate >= (this.options.failureThreshold / 100)
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return false
    return Date.now() >= this.nextAttemptTime
  }

  private openCircuit(): void {
    this.state = 'OPEN'
    this.lastFailureTime = Date.now()
    this.nextAttemptTime = this.lastFailureTime + this.options.resetTimeout
    
    console.warn(`Circuit breaker for ${this.name} opened. Reset attempt at ${new Date(this.nextAttemptTime).toISOString()}`)
  }

  private onSuccess(): void {
    this.successes.push(Date.now())
    
    // If we were in HALF_OPEN state, close the circuit
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      this.nextAttemptTime = undefined
      console.info(`Circuit breaker for ${this.name} closed after successful call`)
    }
  }

  private onFailure(): void {
    this.failures.push(Date.now())
    this.lastFailureTime = Date.now()
    
    // If in HALF_OPEN state, go back to OPEN
    if (this.state === 'HALF_OPEN') {
      this.openCircuit()
    }
  }

  private cleanOldEntries(): void {
    const cutoff = Date.now() - this.options.monitoringWindow
    this.failures = this.failures.filter(time => time > cutoff)
    this.successes = this.successes.filter(time => time > cutoff)
  }

  getStats(): CircuitBreakerStats {
    this.cleanOldEntries()
    const totalCalls = this.failures.length + this.successes.length
    
    return {
      state: this.state,
      failureCount: this.failures.length,
      successCount: this.successes.length,
      totalCalls,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      failureRate: totalCalls > 0 ? (this.failures.length / totalCalls) * 100 : 0
    }
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failures = []
    this.successes = []
    this.lastFailureTime = undefined
    this.nextAttemptTime = undefined
    console.info(`Circuit breaker for ${this.name} manually reset`)
  }
}

export class CircuitBreakerError extends Error {
  public circuitState?: CircuitState
  public nextAttemptTime?: number

  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

// Pre-configured circuit breakers for external services
export const circuitBreakers = {
  twilio: new CircuitBreaker('twilio', {
    failureThreshold: 50, // 50% failure rate
    resetTimeout: 30000, // 30 seconds for critical SMS service
    monitoringWindow: 120000, // 2 minutes
    minimumCallsThreshold: 5
  }),
  
  sendgrid: new CircuitBreaker('sendgrid', {
    failureThreshold: 60, // 60% failure rate (email less critical)
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    minimumCallsThreshold: 5
  }),
  
  usgs: new CircuitBreaker('usgs', {
    failureThreshold: 70, // 70% failure rate (public API, more tolerant)
    resetTimeout: 120000, // 2 minutes
    monitoringWindow: 600000, // 10 minutes
    minimumCallsThreshold: 3
  }),
  
  noaa: new CircuitBreaker('noaa', {
    failureThreshold: 70, // 70% failure rate (public API, more tolerant)
    resetTimeout: 120000, // 2 minutes
    monitoringWindow: 600000, // 10 minutes
    minimumCallsThreshold: 3
  }),
  
  database: new CircuitBreaker('database', {
    failureThreshold: 30, // 30% failure rate (critical service)
    resetTimeout: 10000, // 10 seconds (fast recovery)
    monitoringWindow: 60000, // 1 minute
    minimumCallsThreshold: 10
  }),

  hcaptcha: new CircuitBreaker('hcaptcha', {
    failureThreshold: 60, // 60% failure rate (external service)
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    minimumCallsThreshold: 5
  }),

  geolocation: new CircuitBreaker('geolocation', {
    failureThreshold: 70, // 70% failure rate (free services, more tolerant)
    resetTimeout: 180000, // 3 minutes
    monitoringWindow: 600000, // 10 minutes
    minimumCallsThreshold: 3
  })
}

// Helper function to execute with circuit breaker
export async function executeWithCircuitBreaker<T>(
  breakerName: keyof typeof circuitBreakers,
  fn: () => Promise<T>
): Promise<T> {
  return circuitBreakers[breakerName].execute(fn)
}

// Get all circuit breaker stats for monitoring
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {}
  
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    stats[name] = breaker.getStats()
  }
  
  return stats
}
