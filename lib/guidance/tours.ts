import { driver, DriveStep, Config } from "driver.js"

/**
 * Base configuration for all tours
 */
const baseConfig: Config = {
  animate: true,
  showProgress: true,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  smoothScroll: true,
  allowClose: true,
  disableActiveInteraction: false,
  popoverClass: 'driverjs-theme',
  progressText: '{{current}} of {{total}}',
}

/**
 * Dashboard Overview Tour
 * Introduces users to the main dashboard components
 */
export const dashboardTourSteps: DriveStep[] = [
  {
    element: '#dashboard-greeting',
    popover: {
      title: '👋 Welcome to Emergency Alert Command Center',
      description: 'Your central hub for monitoring earthquakes, tsunamis, and managing emergency communications. Let\'s take a quick tour!',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#global-event-map',
    popover: {
      title: '🗺️ Global Event Map',
      description: 'Real-time visualization of earthquakes and tsunamis worldwide. Click on any marker to see detailed information and affected populations.',
      side: "left",
      align: 'start'
    }
  },
  {
    element: '#unified-timeline',
    popover: {
      title: '📋 Unified Incident Timeline',
      description: 'Chronological view of all alerts and events. Filter by time range and event type. Click any event for detailed information.',
      side: "left",
      align: 'start'
    }
  },
  {
    element: '#stats-overview',
    popover: {
      title: '📊 Statistics Overview',
      description: 'Key metrics including total events, success rates, and contacts notified. Monitor system performance at a glance.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#quick-actions',
    popover: {
      title: '⚡ Quick Actions',
      description: 'Rapidly access common tasks like creating alerts, managing contacts, and viewing reports.',
      side: "top",
      align: 'start'
    }
  },
  {
    popover: {
      title: '🎉 You\'re All Set!',
      description: 'You can replay this tour anytime by clicking the Help button (?) in the navigation bar.',
    }
  }
]

/**
 * Alert Creation Tour
 * Guides users through creating their first alert
 */
export const alertCreationTourSteps: DriveStep[] = [
  {
    element: '#alert-type-selector',
    popover: {
      title: '1️⃣ Select Alert Type',
      description: 'Choose between Earthquake, Tsunami, or Custom alert types. The system will auto-populate data for seismic events.',
      side: "right",
      align: 'start'
    }
  },
  {
    element: '#contact-selector',
    popover: {
      title: '2️⃣ Select Recipients',
      description: 'Choose individuals, groups, or vessels to notify. You can also filter by location or vessel type.',
      side: "right",
      align: 'start'
    }
  },
  {
    element: '#channel-selector',
    popover: {
      title: '3️⃣ Choose Communication Channels',
      description: 'Select one or more channels: SMS, Email, WhatsApp, or Voice. The system will route messages intelligently.',
      side: "right",
      align: 'start'
    }
  },
  {
    element: '#message-composer',
    popover: {
      title: '4️⃣ Craft Your Message',
      description: 'Write your emergency message. Use variables like {location}, {magnitude}, and {time} for dynamic content.',
      side: "top",
      align: 'start'
    }
  },
  {
    element: '#preview-section',
    popover: {
      title: '5️⃣ Preview & Send',
      description: 'Review your alert, preview how it will appear, then click Send. Track delivery in real-time from the Communications dashboard.',
      side: "top",
      align: 'start'
    }
  }
]

/**
 * Delivery Logs Tour
 * Explains the delivery tracking system
 */
export const deliveryLogsTourSteps: DriveStep[] = [
  {
    element: '#delivery-stats',
    popover: {
      title: '📊 Delivery Statistics',
      description: 'Overview of message delivery performance. Track sent, delivered, failed, and acknowledged messages.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#channel-filter',
    popover: {
      title: '🔍 Filter by Channel',
      description: 'Filter logs by communication channel (SMS, Email, WhatsApp, Voice) to analyze performance per channel.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#delivery-logs-table',
    popover: {
      title: '📋 Delivery Log Entries',
      description: 'Detailed log of all messages sent. Click any row to see full details including delivery status, timestamps, and acknowledgments.',
      side: "top",
      align: 'start'
    }
  },
  {
    element: '#acknowledgment-status',
    popover: {
      title: '✅ Acknowledgment Tracking',
      description: 'See when recipients opened emails or read messages. This confirms they received and acknowledged the alert.',
      side: "left",
      align: 'start'
    }
  }
]

/**
 * Communications Dashboard Tour
 */
export const communicationsTourSteps: DriveStep[] = [
  {
    element: '#communications-tabs',
    popover: {
      title: '📱 Communications Hub',
      description: 'Manage all communication channels from one place. Switch between delivery logs, settings, and analytics.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#delivery-logs-tab',
    popover: {
      title: '📊 Delivery Logs',
      description: 'Track all outgoing messages, delivery status, and acknowledgments in real-time.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#channel-settings-tab',
    popover: {
      title: '⚙️ Channel Settings',
      description: 'Configure Twilio (SMS/Voice), SendGrid (Email), and WhatsApp integration settings.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#analytics-tab',
    popover: {
      title: '📈 Analytics',
      description: 'Visualize delivery performance, channel effectiveness, and recipient engagement over time.',
      side: "bottom",
      align: 'start'
    }
  }
]

/**
 * Earthquake Monitoring Tour
 */
export const earthquakeTourSteps: DriveStep[] = [
  {
    element: '#earthquake-filters',
    popover: {
      title: '🔍 Filter Earthquakes',
      description: 'Filter by magnitude, time range, and data sources (USGS, EMSC, JMA). Adjust sensitivity based on your needs.',
      side: "bottom",
      align: 'start'
    }
  },
  {
    element: '#earthquake-list',
    popover: {
      title: '📋 Earthquake List',
      description: 'All recent earthquakes sorted by time. Click any earthquake to see details, population impact, and create alerts.',
      side: "left",
      align: 'start'
    }
  },
  {
    element: '#create-alert-button',
    popover: {
      title: '🚨 Quick Alert Creation',
      description: 'Click to instantly create an alert for any earthquake. Event details will be pre-filled automatically.',
      side: "top",
      align: 'start'
    }
  }
]

/**
 * Create a tour with the given steps
 */
export const createTour = (steps: DriveStep[], config: Partial<Config> = {}) => {
  return driver({
    ...baseConfig,
    ...config,
    steps,
  })
}

/**
 * Tour identifiers for tracking completion
 */
export enum TourId {
  DASHBOARD = 'dashboard-tour',
  ALERT_CREATION = 'alert-creation-tour',
  DELIVERY_LOGS = 'delivery-logs-tour',
  COMMUNICATIONS = 'communications-tour',
  EARTHQUAKE = 'earthquake-tour',
}

/**
 * Check if a tour has been completed
 */
export const isTourCompleted = (tourId: TourId): boolean => {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(`tour-completed-${tourId}`) === 'true'
}

/**
 * Mark a tour as completed
 */
export const markTourCompleted = (tourId: TourId): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(`tour-completed-${tourId}`, 'true')
  localStorage.setItem(`tour-completed-${tourId}-date`, new Date().toISOString())
}

/**
 * Reset a tour (for replay)
 */
export const resetTour = (tourId: TourId): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`tour-completed-${tourId}`)
  localStorage.removeItem(`tour-completed-${tourId}-date`)
}

/**
 * Reset all tours
 */
export const resetAllTours = (): void => {
  Object.values(TourId).forEach(resetTour)
}

/**
 * Check if user is new (no tours completed)
 */
export const isNewUser = (): boolean => {
  return !Object.values(TourId).some(isTourCompleted)
}
