# DAY 3-4: Custom Geo-Fencing System

## GOAL: Replace hardcoded danger zones with custom, drawable geo-fences

---

## MORNING DAY 3: Database Schema + PostGIS (3-4 hours)

### 1. Enable PostGIS Extension

```sql
-- Connect to your database
psql $DATABASE_URL

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify
SELECT PostGIS_version();
```

### 2. Add GeoFence Model to Schema

```prisma
// Add to schema.prisma

model GeoFence {
  id          String   @id @default(cuid())
  name        String
  description String?
  fleetId     String?  // null = global fence
  eventType   String   // "earthquake" | "tsunami" | "storm" | "piracy"
  severity    String   // "critical" | "high" | "moderate" | "low"
  
  // GeoJSON geometry (polygon or circle)
  // Format: {"type": "Polygon", "coordinates": [[[lon, lat], ...]]}
  geometry    Json
  
  // Bounding box for quick filtering (auto-calculated)
  minLat      Float
  maxLat      Float
  minLon      Float
  maxLon      Float
  
  // Optional radius for circular zones (km)
  radius      Float?
  
  active      Boolean  @default(true)
  color       String   @default("#ff0000") // UI display color
  metadata    Json     @default("{}")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  
  fleet       Fleet?   @relation(fields: [fleetId], references: [id])
  creator     User     @relation(fields: [createdBy], references: [id])
  
  @@index([fleetId])
  @@index([eventType])
  @@index([active])
  @@index([minLat, maxLat, minLon, maxLon]) // Spatial index simulation
}
```

### 3. Run Migration

```bash
npx prisma db push
npx prisma generate
```

---

## AFTERNOON DAY 3: Geo-Fence API Routes (3-4 hours)

### 4. Create API Routes

#### `/api/geofences/route.ts` - List & Create

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - List all geo-fences (optionally filtered by fleet)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fleetId = searchParams.get('fleetId')
    const eventType = searchParams.get('eventType')

    const fences = await prisma.geoFence.findMany({
      where: {
        ...(fleetId && { fleetId }),
        ...(eventType && { eventType }),
        active: true
      },
      include: {
        fleet: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ fences, count: fences.length })
  } catch (error) {
    console.error('Error fetching geo-fences:', error)
    return NextResponse.json({ error: 'Failed to fetch geo-fences' }, { status: 500 })
  }
}

// POST - Create new geo-fence
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, fleetId, eventType, severity, geometry, color } = body

    // Validate geometry
    if (!geometry || !geometry.type) {
      return NextResponse.json({ error: 'Invalid geometry' }, { status: 400 })
    }

    // Calculate bounding box
    const bounds = calculateBounds(geometry)

    const fence = await prisma.geoFence.create({
      data: {
        name,
        description,
        fleetId,
        eventType,
        severity,
        geometry,
        minLat: bounds.minLat,
        maxLat: bounds.maxLat,
        minLon: bounds.minLon,
        maxLon: bounds.maxLon,
        color: color || '#ff0000',
        createdBy: session.user.id
      },
      include: {
        fleet: true,
        creator: { select: { name: true } }
      }
    })

    return NextResponse.json({ fence, success: true })
  } catch (error) {
    console.error('Error creating geo-fence:', error)
    return NextResponse.json({ error: 'Failed to create geo-fence' }, { status: 500 })
  }
}

// Helper: Calculate bounding box from GeoJSON geometry
function calculateBounds(geometry: any) {
  let minLat = Infinity, maxLat = -Infinity
  let minLon = Infinity, maxLon = -Infinity

  const processCoords = (coords: any) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords)
    } else {
      const [lon, lat] = coords
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLon = Math.min(minLon, lon)
      maxLon = Math.max(maxLon, lon)
    }
  }

  processCoords(geometry.coordinates)

  return { minLat, maxLat, minLon, maxLon }
}
```

#### `/api/geofences/[id]/route.ts` - Update & Delete

```typescript
// PUT - Update geo-fence
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, geometry, active, severity, color } = body

  let updateData: any = { name, description, active, severity, color }

  // If geometry changed, recalculate bounds
  if (geometry) {
    const bounds = calculateBounds(geometry)
    updateData = { ...updateData, geometry, ...bounds }
  }

  const fence = await prisma.geoFence.update({
    where: { id: params.id },
    data: updateData
  })

  return NextResponse.json({ fence, success: true })
}

