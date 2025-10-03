/**
 * Centralized color management for earthquake and tsunami events
 * Ensures consistency across map markers, badges, cards, and all UI components
 */

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const MAGNITUDE_COLORS = {
  MAJOR: {
    hex: '#dc2626',           // red-600
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    label: 'M 7.0+ (Major)',
    range: [7, Infinity] as const
  },
  STRONG: {
    hex: '#ea580c',           // orange-600
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800',
    label: 'M 6.0-6.9 (Strong)',
    range: [6, 7] as const
  },
  MODERATE: {
    hex: '#f59e0b',           // amber-500
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    label: 'M 5.0-5.9 (Moderate)',
    range: [5, 6] as const
  },
  MINOR: {
    hex: '#84cc16',           // lime-500
    text: 'text-lime-600',
    bg: 'bg-lime-50',
    border: 'border-lime-300',
    badge: 'bg-lime-100 text-lime-800',
    label: 'M 3.0-4.9 (Minor)',
    range: [3, 5] as const
  }
} as const

export const TSUNAMI_COLORS = {
  ALERT: {
    hex: '#8b5cf6',           // violet-500
    text: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-800',
    label: 'Tsunami Alert'
  }
} as const

export const SEVERITY_COLORS = {
  CRITICAL: {
    hex: '#dc2626',           // red-600
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    label: 'Critical'
  },
  HIGH: {
    hex: '#ea580c',           // orange-600
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800',
    label: 'High'
  },
  MEDIUM: {
    hex: '#f59e0b',           // amber-500
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Medium'
  },
  LOW: {
    hex: '#3b82f6',           // blue-500
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800',
    label: 'Low'
  }
} as const

// ============================================================================
// MAGNITUDE FUNCTIONS
// ============================================================================

/**
 * Get hex color for earthquake magnitude (for map markers)
 * @param magnitude - Earthquake magnitude value
 * @returns Hex color string (e.g., '#dc2626')
 */
export const getMagnitudeColor = (magnitude: number): string => {
  if (magnitude >= 7) return MAGNITUDE_COLORS.MAJOR.hex
  if (magnitude >= 6) return MAGNITUDE_COLORS.STRONG.hex
  if (magnitude >= 5) return MAGNITUDE_COLORS.MODERATE.hex
  return MAGNITUDE_COLORS.MINOR.hex
}

/**
 * Get Tailwind classes for magnitude (for badges, cards)
 * @param magnitude - Earthquake magnitude value
 * @returns Object with text, bg, border, and badge classes
 */
export const getMagnitudeClasses = (magnitude: number) => {
  const tier = 
    magnitude >= 7 ? MAGNITUDE_COLORS.MAJOR :
    magnitude >= 6 ? MAGNITUDE_COLORS.STRONG :
    magnitude >= 5 ? MAGNITUDE_COLORS.MODERATE :
    MAGNITUDE_COLORS.MINOR

  return {
    text: tier.text,
    bg: tier.bg,
    border: tier.border,
    badge: tier.badge,
    combined: `${tier.text} ${tier.bg}`,  // For inline usage
    label: tier.label
  }
}

/**
 * Get magnitude category name
 */
export const getMagnitudeCategory = (magnitude: number): string => {
  if (magnitude >= 7) return 'Major'
  if (magnitude >= 6) return 'Strong'
  if (magnitude >= 5) return 'Moderate'
  return 'Minor'
}

// ============================================================================
// TSUNAMI SEVERITY FUNCTIONS
// ============================================================================

/**
 * Get hex color for tsunami severity (for map markers)
 * @param severity - Tsunami severity level (1-5)
 * @returns Hex color string
 */
export const getTsunamiSeverityColor = (severity: number): string => {
  if (severity >= 4) return SEVERITY_COLORS.CRITICAL.hex
  if (severity >= 3) return SEVERITY_COLORS.HIGH.hex
  if (severity >= 2) return SEVERITY_COLORS.MEDIUM.hex
  return SEVERITY_COLORS.LOW.hex
}

/**
 * Get Tailwind classes for tsunami severity
 */
