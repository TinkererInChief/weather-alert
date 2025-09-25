'use client'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

export class BrowserNotificationService {
  private static instance: BrowserNotificationService
  private permission: NotificationPermission = 'default'

  private constructor() {
    this.checkPermission()
  }

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService()
    }
    return BrowserNotificationService.instance
  }

  private checkPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission
    }

    return this.permission
  }

  async showNotification(options: NotificationOptions): Promise<boolean> {
    const permission = await this.requestPermission()
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return false
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      })

      // Auto-close after 10 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 10000)
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return true
    } catch (error) {
      console.error('Failed to show notification:', error)
      return false
    }
  }

  async showEmergencyAlert(alertData: {
    type: 'earthquake' | 'tsunami' | 'test'
    magnitude?: number
    location: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }): Promise<boolean> {
    const severityConfig = {
      low: { icon: '🟡', requireInteraction: false },
      medium: { icon: '🟠', requireInteraction: true },
      high: { icon: '🔴', requireInteraction: true },
      critical: { icon: '🚨', requireInteraction: true }
    }

    const config = severityConfig[alertData.severity]
    
    let title = ''
    let body = ''

    switch (alertData.type) {
      case 'earthquake':
        title = `${config.icon} Earthquake Alert`
        body = alertData.magnitude 
          ? `M${alertData.magnitude} earthquake detected near ${alertData.location}`
          : `Earthquake detected near ${alertData.location}`
        break
      case 'tsunami':
        title = `${config.icon} Tsunami Warning`
        body = `Tsunami warning issued for ${alertData.location}`
        break
      case 'test':
        title = `${config.icon} Emergency System Test`
        body = `This is a test of the Emergency Alert System for ${alertData.location}`
        break
    }

    return this.showNotification({
      title,
      body,
      icon: '/emergency-icon.png',
      badge: '/emergency-badge.png',
      tag: `emergency-${alertData.type}`,
      requireInteraction: config.requireInteraction
    })
  }

  async showSystemNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<boolean> {
    const typeConfig = {
      info: { icon: 'ℹ️', title: 'System Information' },
      success: { icon: '✅', title: 'Success' },
      warning: { icon: '⚠️', title: 'Warning' },
      error: { icon: '❌', title: 'Error' }
    }

    const config = typeConfig[type]

    return this.showNotification({
      title: `${config.icon} ${config.title}`,
      body: message,
      tag: `system-${type}`,
      requireInteraction: type === 'error'
    })
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }
}

export const browserNotificationService = BrowserNotificationService.getInstance()