// DELETE - Delete geo-fence (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.geoFence.update({
    where: { id: params.id },
    data: { active: false }
  })

  return NextResponse.json({ success: true })
}
```

---

## MORNING DAY 4: Geo-Fence Service (3 hours)

### 5. Create Geo-Fence Service

File: `/lib/services/geofence-service.ts`

```typescript
import { prisma } from '@/lib/db'

export class GeoFenceService {
  /**
   * Check if point is inside any active geo-fence
   */
  async checkPoint(lat: number, lon: number, eventType?: string) {
    // Get all active fences (with bounding box pre-filter)
    const fences = await prisma.geoFence.findMany({
      where: {
        active: true,
        ...(eventType && { eventType }),
        // Bounding box filter (fast)
        minLat: { lte: lat },
        maxLat: { gte: lat },
        minLon: { lte: lon },
        maxLon: { gte: lon }
      }
    })

    // Check each fence for actual containment
    const matchingFences = []
    
    for (const fence of fences) {
      if (this.isPointInFence(lat, lon, fence.geometry)) {
        matchingFences.push(fence)
      }
    }

    return matchingFences
  }

  /**
   * Check if point is inside GeoJSON geometry
   */
  private isPointInFence(lat: number, lon: number, geometry: any): boolean {
    if (geometry.type === 'Polygon') {
      return this.isPointInPolygon(lat, lon, geometry.coordinates[0])
    } else if (geometry.type === 'Circle') {
      return this.isPointInCircle(lat, lon, geometry.center, geometry.radius)
    }
    return false
  }

  /**
   * Point-in-polygon algorithm (ray casting)
   */
  private isPointInPolygon(lat: number, lon: number, polygon: number[][]): boolean {
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]
      
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    
    return inside
  }

  /**
   * Point-in-circle check
   */
  private isPointInCircle(
    lat: number,
    lon: number,
    center: number[],
    radius: number
  ): boolean {
    const distance = this.calculateDistance(lat, lon, center[1], center[0])
    return distance <= radius
  }

  /**
   * Haversine distance formula (km)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get fences for fleet
   */
  async getFleetFences(fleetId: string) {
    return prisma.geoFence.findMany({
      where: {
        OR: [
          { fleetId },
          { fleetId: null } // Include global fences
        ],
        active: true
      }
    })
  }

  /**
   * Create predefined zone templates
   */
  async createTemplate(template: 'pacific-ring' | 'indian-ocean' | 'caribbean', userId: string) {
    const templates = {
      'pacific-ring': {
        name: 'Pacific Ring of Fire',
        eventType: 'earthquake',
        severity: 'high',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-180, -60], [180, -60], [180, 60], [-180, 60], [-180, -60]
          ]]
        }
      },
      // Add more templates...
    }

    const template_data = templates[template]
    if (!template_data) throw new Error('Invalid template')

    const bounds = this.calculateBounds(template_data.geometry)

    return prisma.geoFence.create({
      data: {
        ...template_data,
        ...bounds,
        createdBy: userId
      }
    })
  }

  private calculateBounds(geometry: any) {
    // Same as in API route
    // ... (copy from above)
  }
}
```

---

## AFTERNOON DAY 4: Map-Based UI (4 hours)

### 6. Create Geo-Fence Management UI

File: `/app/dashboard/geofences/page.tsx`

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapContainer, TileLayer, FeatureGroup, Polygon, Circle, Popup, Marker } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

const Map = dynamic(() => import('./GeoFenceMap'), { ssr: false })

export default function GeoFencesPage() {
  const [fences, setFences] = useState([])
  const [selectedEventType, setSelectedEventType] = useState('earthquake')
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    fetchFences()
  }, [])

  async function fetchFences() {
    const res = await fetch('/api/geofences')
    const data = await res.json()
    setFences(data.fences)
  }

  async function handleDrawCreated(e: any) {
    const layer = e.layer
    const geometry = layer.toGeoJSON().geometry

    // Open modal for fence details
    const name = prompt('Enter fence name:')
    if (!name) return

    const severity = prompt('Enter severity (critical/high/moderate/low):') || 'high'

    await fetch('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        eventType: selectedEventType,
        severity,
        geometry,
        color: '#ff0000'
      })
    })

    fetchFences()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Geo-Fence Management</h1>
        
        <div className="flex gap-4">
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="earthquake">Earthquake</option>
            <option value="tsunami">Tsunami</option>
            <option value="storm">Storm</option>
            <option value="piracy">Piracy</option>
          </select>

          <button
            onClick={() => setDrawing(!drawing)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {drawing ? 'Stop Drawing' : 'Draw Zone'}
          </button>
        </div>
      </div>

      <div className="h-[600px] border rounded">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* Drawing controls */}
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleDrawCreated}
              draw={{
                rectangle: true,
                circle: true,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  showArea: true
                }
              }}
            />
          </FeatureGroup>

          {/* Render existing fences */}
          {fences.map((fence: any) => {
            if (fence.geometry.type === 'Polygon') {
              const coords = fence.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]])
              return (
                <Polygon
                  key={fence.id}
                  positions={coords}
                  color={fence.color}
                  fillOpacity={0.3}
                >
                  <Popup>
                    <div>
                      <strong>{fence.name}</strong>
                      <p>Type: {fence.eventType}</p>
                      <p>Severity: {fence.severity}</p>
                    </div>
                  </Popup>
                </Polygon>
              )
            }
            return null
          })}
        </MapContainer>
      </div>

      {/* Fence List */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Active Geo-Fences</h2>
        <div className="grid gap-4">
          {fences.map((fence: any) => (
            <div key={fence.id} className="border p-4 rounded">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{fence.name}</h3>
                  <p className="text-sm text-gray-600">
                    {fence.eventType} • {fence.severity}
                  </p>
                </div>
                <button
                  onClick={() => deleteFence(fence.id)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function deleteFence(id: string) {
  if (!confirm('Delete this geo-fence?')) return
  await fetch(`/api/geofences/${id}`, { method: 'DELETE' })
  window.location.reload()
}
```

