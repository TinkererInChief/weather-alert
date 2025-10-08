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

  // Check if event has valid coordinates
  const hasCoordinates = event.latitude !== undefined && 
                         event.longitude !== undefined &&
                         event.latitude !== null && 
                         event.longitude !== null &&
                         !isNaN(event.latitude) &&
                         !isNaN(event.longitude)

  if (!hasCoordinates) {
    // If no coordinates, just render the children without hover card
    return <>{children}</>
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
        >
          {children}
        </div>
      </Popover.Trigger>

      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content
              side="right"
              sideOffset={10}
              align="start"
              className="z-[1000]"
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-[450px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
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

                {/* Event Details */}
                <EventDetails
                  event={event}
                  type={type}
                  populationImpact={populationImpact}
                  tsunamiETA={tsunamiETA}
                />
              </motion.div>

              <Popover.Arrow className="fill-white" />
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}
