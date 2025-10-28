# Week 5 Day 1-3: Custom Geo-Fence Configuration

**Priority**: 🟡 MEDIUM | **Effort**: 12-16 hours

---

## Overview

Allow users to create custom geo-fence zones (circles, polygons, critical areas) with custom alert radii. Uses Leaflet for map-based drawing (consistent with your OpenStreetMap strategy).

---

## Database Schema

**File**: `prisma/migrations/XXX_add_custom_geofences.sql`

```prisma
// Add to schema.prisma

model GeoFence {
  id          String   @id @default(cuid())
  name        String   // "Panama Canal Zone", "Suez Canal", "Pacific Ring of Fire"
  description String?
  type        String   // "circle", "polygon", "critical_zone"
  geometry    Json     // GeoJSON format
  fleetId     String?  // null = global, else fleet-specific
  priority    Int      @default(1)  // Higher priority zones checked first
  alertRadius Json     // { "critical": 50, "high": 150, "moderate": 300 }
  active      Boolean  @default(true)
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  fleet       Fleet?   @relation(fields: [fleetId], references: [id], onDelete: SetNull)
  
  @@index([fleetId])
  @@index([active])
  @@index([priority])
  @@map("geo_fences")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_custom_geofences
```

---

## Geo-Fence Management API

**File**: `app/api/geo-fences/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'
import { z } from 'zod'

const createGeoFenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['circle', 'polygon', 'critical_zone']),
  geometry: z.object({
    type: z.enum(['circle', 'polygon']),
    center: z.array(z.number()).length(2).optional(), // [lat, lon] for circles
    radius: z.number().positive().optional(), // kilometers
    coordinates: z.array(z.array(z.array(z.number()))).optional() // GeoJSON polygon
  }),
  fleetId: z.string().optional(),
  priority: z.number().int().min(1).default(1),
  alertRadius: z.object({
    critical: z.number().positive(),
    high: z.number().positive(),
    moderate: z.number().positive()
  })
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_GEO_FENCES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createGeoFenceSchema.parse(body)

    const geoFence = await prisma.geoFence.create({
      data: {
        name: validated.name,
        description: validated.description,
        type: validated.type,
        geometry: validated.geometry,
        fleetId: validated.fleetId,
        priority: validated.priority,
        alertRadius: validated.alertRadius,
        active: true
      }
    })

    return NextResponse.json(geoFence, { status: 201 })
  } catch (error) {
    console.error('Error creating geo-fence:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create geo-fence' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const geoFences = await prisma.geoFence.findMany({
      where: { active: true },
      include: {
        fleet: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(geoFences)
  } catch (error) {
    console.error('Error fetching geo-fences:', error)
    return NextResponse.json({ error: 'Failed to fetch geo-fences' }, { status: 500 })
  }
}
```

---

## Geo-Fence Map Editor Component

