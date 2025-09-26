'use client'

/**
 * Security Alert Component
 * Displays security-related notifications and warnings
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, X, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SecurityAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  autoClose?: number // milliseconds
  persistent?: boolean
  timestamp: Date
}

interface SecurityAlertProps {
  alert: SecurityAlert
  onDismiss?: (id: string) => void
  className?: string
}

export function SecurityAlert({ alert, onDismiss, className }: SecurityAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (alert.autoClose && !alert.persistent) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss?.(alert.id), 300) // Allow fade animation
      }, alert.autoClose)
      
      return () => clearTimeout(timer)
    }
  }, [alert.autoClose, alert.persistent, alert.id, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(alert.id), 300)
  }

  const getAlertStyles = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'text-red-600 hover:text-red-800'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'text-yellow-600 hover:text-yellow-800'
        }
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-500',
          title: 'text-green-800',
          message: 'text-green-700',
          button: 'text-green-600 hover:text-green-800'
        }
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'text-blue-600 hover:text-blue-800'
        }
    }
  }

  const getIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const styles = getAlertStyles(alert.type)

  if (!isVisible) return null

  return (
    <div className={cn(
      'border rounded-lg p-4 transition-all duration-300 ease-in-out transform',
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      styles.container,
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          {getIcon(alert.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium', styles.title)}>
            {alert.title}
          </h4>
          <p className={cn('mt-1 text-sm', styles.message)}>
            {alert.message}
          </p>
          
          {alert.action && (
            <div className="mt-3">
              <button
                onClick={alert.action.onClick}
                className={cn(
                  'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  styles.button,
                  'bg-white hover:bg-gray-50 border-gray-300'
                )}
              >
                {alert.action.label}
              </button>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            {alert.timestamp.toLocaleString()}
          </div>
        </div>
        
        {alert.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className={cn('flex-shrink-0', styles.button)}
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Security Alert Manager Component
interface SecurityAlertManagerProps {
  className?: string
  maxAlerts?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function SecurityAlertManager({ 
  className,
  maxAlerts = 5,
  position = 'top-right'
}: SecurityAlertManagerProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])

  useEffect(() => {
    // Listen for security events
    const handleSecurityEvent = (event: CustomEvent<SecurityAlert>) => {
      addAlert(event.detail)
    }

    window.addEventListener('security-alert', handleSecurityEvent as EventListener)
    
    return () => {
      window.removeEventListener('security-alert', handleSecurityEvent as EventListener)
    }
  }, [])

  const addAlert = (alert: SecurityAlert) => {
    setAlerts(prev => {
      const newAlerts = [alert, ...prev].slice(0, maxAlerts)
      return newAlerts
    })
  }

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className={cn(
      'fixed z-50 w-96 max-w-full',
      getPositionClasses(),
      className
    )}>
      <div className="space-y-3">
        {alerts.map(alert => (
          <SecurityAlert
            key={alert.id}
            alert={alert}
            onDismiss={removeAlert}
          />
        ))}
      </div>
    </div>
  )
}

// Utility functions for creating security alerts
export const createSecurityAlert = {
  threatDetected: (details: string): SecurityAlert => ({
    id: `threat-${Date.now()}`,
    type: 'error',
    title: 'Security Threat Detected',
    message: details,
    dismissible: true,
    persistent: true,
    timestamp: new Date(),
    action: {
      label: 'View Details',
      onClick: () => {
        // Navigate to security dashboard
        window.location.href = '/admin/security'
      }
    }
  }),

  captchaFailed: (attempts: number): SecurityAlert => ({
    id: `captcha-${Date.now()}`,
    type: 'warning',
    title: 'CAPTCHA Verification Failed',
    message: `Failed attempt #${attempts}. Additional verification may be required.`,
    dismissible: true,
    autoClose: 5000,
    timestamp: new Date()
  }),

  deviceSuspicious: (deviceInfo: string): SecurityAlert => ({
    id: `device-${Date.now()}`,
    type: 'warning',
    title: 'Suspicious Device Detected',
    message: `Unusual device characteristics detected: ${deviceInfo}`,
    dismissible: true,
    persistent: true,
    timestamp: new Date(),
    action: {
      label: 'Review Device',
      onClick: () => {
        // Open device review modal
        console.log('Opening device review modal')
      }
    }
  }),

  geoBlocked: (location: string): SecurityAlert => ({
    id: `geo-${Date.now()}`,
    type: 'error',
    title: 'Geographic Access Blocked',
    message: `Access attempt from restricted location: ${location}`,
    dismissible: true,
    persistent: true,
    timestamp: new Date()
  }),

  rateLimitExceeded: (endpoint: string): SecurityAlert => ({
    id: `rate-${Date.now()}`,
    type: 'warning',
    title: 'Rate Limit Exceeded',
    message: `Too many requests to ${endpoint}. Temporary restriction applied.`,
    dismissible: true,
    autoClose: 8000,
    timestamp: new Date()
  }),

  sessionSecure: (): SecurityAlert => ({
    id: `session-${Date.now()}`,
    type: 'success',
    title: 'Session Secured',
    message: 'Your session has been successfully validated and secured.',
    dismissible: true,
    autoClose: 3000,
    timestamp: new Date()
  }),

  systemHealthy: (): SecurityAlert => ({
    id: `health-${Date.now()}`,
    type: 'success',
    title: 'Security Systems Operational',
    message: 'All security monitors are functioning normally.',
    dismissible: true,
    autoClose: 5000,
    timestamp: new Date()
  })
}

// Global function to trigger security alerts
export const triggerSecurityAlert = (alert: SecurityAlert) => {
  window.dispatchEvent(new CustomEvent('security-alert', { detail: alert }))
}

// Hook for managing security alerts
export function useSecurityAlerts() {
  const showThreatAlert = (details: string) => {
    triggerSecurityAlert(createSecurityAlert.threatDetected(details))
  }

  const showCaptchaAlert = (attempts: number) => {
    triggerSecurityAlert(createSecurityAlert.captchaFailed(attempts))
  }

  const showDeviceAlert = (deviceInfo: string) => {
    triggerSecurityAlert(createSecurityAlert.deviceSuspicious(deviceInfo))
  }

  const showGeoAlert = (location: string) => {
    triggerSecurityAlert(createSecurityAlert.geoBlocked(location))
  }

  const showRateLimitAlert = (endpoint: string) => {
    triggerSecurityAlert(createSecurityAlert.rateLimitExceeded(endpoint))
  }

  const showSuccessAlert = (type: 'session' | 'system') => {
    const alert = type === 'session' 
      ? createSecurityAlert.sessionSecure()
      : createSecurityAlert.systemHealthy()
    triggerSecurityAlert(alert)
  }

  return {
    showThreatAlert,
    showCaptchaAlert,
    showDeviceAlert,
    showGeoAlert,
    showRateLimitAlert,
    showSuccessAlert
  }
}