### 7. Update Vessel Monitor to Use Geo-Fences

File: `/scripts/monitor-vessel-proximity.ts` (UPDATE)

```typescript
import { GeoFenceService } from '../lib/services/geofence-service'

const geoFenceService = new GeoFenceService()

async function checkVesselAgainstEvent(vessel: any, event: any) {
  const position = vessel.latestPosition
  
  // Check if vessel is in any active geo-fence for this event type
  const matchingFences = await geoFenceService.checkPoint(
    position.latitude,
    position.longitude,
    event.type
  )

  if (matchingFences.length === 0) return // Not in any danger zone

  // Use the highest severity fence
  const fence = matchingFences.sort((a, b) => 
    severityToLevel(b.severity) - severityToLevel(a.severity)
  )[0]

  // Calculate distance to event
  const distance = calculateDistance(...)

  // Create alert with fence-based severity
  await alertRouter.createAndRouteAlert({
    vesselId: vessel.id,
    eventId: event.id,
    eventType: event.type,
    severity: fence.severity,
    distance,
    coordinates: { lat: event.latitude, lon: event.longitude },
    message: `ALERT: Your vessel "${vessel.name}" is in ${fence.name} geo-fence during ${event.type} event...`
  })
}

function severityToLevel(severity: string): number {
  return { critical: 4, high: 3, moderate: 2, low: 1 }[severity] || 0
}
```

---

## DAY 3-4 CHECKLIST

- [ ] PostGIS extension enabled
- [ ] GeoFence model created in schema
- [ ] Migration run successfully
- [ ] API routes for geo-fences created
- [ ] GeoFenceService implemented with point-in-polygon logic
- [ ] Map-based UI for drawing/managing fences
- [ ] Vessel monitor updated to use geo-fences
- [ ] Test: Draw circular zone on map
- [ ] Test: Draw polygon zone on map
- [ ] Test: Vessel in zone triggers alert
- [ ] Test: Multiple fences work correctly

**End of Day 4:** Custom geo-fencing system operational! 🗺️
