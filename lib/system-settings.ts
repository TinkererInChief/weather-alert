import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { alertManager } from '@/lib/alert-manager'
import { tsunamiMonitor } from '@/lib/tsunami-monitor'
import { settingsObserver } from './settings-observer'

// Schema mirrors the UI structure
export const SystemSettingsSchema = z.object({
  monitoring: z.object({
    earthquakeMonitoring: z.boolean(),
    tsunamiMonitoring: z.boolean(),
    checkInterval: z.number().int().min(10).max(3600), // seconds
    magnitudeThreshold: z.number().min(0).max(10),
  }),
  notifications: z.object({
    sms: z.object({ enabled: z.boolean(), priority: z.number().int().min(1).max(5) }),
    email: z.object({ enabled: z.boolean(), priority: z.number().int().min(1).max(5) }),
    whatsapp: z.object({ enabled: z.boolean(), priority: z.number().int().min(1).max(5) }),
    voice: z.object({ enabled: z.boolean(), priority: z.number().int().min(1).max(5) }),
  }),
  alertLevels: z.object({
    low: z.object({ magnitude: z.number(), channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
    medium: z.object({ magnitude: z.number(), channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
    high: z.object({ magnitude: z.number(), channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
    critical: z.object({ magnitude: z.number(), channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
  }),
  system: z.object({
    timezone: z.string(),
    language: z.string(),
    logLevel: z.enum(['error','warn','info','debug']),
    retentionDays: z.number().int().min(7).max(365),
  }),
})

export type SystemSettings = z.infer<typeof SystemSettingsSchema>

const defaultSettings = (): SystemSettings => ({
  monitoring: {
    earthquakeMonitoring: true,
    tsunamiMonitoring: true,
    checkInterval: 60,
    magnitudeThreshold: 4,
  },
  notifications: {
    sms: { enabled: true, priority: 1 },
    email: { enabled: true, priority: 3 },
    whatsapp: { enabled: true, priority: 2 },
    voice: { enabled: true, priority: 4 },
  },
  alertLevels: {
    low: { magnitude: 4.0, channels: ['sms','email'] },
    medium: { magnitude: 5.0, channels: ['sms','email','whatsapp'] },
    high: { magnitude: 6.0, channels: ['sms','email','whatsapp','voice'] },
    critical: { magnitude: 7.0, channels: ['sms','email','whatsapp','voice'] },
  },
  system: {
    timezone: 'UTC',
    language: 'en',
    logLevel: 'info',
    retentionDays: 90,
  },
})

export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await prisma.systemSettings.findUnique({ where: { id: 'global' } })
  if (!row || !row.settings) return defaultSettings()

  const parsed = SystemSettingsSchema.safeParse(row.settings)
  if (!parsed.success) return defaultSettings()
  return parsed.data
}

export async function saveSystemSettings(input: unknown, updatedBy?: string): Promise<SystemSettings> {
  const parsed = SystemSettingsSchema.parse(input)

  await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: { settings: parsed, updatedBy },
    create: { id: 'global', settings: parsed, updatedBy },
  })

  // Notify all observers of settings change (non-blocking)
  settingsObserver.notifyChange(parsed).catch(error => {
    console.error('❌ [Settings] Failed to notify observers:', error)
  })

  return parsed
}

export async function applySettings(settings: SystemSettings): Promise<void> {
  try {
    // Earthquake monitoring via AlertManager
    const intervalMs = Math.max(10, settings.monitoring.checkInterval) * 1000
    if (settings.monitoring.earthquakeMonitoring) {
      // Ensure interval changes take effect by restarting
      alertManager.stopMonitoring()
      alertManager.startMonitoring(intervalMs)
    } else {
      alertManager.stopMonitoring()
    }
  } catch (e) {
    console.warn('[settings] Failed to apply earthquake monitoring config', e)
  }

  try {
    // Tsunami monitor config uses minutes for checkInterval
    const minutes = Math.max(1, Math.round(settings.monitoring.checkInterval / 60))
    tsunamiMonitor.updateConfig({
      checkInterval: minutes,
      alertThresholds: {
        minimumMagnitude: settings.monitoring.magnitudeThreshold,
        maximumDepth: 100,
        coastalProximity: 100,
      },
      notificationSettings: {
        enableSMS: settings.notifications.sms.enabled,
        enableEmail: settings.notifications.email.enabled,
        priorityLevels: tsunamiMonitor.getStatus().config.notificationSettings.priorityLevels,
      },
    })

    if (settings.monitoring.tsunamiMonitoring) {
      // Restart to apply new interval
      tsunamiMonitor.stopMonitoring()
      await tsunamiMonitor.startMonitoring()
    } else {
      tsunamiMonitor.stopMonitoring()
    }
  } catch (e) {
    console.warn('[settings] Failed to apply tsunami monitoring config', e)
  }
}

/**
 * Initialize settings system and subscribe services to changes
 * Should be called once at application startup
 */
export async function initializeSettingsSystem(): Promise<void> {
  console.log('🔧 [Settings] Initializing settings system...')
  
  // Subscribe alert manager to settings changes
  settingsObserver.subscribe('alertManager', async (newSettings, oldSettings) => {
    console.log('🔄 [AlertManager] Applying new settings...')
    
    const intervalMs = Math.max(10, newSettings.monitoring.checkInterval) * 1000
    const wasMonitoring = alertManager.getMonitoringStatus().isMonitoring
    const shouldMonitor = newSettings.monitoring.earthquakeMonitoring
    
    // Check if interval changed
    const intervalChanged = !oldSettings || 
      oldSettings.monitoring.checkInterval !== newSettings.monitoring.checkInterval
    
    if (shouldMonitor) {
      if (!wasMonitoring || intervalChanged) {
        alertManager.stopMonitoring()
        alertManager.startMonitoring(intervalMs)
        console.log(`✅ [AlertManager] Monitoring ${intervalChanged ? 'restarted' : 'started'} with ${intervalMs/1000}s interval`)
      }
    } else if (wasMonitoring) {
      alertManager.stopMonitoring()
      console.log('✅ [AlertManager] Monitoring stopped')
    }
  })
  
  // Subscribe tsunami monitor to settings changes
  settingsObserver.subscribe('tsunamiMonitor', async (newSettings, oldSettings) => {
    console.log('🔄 [TsunamiMonitor] Applying new settings...')
    
    const minutes = Math.max(1, Math.round(newSettings.monitoring.checkInterval / 60))
    
    // Update configuration
    tsunamiMonitor.updateConfig({
      checkInterval: minutes,
      alertThresholds: {
        minimumMagnitude: newSettings.monitoring.magnitudeThreshold,
        maximumDepth: 100,
        coastalProximity: 100,
      },
      notificationSettings: {
        enableSMS: newSettings.notifications.sms.enabled,
        enableEmail: newSettings.notifications.email.enabled,
        priorityLevels: tsunamiMonitor.getStatus().config.notificationSettings.priorityLevels,
      },
    })
    
    const wasMonitoring = tsunamiMonitor.getStatus().isMonitoring
    const shouldMonitor = newSettings.monitoring.tsunamiMonitoring
    
    // Check if interval changed
    const intervalChanged = !oldSettings || 
      oldSettings.monitoring.checkInterval !== newSettings.monitoring.checkInterval
    
    if (shouldMonitor) {
      if (!wasMonitoring || intervalChanged) {
        tsunamiMonitor.stopMonitoring()
        await tsunamiMonitor.startMonitoring()
        console.log(`✅ [TsunamiMonitor] Monitoring ${intervalChanged ? 'restarted' : 'started'} with ${minutes}min interval`)
      }
    } else if (wasMonitoring) {
      tsunamiMonitor.stopMonitoring()
      console.log('✅ [TsunamiMonitor] Monitoring stopped')
    }
  })
  
  // Load and apply initial settings
  const currentSettings = await getSystemSettings()
  await applySettings(currentSettings)
  
  // Set current settings in observer
  await settingsObserver.notifyChange(currentSettings)
  
  console.log('✅ [Settings] Settings system initialized')
}
