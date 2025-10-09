'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { motion, AnimatePresence } from 'framer-motion'
import MapPreview from './MapPreview'
import EventDetails from './EventDetails'
import { EarthquakeEvent, TsunamiEvent, EventType } from '@/types/event-hover'
import { 
  calculateShakingRadius, 
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
  const [populationImpact, setPopulationImpact] = useState<any | undefined>(undefined)
  const [impactLoading, setImpactLoading] = useState(false)

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
    // Preserve table semantics: do not wrap rows in non-table elements
    return <>{children}</>
  }

  const isEarthquake = (e: any): e is EarthquakeEvent => {
    return 'magnitude' in e && 'depth' in e
  }

  useEffect(() => {
    if (open && type === 'earthquake' && isEarthquake(event) && !populationImpact && !impactLoading) {
      const fetchImpactData = async () => {
        setImpactLoading(true)
        try {
          const params = new URLSearchParams({
            lat: event.latitude!.toString(),
            lon: event.longitude!.toString(),
            mag: event.magnitude.toString(),
            depth: event.depth.toString(),
          })
          
          // Add event ID if available (for PAGER lookup)
          if (event.id) {
            params.append('eventId', event.id)
          }
          
          const response = await fetch(`/api/impact?${params}`)
          if (response.ok) {
            const data = await response.json()
            
            // Only set impact if we have real data (not error state)
            if (data.source !== 'error' && data.cities && data.cities.length > 0) {
              setPopulationImpact(data)
            } else if (data.source === 'no-data') {
              // Show empty state for remote areas
              setPopulationImpact({
                strongShaking: 0,
                moderateShaking: 0,
                lightShaking: 0,
                cities: [],
                message: 'No populated areas within impact radius'
              })
            }
          }
        } catch (error) {
          console.error('Failed to fetch population impact:', error)
        } finally {
          setImpactLoading(false)
        }
      }

      fetchImpactData()
    }
  }, [open, event, type, populationImpact, impactLoading])

  // Placeholder for shakingRadius until it's needed from the API
  const shakingRadius = isEarthquake(event) ? calculateShakingRadius(event.magnitude, event.depth) : undefined;

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
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              onMouseEnter: (e: any) => {
                // call child handler if present
                const childProps = (children as any).props
                if (childProps?.onMouseEnter) {
                  childProps.onMouseEnter(e)
                }
                setOpen(true)
              },
              onMouseLeave: (e: any) => {
                const childProps = (children as any).props
                if (childProps?.onMouseLeave) {
                  childProps.onMouseLeave(e)
                }
                setOpen(false)
              },
              // merge classes safely
              className: [
                (children as any).props?.className,
                'transition-colors',
                'cursor-pointer'
              ].filter(Boolean).join(' ')
            })
          : (
            <span
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
              className="transition-colors cursor-pointer"
            >
              {children}
            </span>
          )}
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
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
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
                    populationImpact={impactLoading ? { loading: true } : populationImpact}
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
