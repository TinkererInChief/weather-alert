# Week 4 Day 2-3: Alert Acknowledgment UI

**Priority**: 🟠 HIGH | **Effort**: 8-10 hours

---

## Overview

Mobile-responsive UI for captains and crew to view and acknowledge active alerts. Designed for quick access on mobile devices at sea.

**Features**:
- Active alerts dashboard with filtering
- One-click acknowledgment
- Alert details with map
- Real-time status updates
- Mobile-optimized design

---

## Active Alerts Dashboard

**File**: `app/dashboard/active-alerts/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ActiveAlertsList } from '@/components/dashboard/alerts/ActiveAlertsList'
import { AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Active Alerts | Maritime Alert System',
  description: 'View and acknowledge active vessel alerts'
}

export default async function ActiveAlertsPage({
  searchParams
}: {
  searchParams: { success?: string; error?: string; alertId?: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-4 md:py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Active Alerts</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Alerts requiring acknowledgment
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {searchParams.success === 'acknowledged' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ Alert acknowledged successfully
          </p>
        </div>
      )}

      {searchParams.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">
            ❌ Error: {searchParams.error.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      <Suspense fallback={<div>Loading alerts...</div>}>
        <ActiveAlertsList />
      </Suspense>
    </div>
  )
}
```

---

## Active Alerts List Component

