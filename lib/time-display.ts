/**
 * Dual Time Display Utilities
 * 
 * Displays times in both UTC and local timezone with clear labels
 * Following maritime/aviation industry standards
 */

export type TimeDisplayType = 'event' | 'system' | 'relative'
export type TimeDisplayFormat = 'stacked' | 'inline' | 'tooltip'

export interface TimeDisplay {
  primary: string      // Main time shown (bold)
  secondary: string    // Secondary time (lighter)
  full: string        // Combined for tooltips
  iso: string         // ISO 8601 for APIs
  primaryTZ: string   // Primary timezone abbreviation
  secondaryTZ: string // Secondary timezone abbreviation
}

/**
 * Get timezone abbreviation from IANA timezone
 */
export const getTimezoneAbbr = (tz: string): string => {
  const abbrs: Record<string, string> = {
    'Asia/Kolkata': 'IST',
    'Asia/Calcutta': 'IST',
    'America/New_York': 'EST/EDT',
    'America/Chicago': 'CST/CDT',
    'America/Denver': 'MST/MDT',
    'America/Los_Angeles': 'PST/PDT',
    'Europe/London': 'GMT/BST',
    'Europe/Paris': 'CET/CEST',
    'Asia/Tokyo': 'JST',
    'Asia/Shanghai': 'CST',
    'Asia/Hong_Kong': 'HKT',
    'Asia/Singapore': 'SGT',
    'Asia/Seoul': 'KST',
    'Asia/Dubai': 'GST',
    'Australia/Sydney': 'AEDT/AEST',
    'Pacific/Auckland': 'NZDT/NZST',
    'UTC': 'UTC',
    'Etc/UTC': 'UTC',
  }
  
  return abbrs[tz] || tz.split('/').pop() || 'Local'
}

/**
 * Get browser's timezone
 */
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Format time in both UTC and local timezone
 * 
 * @param date - The date to format
 * @param type - Type of time (event, system, relative)
 * @param userTimezone - User's preferred timezone (optional, uses browser TZ if not provided)
 * @param options - Additional formatting options
 */
export const formatDualTime = (
  date: Date,
  type: TimeDisplayType = 'event',
  userTimezone?: string,
  options?: {
    includeSeconds?: boolean
    dateStyle?: 'full' | 'long' | 'medium' | 'short'
  }
): TimeDisplay => {
  const browserTZ = getBrowserTimezone()
  const localTZ = userTimezone || browserTZ
  
  const dateStyle = options?.dateStyle || 'medium'
  const timeStyle = options?.includeSeconds ? 'medium' : 'short'
  
  const utcTime = date.toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle,
    timeStyle
  })
  
  const localTime = date.toLocaleString('en-US', {
    timeZone: localTZ,
    dateStyle,
    timeStyle
  })
  
  const localTZAbbr = getTimezoneAbbr(localTZ)
  
  if (type === 'event') {
    // Event times: UTC primary, local secondary
    // Used for: earthquakes, tsunamis, vessel positions
    return {
      primary: `${utcTime} UTC`,
      secondary: `${localTime} ${localTZAbbr} (Your Time)`,
      full: `${utcTime} UTC • ${localTime} ${localTZAbbr}`,
      iso: date.toISOString(),
      primaryTZ: 'UTC',
      secondaryTZ: localTZAbbr
    }
  } else if (type === 'system') {
    // System times: Local primary, UTC secondary
    // Used for: alerts sent, logins, logs, notifications
    return {
      primary: `${localTime} ${localTZAbbr}`,
      secondary: `${utcTime} UTC`,
      full: `${localTime} ${localTZAbbr} • ${utcTime} UTC`,
      iso: date.toISOString(),
      primaryTZ: localTZAbbr,
      secondaryTZ: 'UTC'
    }
  } else {
    // Relative times: Show relative with full times in tooltip
    // Used for: "2 hours ago" displays
    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    let relative: string
    if (diffMinutes < 1) {
      relative = 'Just now'
    } else if (diffMinutes < 60) {
      relative = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      relative = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      relative = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      relative = date.toLocaleDateString('en-US', { dateStyle: 'medium' })
    }
    
    return {
      primary: relative,
      secondary: `${utcTime} UTC`,
      full: `${utcTime} UTC • ${localTime} ${localTZAbbr}`,
      iso: date.toISOString(),
      primaryTZ: '',
      secondaryTZ: 'UTC'
    }
  }
}

/**
 * Format a compact dual time (for inline displays)
 */
export const formatDualTimeCompact = (
  date: Date,
  type: TimeDisplayType = 'event',
  userTimezone?: string
): string => {
  const display = formatDualTime(date, type, userTimezone)
  return display.full
}

/**
 * Format only the primary time (fallback for very compact displays)
 */
export const formatPrimaryTime = (
  date: Date,
  type: TimeDisplayType = 'event',
  userTimezone?: string
): string => {
  const display = formatDualTime(date, type, userTimezone)
  return display.primary
}

/**
 * Parse event time from various possible fields
 * Prioritizes actual event time over system metadata
 */
export const getEventTime = (event: any): Date => {
  // Try actual event time fields first
  const eventTime = event.time || event.timestamp || event.occurredAt || event.eventTime
  if (eventTime) return new Date(eventTime)
  
  // Fallback to system metadata
  const systemTime = event.createdAt || event.processedAt
  if (systemTime) return new Date(systemTime)
  
  // Last resort
  return new Date()
}

/**
 * Parse system time from various possible fields
 */
export const getSystemTime = (event: any): Date => {
  const systemTime = event.createdAt || event.processedAt || event.sentAt || event.updatedAt
  if (systemTime) return new Date(systemTime)
  
  return new Date()
}