**File**: `components/dashboard/geo-fences/GeoFenceEditor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Circle as CircleIcon, Polygon } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapDrawer = dynamic(() => import('./MapDrawer'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />
})

type GeometryType = 'circle' | 'polygon'

export function GeoFenceEditor() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [geometryType, setGeometryType] = useState<GeometryType>('circle')
  const [geometry, setGeometry] = useState<any>(null)
  const [alertRadius, setAlertRadius] = useState({
    critical: 50,
    high: 150,
    moderate: 300
  })
  const [priority, setPriority] = useState(1)

  const handleSave = async () => {
    try {
      const res = await fetch('/api/geo-fences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type: geometryType,
          geometry,
          priority,
          alertRadius
        })
      })

      if (res.ok) {
        alert('Geo-fence created successfully!')
        // Reset form
        setName('')
        setDescription('')
        setGeometry(null)
      } else {
        alert('Failed to create geo-fence')
      }
    } catch (error) {
      console.error('Error saving geo-fence:', error)
      alert('Error saving geo-fence')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Geo-Fence</CardTitle>
          <CardDescription>
            Define custom alert zones for your fleet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Panama Canal Zone"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Geometry Type */}
          <div>
            <Label>Zone Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant={geometryType === 'circle' ? 'default' : 'outline'}
                onClick={() => setGeometryType('circle')}
                className="w-full"
              >
                <CircleIcon className="mr-2 h-4 w-4" />
                Circle
              </Button>
              <Button
                variant={geometryType === 'polygon' ? 'default' : 'outline'}
                onClick={() => setGeometryType('polygon')}
                className="w-full"
              >
                <Polygon className="mr-2 h-4 w-4" />
                Polygon
              </Button>
            </div>
          </div>

          {/* Alert Radii */}
          <div>
            <Label>Alert Radii (Nautical Miles)</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <Label className="text-xs">Critical</Label>
                <Input
                  type="number"
                  min="1"
                  value={alertRadius.critical}
                  onChange={(e) => setAlertRadius({
                    ...alertRadius,
                    critical: parseInt(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">High</Label>
                <Input
                  type="number"
                  min="1"
                  value={alertRadius.high}
                  onChange={(e) => setAlertRadius({
                    ...alertRadius,
                    high: parseInt(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Moderate</Label>
                <Input
                  type="number"
                  min="1"
                  value={alertRadius.moderate}
                  onChange={(e) => setAlertRadius({
                    ...alertRadius,
                    moderate: parseInt(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers = higher priority (checked first)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Map Drawing Area */}
      <Card>
        <CardHeader>
          <CardTitle>Draw Zone on Map</CardTitle>
          <CardDescription>
            {geometryType === 'circle'
              ? 'Click on the map to place a circle, then drag to set radius'
              : 'Click on the map to draw polygon vertices. Double-click to finish.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MapDrawer
            geometryType={geometryType}
            onGeometryChange={setGeometry}
          />
          
          {geometry && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                ✅ Zone defined
                {geometry.type === 'circle' && (
                  <>
                    {' '}• Center: {geometry.center[0].toFixed(4)}, {geometry.center[1].toFixed(4)}
                    {' '}• Radius: {geometry.radius.toFixed(0)} km
                  </>
                )}
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!name || !geometry}
            className="w-full mt-4"
            size="lg"
          >
            <MapPin className="mr-2 h-5 w-5" />
            Create Geo-Fence
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Leaflet Map Drawer Component

**File**: `components/dashboard/geo-fences/MapDrawer.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

type MapDrawerProps = {
  geometryType: 'circle' | 'polygon'
  onGeometryChange: (geometry: any) => void
}