**File**: `components/dashboard/alerts/ActiveAlertsList.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, CheckCircle, Clock, Ship, MapPin, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Alert = {
  id: string
  vesselId: string
  eventType: string
  severity: number
  riskLevel: string
  distance: number
  recommendation: string
  createdAt: string
  acknowledgedAt: string | null
  vessel: {
    name: string
    mmsi: string
    latitude: number
    longitude: number
  }
  metadata: any
}

export function ActiveAlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'moderate'>('all')

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/vessel-alerts/active')
      const data = await res.json()
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    if (!confirm('Acknowledge this alert? This will stop escalation notifications.')) {
      return
    }

    try {
      await fetch(`/api/vessel-alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      })

      // Refresh alerts
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      alert('Failed to acknowledge alert. Please try again.')
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    if (filter === 'critical') return alert.severity >= 5
    if (filter === 'high') return alert.severity === 4
    if (filter === 'moderate') return alert.severity === 3
    return true
  })

  const unacknowledgedAlerts = filteredAlerts.filter(a => !a.acknowledgedAt)
  const acknowledgedAlerts = filteredAlerts.filter(a => a.acknowledgedAt)

  if (loading) {
    return <div className="text-center py-12">Loading alerts...</div>
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({alerts.filter(a => a.severity >= 5).length})
          </TabsTrigger>
          <TabsTrigger value="high">
            High ({alerts.filter(a => a.severity === 4).length})
          </TabsTrigger>
          <TabsTrigger value="moderate">
            Moderate ({alerts.filter(a => a.severity === 3).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Unacknowledged Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Requires Acknowledgment ({unacknowledgedAlerts.length})
          </h2>

          {unacknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className="border-l-4 border-l-destructive">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Ship className="h-5 w-5" />
                      {alert.vessel.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      MMSI: {alert.vessel.mmsi}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive" className="capitalize">
                      {alert.riskLevel}
                    </Badge>
                    <Badge variant="outline">
                      {alert.eventType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Event Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Event:</span>
                    <p className="font-medium">
                      {alert.eventType === 'earthquake' ? 'Earthquake' : 'Tsunami'} M
                      {alert.metadata?.magnitude || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distance:</span>
                    <p className="font-medium">{alert.distance} NM</p>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-900">
                    ⚠️ {alert.recommendation}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex-1"
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Acknowledge Alert
                  </Button>
                  <Link
                    href={`/dashboard/vessel-alerts/${alert.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" size="lg">
                      View Details
                    </Button>
                  </Link>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${alert.vessel.latitude}&mlon=${alert.vessel.longitude}&zoom=8`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg">
                      <MapPin className="h-5 w-5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3 mt-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Acknowledged ({acknowledgedAlerts.length})
          </h2>

          {acknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{alert.vessel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.eventType.toUpperCase()} • {alert.distance} NM
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50">
                      Acknowledged
                    </Badge>
                    <Link href={`/dashboard/vessel-alerts/${alert.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <p className="text-lg font-medium mb-2">No active alerts</p>
            <p className="text-muted-foreground text-center">
              All alerts have been acknowledged or there are no alerts matching your filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Alert Detail Page

**File**: `app/dashboard/vessel-alerts/[id]/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertDetail } from '@/components/dashboard/alerts/AlertDetail'

export default async function AlertDetailPage({
  params
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-4 md:py-8 max-w-4xl">
      <Suspense fallback={<div>Loading alert details...</div>}>
        <AlertDetail alertId={params.id} />
      </Suspense>
    </div>
  )
}
```

**File**: `components/dashboard/alerts/AlertDetail.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, Clock, MapPin, Ship, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/maps/AlertMapView'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />
})

export function AlertDetail({ alertId }: { alertId: string }) {
  const [alert, setAlert] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlert()
  }, [alertId])

  const fetchAlert = async () => {
    try {
      const res = await fetch(`/api/vessel-alerts/${alertId}`)
      const data = await res.json()
      setAlert(data)
    } catch (error) {
      console.error('Error fetching alert:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!confirm('Acknowledge this alert?')) return

    try {
      await fetch(`/api/vessel-alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      })

      fetchAlert()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      alert('Failed to acknowledge alert')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!alert) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p>Alert not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/active-alerts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Alert Status */}
      <Card className={alert.acknowledgedAt ? '' : 'border-l-4 border-l-destructive'}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {alert.acknowledgedAt ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                )}
                Alert Details
              </CardTitle>
              <CardDescription className="mt-2">
                {alert.acknowledgedAt
                  ? `Acknowledged ${formatDistanceToNow(new Date(alert.acknowledgedAt), { addSuffix: true })}`
                  : `Active • Created ${formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}`
                }
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={alert.acknowledgedAt ? 'outline' : 'destructive'} className="capitalize">
                {alert.riskLevel}
              </Badge>
              <Badge variant="outline">
                {alert.eventType.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vessel Info */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Vessel Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{alert.vessel.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">MMSI:</span>
                <p className="font-medium">{alert.vessel.mmsi}</p>
              </div>
              {alert.vessel.imo && (
                <div>
                  <span className="text-muted-foreground">IMO:</span>
                  <p className="font-medium">{alert.vessel.imo}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{alert.vessel.vesselType || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Details */}
          <div>
            <h3 className="font-semibold mb-2">Event Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium capitalize">{alert.eventType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Magnitude:</span>
                <p className="font-medium">M{alert.metadata?.magnitude || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Distance:</span>
                <p className="font-medium">{alert.distance} NM</p>
              </div>
              <div>
                <span className="text-muted-foreground">Occurred:</span>
                <p className="font-medium">
                  {alert.metadata?.occurredAt
                    ? format(new Date(alert.metadata.occurredAt), 'PPpp')
                    : 'Unknown'}
                </p>
              </div>
            </div>
            {alert.metadata?.eventLocation && (
              <div className="mt-2">
                <span className="text-muted-foreground text-sm">Location:</span>
                <p className="font-medium">{alert.metadata.eventLocation}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Recommendation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-yellow-900">⚠️ Recommended Action</h3>
            <p className="text-sm text-yellow-900">{alert.recommendation}</p>
          </div>

          {/* Map */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </h3>
            <MapView
              vesselPosition={{
                lat: alert.vessel.latitude,
                lon: alert.vessel.longitude
              }}
              eventPosition={
                alert.metadata?.latitude && alert.metadata?.longitude
                  ? {
                      lat: alert.metadata.latitude,
                      lon: alert.metadata.longitude
                    }
                  : undefined
              }
            />
          </div>

          {/* Acknowledge Button */}
          {!alert.acknowledgedAt && (
            <Button onClick={handleAcknowledge} className="w-full" size="lg">
              <CheckCircle className="mr-2 h-5 w-5" />
              Acknowledge Alert
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## API Endpoints

**File**: `app/api/vessel-alerts/active/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active alerts (not resolved, created in last 7 days)
    const alerts = await prisma.vesselAlert.findMany({
      where: {
        resolvedAt: null,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        vessel: {
          select: {
            id: true,
            name: true,
            mmsi: true,
            imo: true,
            vesselType: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching active alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
```

**File**: `app/api/vessel-alerts/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alert = await prisma.vesselAlert.findUnique({
      where: { id: params.id },
      include: {
        vessel: true
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Error fetching alert:', error)
    return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 })
  }
}
```

---

## Mobile Optimization

Add to global CSS:

```css
/* app/globals.css */

/* Mobile-optimized touch targets */
@media (max-width: 768px) {
  button,
  a {
    min-height: 44px;
    min-width: 44px;
  }

  /* Larger text for readability on mobile */
  .alert-card {
    font-size: 16px;
  }

  /* Full-width buttons on mobile */
  .mobile-full-width {
    width: 100%;
  }
}
```

---

## Testing

### Manual Testing Checklist

1. ✅ View active alerts on desktop
2. ✅ View active alerts on mobile
3. ✅ Filter alerts by severity
4. ✅ Acknowledge alert via button
5. ✅ View alert details
6. ✅ Check map display
7. ✅ Test real-time refresh
8. ✅ Test success/error messages

---

## Next Steps

1. ✅ Add PWA support for offline access
2. ✅ Move to Week 4 Day 4-5: Testing & Monitoring
3. ✅ Add push notifications for new alerts

**Implementation Status**: Ready to code ✅