export const getTsunamiSeverityClasses = (severity: number) => {
  const tier = 
    severity >= 4 ? SEVERITY_COLORS.CRITICAL :
    severity >= 3 ? SEVERITY_COLORS.HIGH :
    severity >= 2 ? SEVERITY_COLORS.MEDIUM :
    SEVERITY_COLORS.LOW

  return {
    text: tier.text,
    bg: tier.bg,
    border: tier.border,
    badge: tier.badge,
    combined: `${tier.text} ${tier.bg}`,
    label: tier.label
  }
}

/**
 * Get fixed tsunami alert color (for basic tsunami markers)
 */
export const getTsunamiColor = (): string => {
  return TSUNAMI_COLORS.ALERT.hex
}

/**
 * Get tsunami Tailwind classes
 */
export const getTsunamiClasses = () => {
  return {
    text: TSUNAMI_COLORS.ALERT.text,
    bg: TSUNAMI_COLORS.ALERT.bg,
    border: TSUNAMI_COLORS.ALERT.border,
    badge: TSUNAMI_COLORS.ALERT.badge,
    combined: `${TSUNAMI_COLORS.ALERT.text} ${TSUNAMI_COLORS.ALERT.bg}`,
    label: TSUNAMI_COLORS.ALERT.label
  }
}

// ============================================================================
// UNIFIED EVENT COLOR FUNCTION
// ============================================================================

export type EventType = 'earthquake' | 'tsunami'

export type EventColorResult = {
  hex: string
  text: string
  bg: string
  border: string
  badge: string
  combined: string
  label: string
  category: string
}

/**
 * Universal function to get colors for any event type
 * Handles both earthquakes (by magnitude) and tsunamis (by severity or fixed)
 */
export const getEventColors = (
  type: EventType,
  magnitude?: number,
  severity?: number
): EventColorResult => {
  if (type === 'earthquake' && magnitude !== undefined) {
    const classes = getMagnitudeClasses(magnitude)
    return {
      hex: getMagnitudeColor(magnitude),
      ...classes,
      category: getMagnitudeCategory(magnitude)
    }
  }

  if (type === 'tsunami') {
    if (severity !== undefined) {
      const classes = getTsunamiSeverityClasses(severity)
      return {
        hex: getTsunamiSeverityColor(severity),
        ...classes,
        category: classes.label
      }
    }
    // Default tsunami (no severity)
    const classes = getTsunamiClasses()
    return {
      hex: getTsunamiColor(),
      ...classes,
      category: 'Tsunami Alert'
    }
  }

  // Fallback
  return {
    hex: '#6b7280',
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    badge: 'bg-slate-100 text-slate-800',
    combined: 'text-slate-600 bg-slate-50',
    label: 'Unknown',
    category: 'Unknown'
  }
}

// ============================================================================
// LEGEND DATA EXPORT
// ============================================================================

/**
 * Get legend items for the map
 * Returns structured data for rendering the legend
 */
export const getLegendItems = () => {
  return {
    earthquakes: [
      { ...MAGNITUDE_COLORS.MINOR, icon: '⚡' },
      { ...MAGNITUDE_COLORS.MODERATE, icon: '⚡' },
      { ...MAGNITUDE_COLORS.STRONG, icon: '⚡' },
      { ...MAGNITUDE_COLORS.MAJOR, icon: '⚡' }
    ],
    tsunami: { ...TSUNAMI_COLORS.ALERT, icon: '🌊' },
    recency: [
      { opacity: 1.0, label: '< 24h' },
      { opacity: 0.7, label: '1-7 days' },
      { opacity: 0.4, label: '7-30 days' }
    ]
  }
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Get opacity based on event age (for time-based marker transparency)
 */
export const getEventOpacity = (timestamp: string): number => {
  const eventTime = new Date(timestamp).getTime()
  const now = Date.now()
  const hoursSince = (now - eventTime) / (1000 * 60 * 60)
  
  if (hoursSince < 24) return 1.0
  if (hoursSince < 168) return 0.7
  return 0.4
}

/**
 * Get size multiplier based on magnitude/severity
 */
export const getEventSize = (magnitude?: number, severity?: number): number => {
  const value = magnitude || severity || 4
  return Math.max(8, value * 2.5)
}