export default function MapDrawer({ geometryType, onGeometryChange }: MapDrawerProps) {
  const mapRef = useRef<L.Map | null>(null)
  const drawnLayersRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize map
    if (!mapRef.current) {
      const map = L.map('map-drawer').setView([35.6762, 139.6503], 4)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      mapRef.current = map
      drawnLayersRef.current = new L.FeatureGroup()
      map.addLayer(drawnLayersRef.current)
    }

    // Setup drawing controls
    const map = mapRef.current
    const drawnLayers = drawnLayersRef.current!

    // Clear existing layers
    drawnLayers.clearLayers()

    // Remove existing controls
    map.eachLayer((layer) => {
      if (layer instanceof L.Control) {
        map.removeControl(layer)
      }
    })

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        marker: false,
        circlemarker: false,
        rectangle: false,
        circle: geometryType === 'circle' ? {
          shapeOptions: {
            color: '#ff6b6b',
            fillOpacity: 0.2
          }
        } : false,
        polygon: geometryType === 'polygon' ? {
          shapeOptions: {
            color: '#ff6b6b',
            fillOpacity: 0.2
          }
        } : false
      },
      edit: {
        featureGroup: drawnLayers,
        remove: true
      }
    })

    map.addControl(drawControl)

    // Handle draw created
    const onDrawCreated = (e: any) => {
      const layer = e.layer
      drawnLayers.clearLayers() // Only allow one shape
      drawnLayers.addLayer(layer)

      if (e.layerType === 'circle') {
        const center = layer.getLatLng()
        const radius = layer.getRadius() / 1000 // Convert to km

        onGeometryChange({
          type: 'circle',
          center: [center.lat, center.lng],
          radius
        })
      } else if (e.layerType === 'polygon') {
        const latlngs = layer.getLatLngs()[0]
        const coordinates = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])
        coordinates.push(coordinates[0]) // Close polygon

        onGeometryChange({
          type: 'polygon',
          coordinates: [[coordinates]]
        })
      }
    }

    // Handle draw edited
    const onDrawEdited = (e: any) => {
      e.layers.eachLayer((layer: any) => {
        if (layer instanceof L.Circle) {
          const center = layer.getLatLng()
          const radius = layer.getRadius() / 1000

          onGeometryChange({
            type: 'circle',
            center: [center.lat, center.lng],
            radius
          })
        } else if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0]
          const coordinates = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])
          coordinates.push(coordinates[0])

          onGeometryChange({
            type: 'polygon',
            coordinates: [[coordinates]]
          })
        }
      })
    }

    // Handle draw deleted
    const onDrawDeleted = () => {
      onGeometryChange(null)
    }

    map.on(L.Draw.Event.CREATED, onDrawCreated)
    map.on(L.Draw.Event.EDITED, onDrawEdited)
    map.on(L.Draw.Event.DELETED, onDrawDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreated)
      map.off(L.Draw.Event.EDITED, onDrawEdited)
      map.off(L.Draw.Event.DELETED, onDrawDeleted)
    }
  }, [geometryType, onGeometryChange])

  return <div id="map-drawer" style={{ height: '400px', width: '100%' }} />
}
```

---

## Geo-Fence List Page

**File**: `app/dashboard/geo-fences/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GeoFenceList } from '@/components/dashboard/geo-fences/GeoFenceList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function GeoFencesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Geo-Fences</h1>
          <p className="text-muted-foreground mt-1">
            Custom alert zones for your fleet
          </p>
        </div>
        <Link href="/dashboard/geo-fences/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Geo-Fence
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading geo-fences...</div>}>
        <GeoFenceList />
      </Suspense>
    </div>
  )
}
```

---

## Install Dependencies

```bash
npm install leaflet leaflet-draw
npm install -D @types/leaflet @types/leaflet-draw
```

---

## Integration with Geo-Fence Monitor

Update `lib/services/geo-fence-monitor.ts` to check custom zones:

```typescript
async checkCustomGeoFences(vessels: any[]): Promise<void> {
  // Get active custom geo-fences
  const geoFences = await prisma.geoFence.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' }
  })

  for (const geoFence of geoFences) {
    for (const vessel of vessels) {
      const isInZone = this.isVesselInGeoFence(vessel.position, geoFence.geometry)
      
      if (isInZone) {
        // Create alert with custom radius
        const distance = this.calculateDistanceToZone(vessel.position, geoFence.geometry)
        const riskLevel = this.getRiskLevelFromRadius(distance, geoFence.alertRadius)
        
        await this.createCustomZoneAlert(vessel, geoFence, distance, riskLevel)
      }
    }
  }
}

private isVesselInGeoFence(position: any, geometry: any): boolean {
  if (geometry.type === 'circle') {
    const distance = this.calculateDistance(
      position.latitude,
      position.longitude,
      geometry.center[0],
      geometry.center[1]
    )
    return distance <= geometry.radius
  }
  
  // For polygon, use point-in-polygon algorithm
  return this.isPointInPolygon(
    [position.latitude, position.longitude],
    geometry.coordinates[0][0]
  )
}
```

---

## Next Steps

1. ✅ Test geo-fence drawing on map
2. ✅ Integrate with alert system
3. ✅ Move to Week 6: Insurance Features

**Implementation Status**: Ready to code ✅
