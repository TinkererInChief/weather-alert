'use client'

import { ReactNode, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { motion, AnimatePresence } from 'framer-motion'
import MapPreview from './MapPreview'
import EventDetails from './EventDetails'
import { EarthquakeEvent, TsunamiEvent, EventType } from '@/types/event-hover'
import { 
  calculateShakingRadius, 
  estimateAffectedPopulation, 
  calculateTsunamiETA 
} from '@/lib/event-calculations'

type EventHoverCardProps = {
  event: EarthquakeEvent | TsunamiEvent
  type: EventType
  children: ReactNode
  tsunamiTargetLocation?: {
    latitude: number
    longitude: number
    name: string
  }
}

export default function EventHoverCard({ 
  event, 
  type, 
  children,
  tsunamiTargetLocation 
}: EventHoverCardProps) {
  const [open, setOpen] = useState(false)

  // Check if event has valid coordinates (not 0,0 which is invalid)
  const hasCoordinates = event.latitude !== undefined && 
                         event.longitude !== undefined &&
                         event.latitude !== null && 
                         event.longitude !== null &&
                         !isNaN(event.latitude) &&
                         !isNaN(event.longitude) &&
                         !(event.latitude === 0 && event.longitude === 0) &&
                         Math.abs(event.latitude) > 0.01 &&
                         Math.abs(event.longitude) > 0.01

  if (!hasCoordinates) {
    // If no coordinates, render children with a subtle indicator
    return (
      <div className="relative group">
        {children}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            📍 No location data
          </div>
        </div>
      </div>
    )
  }

  const isEarthquake = (e: any): e is EarthquakeEvent => {
    return 'magnitude' in e && 'depth' in e
  }

  // Calculate earthquake-specific data
  let shakingRadius
  let populationImpact
  if (type === 'earthquake' && isEarthquake(event)) {
    shakingRadius = calculateShakingRadius(event.magnitude, event.depth)
    populationImpact = estimateAffectedPopulation(
      shakingRadius,
      event.latitude,
      event.longitude
    )
  }

  // Calculate tsunami ETA if target location provided
  let tsunamiETA
  if (type === 'tsunami' && tsunamiTargetLocation) {
    tsunamiETA = calculateTsunamiETA(
      event.latitude!,
      event.longitude!,
      tsunamiTargetLocation.latitude,
      tsunamiTargetLocation.longitude,
      new Date(event.time)
    )
    tsunamiETA.targetLocation = tsunamiTargetLocation.name
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="transition-colors relative z-0 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {children}
        </div>
      </Popover.Trigger>

      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>

            <Popover.Content
              side="right"
              sideOffset={20}
              align="center"
              collisionPadding={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
              }}
              avoidCollisions={true}
              sticky="always"
              className="z-[9999] will-change-transform"
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: -8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-[420px] max-h-[80vh] bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
                style={{
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 40px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Map Preview */}
                <MapPreview
                  latitude={event.latitude!}
                  longitude={event.longitude!}
                  magnitude={isEarthquake(event) ? event.magnitude : undefined}
                  depth={isEarthquake(event) ? event.depth : undefined}
                  type={type}
                  shakingRadius={shakingRadius}
                  showDepthShaft={type === 'earthquake' && isEarthquake(event)}
                  showShakingRadius={type === 'earthquake' && !!shakingRadius}
                  showTsunamiRipples={type === 'tsunami'}
                />

                {/* Event Details - Scrollable */}
                <div className="overflow-y-auto max-h-[calc(80vh-250px)]">
                  <EventDetails
                    event={event}
                    type={type}
                    populationImpact={populationImpact}
                    tsunamiETA={tsunamiETA}
                  />
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}
