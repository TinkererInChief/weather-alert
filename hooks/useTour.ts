import { useEffect, useCallback, useState } from 'react'
import { driver, DriveStep, Config } from 'driver.js'
import { 
  TourId, 
  isTourCompleted, 
  markTourCompleted, 
  resetTour,
  createTour,
  dashboardTourSteps,
  alertCreationTourSteps,
  deliveryLogsTourSteps,
  communicationsTourSteps,
  earthquakeTourSteps
} from '@/lib/guidance/tours'

/**
 * Hook to manage tours
 */
export const useTour = (
  tourId: TourId,
  steps: DriveStep[],
  options?: {
    autoStart?: boolean
    onComplete?: () => void
    config?: Partial<Config>
  }
) => {
  const [isCompleted, setIsCompleted] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check completion status on mount
    setIsCompleted(isTourCompleted(tourId))
    setIsReady(true)
  }, [tourId])

  const startTour = useCallback(() => {
    const tour = createTour(steps, {
      ...options?.config,
      onDestroyed: () => {
        markTourCompleted(tourId)
        setIsCompleted(true)
        options?.onComplete?.()
      }
    })
    
    tour.drive()
  }, [tourId, steps, options])

  const restartTour = useCallback(() => {
    resetTour(tourId)
    setIsCompleted(false)
    startTour()
  }, [tourId, startTour])

  // Auto-start tour if it hasn't been completed
  useEffect(() => {
    if (isReady && options?.autoStart && !isCompleted) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isReady, isCompleted, options?.autoStart, startTour])

  return {
    startTour,
    restartTour,
    isCompleted,
    isReady,
  }
}

/**
 * Specific hooks for each tour
 */
export const useDashboardTour = (autoStart = false) => {
  return useTour(TourId.DASHBOARD, dashboardTourSteps, { autoStart })
}

export const useAlertCreationTour = (autoStart = false) => {
  return useTour(TourId.ALERT_CREATION, alertCreationTourSteps, { autoStart })
}

export const useDeliveryLogsTour = (autoStart = false) => {
  return useTour(TourId.DELIVERY_LOGS, deliveryLogsTourSteps, { autoStart })
}

export const useCommunicationsTour = (autoStart = false) => {
  return useTour(TourId.COMMUNICATIONS, communicationsTourSteps, { autoStart })
}

export const useEarthquakeTour = (autoStart = false) => {
  return useTour(TourId.EARTHQUAKE, earthquakeTourSteps, { autoStart })
}
