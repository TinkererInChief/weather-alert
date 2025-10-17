/**
 * Example Usage: Vessel Tracking Services
 * 
 * This example shows how to use the vessel tracking coordinator
 * to monitor vessels in high-risk seismic/tsunami zones.
 */

import { VesselTrackingCoordinator } from './vessel-tracking-coordinator'

// Example 1: Start with default high-risk regions
export async function startDefaultTracking() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  
  // Starts monitoring:
  // - Japan & Korean Peninsula
  // - Southeast Asia (Indonesia, Philippines)
  // - US West Coast
  // - Chile & Peru Coast
  // - Alaska
  // - Mediterranean Sea
  // - Caribbean
  // - Bay of Bengal
  // - North Sea
  await coordinator.start()
  
  // Logs:
  // 🚀 Starting vessel tracking services...
  // 📍 Monitoring 9 regions
  // ✅ Connected to AISStream.io
  // 📡 Subscribed to 9 bounding boxes
  // ℹ️ OpenShipData polling started for 2 European regions
  // 📊 Coverage Summary:
  //   Mediterranean Sea: AISStream + OpenShipData (Priority: high)
  //   North Sea: AISStream + OpenShipData (Priority: medium)
  //   [Other regions]: AISStream (Priority: high/medium)
}

// Example 2: Start with custom regions
export async function startCustomTracking() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  
  await coordinator.start([
    {
      name: 'Tokyo Bay',
      boundingBox: { 
        north: 35.8, 
        south: 35.2, 
        west: 139.6, 
        east: 140.2 
      },
      priority: 'high'
    },
    {
      name: 'San Francisco Bay',
      boundingBox: { 
        north: 38.2, 
        south: 37.4, 
        west: -122.8, 
        east: -122.2 
      },
      priority: 'high'
    }
  ])
}

// Example 3: Add a new region dynamically
export async function addNewRegion() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  
  await coordinator.addRegion({
    name: 'New Zealand Waters',
    boundingBox: {
      north: -34,
      south: -47,
      west: 165,
      east: 180
    },
    priority: 'medium'
  })
}

// Example 4: Check service status
export function checkStatus() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  const status = coordinator.getStatus()
  
  console.log('Service Status:', status)
  // Output:
  // {
  //   isRunning: true,
  //   services: {
  //     aisstream: {
  //       name: 'AISStream.io',
  //       coverage: 'Global',
  //       method: 'WebSocket streaming',
  //       status: 'active'
  //     },
  //     openshipdata: {
  //       name: 'OpenShipData',
  //       coverage: 'Europe/Mediterranean',
  //       method: 'REST API polling',
  //       status: 'active'
  //     }
  //   }
  // }
}

// Example 5: Stop all tracking
export function stopAllTracking() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  coordinator.stop()
  
  // Logs:
  // 🛑 Stopping vessel tracking services...
  // Disconnected from AISStream.io
  // 🛑 OpenShipData polling stopped
  // ✅ Vessel tracking services stopped
}

// Example 6: Use in Next.js API route
export async function exampleApiRoute() {
  // /api/vessel-tracking/start
  // POST /api/vessel-tracking/start
  
  const coordinator = VesselTrackingCoordinator.getInstance()
  
  try {
    await coordinator.start()
    
    return {
      success: true,
      message: 'Vessel tracking started',
      status: coordinator.getStatus()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Example 7: Use in background worker
export async function exampleBackgroundWorker() {
  const coordinator = VesselTrackingCoordinator.getInstance()
  
  // Start on server startup
  await coordinator.start()
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping vessel tracking...')
    coordinator.stop()
    process.exit(0)
  })
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping vessel tracking...')
    coordinator.stop()
    process.exit(0)
  })
}

// Example 8: Query vessels near an earthquake
export async function findVesselsNearEarthquake(
  earthquakeLat: number,
  earthquakeLon: number,
  radiusKm: number
) {
  const { prisma } = await import('@/lib/prisma')
  
  // Calculate bounding box around earthquake
  const latDegPerKm = 1 / 111
  const lonDegPerKm = 1 / (111 * Math.cos(earthquakeLat * Math.PI / 180))
  
  const bbox = {
    north: earthquakeLat + (radiusKm * latDegPerKm),
    south: earthquakeLat - (radiusKm * latDegPerKm),
    east: earthquakeLon + (radiusKm * lonDegPerKm),
    west: earthquakeLon - (radiusKm * lonDegPerKm)
  }
  
  // Query vessels in bounding box
  const vessels = await prisma.vessel.findMany({
    where: {
      positions: {
        some: {
          latitude: { gte: bbox.south, lte: bbox.north },
          longitude: { gte: bbox.west, lte: bbox.east },
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        }
      }
    },
    include: {
      positions: {
        orderBy: { timestamp: 'desc' },
        take: 1
      },
      contacts: {
        where: { primary: true }
      }
    }
  })
  
  return vessels
}
