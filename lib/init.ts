/**
 * Application Initialization
 * 
 * Initializes all system services and settings observers.
 * Should be called once at application startup.
 */

import { initializeSettingsSystem } from './system-settings'

let initialized = false

/**
 * Initialize the application
 * Safe to call multiple times - will only initialize once
 */
export async function initializeApp(): Promise<void> {
  if (initialized) {
    console.log('⚠️ [Init] Application already initialized, skipping...')
    return
  }
  
  console.log('🚀 [Init] Initializing application...')
  
  try {
    // Initialize settings system and observers
    await initializeSettingsSystem()
    
    initialized = true
    console.log('✅ [Init] Application initialized successfully')
  } catch (error) {
    console.error('❌ [Init] Application initialization failed:', error)
    throw error
  }
}

/**
 * Check if application is initialized
 */
export function isInitialized(): boolean {
  return initialized
}
