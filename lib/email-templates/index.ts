/**
 * Email Templates
 * Modern, responsive email templates for emergency alerts
 */

export { createBaseTemplate } from './base-template'
export type { EmailTemplateData } from './base-template'

export { createEarthquakeAlertEmail } from './earthquake-alert'
export type { EarthquakeAlertData } from './earthquake-alert'

export { createTsunamiAlertEmail } from './tsunami-alert'
export type { TsunamiAlertData } from './tsunami-alert'

// Re-export for convenience
export * from './base-template'
export * from './earthquake-alert'
export * from './tsunami-alert'
