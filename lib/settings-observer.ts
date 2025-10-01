/**
 * Settings Observer Pattern
 * 
 * Provides a pub/sub mechanism for system settings changes.
 * Services can subscribe to settings updates and react in real-time.
 */

import { SystemSettings } from './system-settings'
import { EventEmitter } from 'events'

type SettingsChangeHandler = (settings: SystemSettings, previousSettings: SystemSettings | null) => void | Promise<void>

/**
 * Settings Observer - Singleton event emitter for settings changes
 */
class SettingsObserver extends EventEmitter {
  private currentSettings: SystemSettings | null = null
  private handlers: Map<string, SettingsChangeHandler> = new Map()
  
  /**
   * Subscribe to settings changes
   */
  subscribe(name: string, handler: SettingsChangeHandler): void {
    this.handlers.set(name, handler)
    console.log(`📡 [SettingsObserver] Subscribed: ${name}`)
  }
  
  /**
   * Unsubscribe from settings changes
   */
  unsubscribe(name: string): void {
    this.handlers.delete(name)
    console.log(`📡 [SettingsObserver] Unsubscribed: ${name}`)
  }
  
  /**
   * Notify all subscribers of settings change
   */
  async notifyChange(newSettings: SystemSettings): Promise<void> {
    const previousSettings = this.currentSettings
    this.currentSettings = newSettings
    
    console.log(`📡 [SettingsObserver] Notifying ${this.handlers.size} subscribers of settings change`)
    
    const notifications: Promise<void>[] = []
    
    for (const [name, handler] of this.handlers.entries()) {
      try {
        const result = handler(newSettings, previousSettings)
        if (result instanceof Promise) {
          notifications.push(
            result.catch(error => {
              console.error(`❌ [SettingsObserver] Handler "${name}" failed:`, error)
            })
          )
        }
      } catch (error) {
        console.error(`❌ [SettingsObserver] Handler "${name}" threw error:`, error)
      }
    }
    
    // Wait for all async handlers to complete
    await Promise.all(notifications)
    
    console.log(`✅ [SettingsObserver] All subscribers notified`)
  }
  
  /**
   * Get current settings
   */
  getCurrentSettings(): SystemSettings | null {
    return this.currentSettings
  }
  
  /**
   * Check if a specific setting has changed
   */
  hasChanged(
    key: string,
    newSettings: SystemSettings,
    oldSettings: SystemSettings | null
  ): boolean {
    if (!oldSettings) return true
    
    const newValue = this.getNestedValue(newSettings, key)
    const oldValue = this.getNestedValue(oldSettings, key)
    
    return JSON.stringify(newValue) !== JSON.stringify(oldValue)
  }
  
  /**
   * Get nested value from settings object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

// Export singleton instance
export const settingsObserver = new SettingsObserver()

/**
 * Helper function to check if monitoring settings changed
 */
export function monitoringSettingsChanged(
  newSettings: SystemSettings,
  oldSettings: SystemSettings | null
): boolean {
  if (!oldSettings) return true
  
  return (
    newSettings.monitoring.earthquakeMonitoring !== oldSettings.monitoring.earthquakeMonitoring ||
    newSettings.monitoring.tsunamiMonitoring !== oldSettings.monitoring.tsunamiMonitoring ||
    newSettings.monitoring.checkInterval !== oldSettings.monitoring.checkInterval ||
    newSettings.monitoring.magnitudeThreshold !== oldSettings.monitoring.magnitudeThreshold
  )
}

/**
 * Helper function to check if notification settings changed
 */
export function notificationSettingsChanged(
  newSettings: SystemSettings,
  oldSettings: SystemSettings | null
): boolean {
  if (!oldSettings) return true
  
  return JSON.stringify(newSettings.notifications) !== JSON.stringify(oldSettings.notifications)
}

/**
 * Helper function to check if alert level settings changed
 */
export function alertLevelSettingsChanged(
  newSettings: SystemSettings,
  oldSettings: SystemSettings | null
): boolean {
  if (!oldSettings) return true
  
  return JSON.stringify(newSettings.alertLevels) !== JSON.stringify(oldSettings.alertLevels)
}
