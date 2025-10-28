# Week 1 Day 1-2: Fleet Management System

**Priority**: 🔴 CRITICAL | **Effort**: 12-16 hours

---

## Overview

Create the "Fleet" concept to group YOUR vessels vs all 30k+ vessels in database. This is the foundation for targeting alerts only to vessels you care about.

---

## Database Schema

### Migration File: `prisma/migrations/XXX_add_fleet_management.sql`

```prisma
// Add to schema.prisma

model Fleet {
  id          String        @id @default(cuid())
  name        String
  description String?
  ownerId     String        // User who owns this fleet
  metadata    Json          @default("{}")
  active      Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  vessels     FleetVessel[]
  policies    EscalationPolicy[]
  
  @@index([ownerId])
  @@index([active])
  @@map("fleets")
}

model FleetVessel {
  id        String   @id @default(cuid())
  fleetId   String
  vesselId  String
  role      String   @default("primary")  // "primary", "backup", "auxiliary"
  priority  Int      @default(1)          // 1 = highest priority
  metadata  Json     @default("{}")
  addedAt   DateTime @default(now())
  
  fleet     Fleet    @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  vessel    Vessel   @relation(fields: [vesselId], references: [id], onDelete: Cascade)
  
  @@unique([fleetId, vesselId])
  @@index([fleetId])
  @@index([vesselId])
  @@map("fleet_vessels")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_fleet_management
```

---

## API Routes

### 1. Create Fleet

**File**: `app/api/fleets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'
import { z } from 'zod'

const createFleetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Check permission - only ADMIN or FLEET_MANAGER can create fleets
    if (!hasPermission(currentUser.role, Permission.MANAGE_FLEETS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createFleetSchema.parse(body)

    const fleet = await prisma.fleet.create({
      data: {
        name: validated.name,
        description: validated.description,
        ownerId: currentUser.id,
        metadata: validated.metadata || {},
        active: true
      }
    })

    return NextResponse.json(fleet, { status: 201 })
  } catch (error) {
    console.error('Error creating fleet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create fleet' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Get fleets owned by user or all if admin
    const fleets = await prisma.fleet.findMany({
      where: hasPermission(currentUser.role, Permission.VIEW_ALL_FLEETS)
        ? { active: true }
        : { ownerId: currentUser.id, active: true },
      include: {
        _count: {
          select: { vessels: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(fleets)
  } catch (error) {
    console.error('Error fetching fleets:', error)
    return NextResponse.json({ error: 'Failed to fetch fleets' }, { status: 500 })
  }
}
```

### 2. Get/Update/Delete Fleet

**File**: `app/api/fleets/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'
import { z } from 'zod'

const updateFleetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fleet = await prisma.fleet.findUnique({
      where: { id: params.id },
      include: {
        vessels: {
          include: {
            vessel: {
              select: {
                id: true,
                name: true,
                mmsi: true,
                imo: true,
                vesselType: true,
                flag: true
              }
            }
          },
          orderBy: { priority: 'asc' }
        },
        _count: {
          select: { vessels: true }
        }
      }
    })

    if (!fleet) {
      return NextResponse.json({ error: 'Fleet not found' }, { status: 404 })
    }

    return NextResponse.json(fleet)
  } catch (error) {
    console.error('Error fetching fleet:', error)
    return NextResponse.json({ error: 'Failed to fetch fleet' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_FLEETS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateFleetSchema.parse(body)

    const fleet = await prisma.fleet.update({
      where: { id: params.id },
      data: validated
    })

    return NextResponse.json(fleet)
  } catch (error) {
    console.error('Error updating fleet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update fleet' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_FLEETS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete
    await prisma.fleet.update({
      where: { id: params.id },
      data: { active: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fleet:', error)
    return NextResponse.json({ error: 'Failed to delete fleet' }, { status: 500 })
  }
}
```

### 3. Manage Fleet Vessels

**File**: `app/api/fleets/[id]/vessels/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'
import { z } from 'zod'

const addVesselSchema = z.object({
  vesselId: z.string(),
  role: z.enum(['primary', 'backup', 'auxiliary']).default('primary'),
  priority: z.number().int().min(1).default(1),
  metadata: z.record(z.any()).optional()
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_FLEETS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = addVesselSchema.parse(body)

    // Check if vessel exists
    const vessel = await prisma.vessel.findUnique({
      where: { id: validated.vesselId }
    })

    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 })
    }

    // Check if vessel already in fleet
    const existing = await prisma.fleetVessel.findUnique({
      where: {
        fleetId_vesselId: {
          fleetId: params.id,
          vesselId: validated.vesselId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Vessel already in fleet' }, { status: 409 })
    }

    const fleetVessel = await prisma.fleetVessel.create({
      data: {
        fleetId: params.id,
        vesselId: validated.vesselId,
        role: validated.role,
        priority: validated.priority,
        metadata: validated.metadata || {}
      },
      include: {
        vessel: {
          select: {
            id: true,
            name: true,
            mmsi: true,
            imo: true,
            vesselType: true,
            flag: true
          }
        }
      }
    })

    return NextResponse.json(fleetVessel, { status: 201 })
  } catch (error) {
    console.error('Error adding vessel to fleet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add vessel to fleet' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vessels = await prisma.fleetVessel.findMany({
      where: { fleetId: params.id },
      include: {
        vessel: {
          select: {
            id: true,
            name: true,
            mmsi: true,
            imo: true,
            vesselType: true,
            flag: true,
            callsign: true,
            destination: true,
            eta: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    })

    return NextResponse.json(vessels)
  } catch (error) {
    console.error('Error fetching fleet vessels:', error)
    return NextResponse.json({ error: 'Failed to fetch fleet vessels' }, { status: 500 })
  }
}
```

**File**: `app/api/fleets/[id]/vessels/[vesselId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; vesselId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_FLEETS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await prisma.fleetVessel.delete({
      where: {
        fleetId_vesselId: {
          fleetId: params.id,
          vesselId: params.vesselId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing vessel from fleet:', error)
    return NextResponse.json({ error: 'Failed to remove vessel from fleet' }, { status: 500 })
  }
}
```

---

## RBAC Permissions

Add to `lib/rbac/roles.ts`:

```typescript
export enum Permission {
  // ... existing permissions
  MANAGE_FLEETS = 'manage_fleets',
  VIEW_ALL_FLEETS = 'view_all_fleets',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // ... existing permissions
    Permission.MANAGE_FLEETS,
    Permission.VIEW_ALL_FLEETS,
  ],
  [Role.FLEET_MANAGER]: [
    // ... existing permissions
    Permission.MANAGE_FLEETS,
  ],
  // ... other roles
}
```

---

## UI Components

### Fleet List Page

**File**: `app/dashboard/fleets/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { FleetList } from '@/components/dashboard/fleets/FleetList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const metadata = {
  title: 'Fleet Management | Maritime Alert System',
  description: 'Manage your vessel fleets'
}

export default async function FleetsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fleet Management</h1>
          <p className="text-muted-foreground mt-1">
            Organize your vessels into fleets for targeted alert monitoring
          </p>
        </div>
        <Link href="/dashboard/fleets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Fleet
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading fleets...</div>}>
        <FleetList />
      </Suspense>
    </div>
  )
}
```

### Fleet List Component

**File**: `components/dashboard/fleets/FleetList.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ship, Users, AlertTriangle, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Fleet = {
  id: string
  name: string
  description: string | null
  active: boolean
  createdAt: string
  _count: {
    vessels: number
  }
}

export function FleetList() {
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFleets()
  }, [])

  const fetchFleets = async () => {
    try {
      const res = await fetch('/api/fleets')
      const data = await res.json()
      setFleets(data)
    } catch (error) {
      console.error('Error fetching fleets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fleet?')) return

    try {
      await fetch(`/api/fleets/${id}`, { method: 'DELETE' })
      fetchFleets()
    } catch (error) {
      console.error('Error deleting fleet:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (fleets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Ship className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No fleets yet</p>
          <p className="text-muted-foreground mb-4">
            Create your first fleet to start monitoring vessels
          </p>
          <Link href="/dashboard/fleets/new">
            <Button>Create Fleet</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {fleets.map((fleet) => (
        <Card key={fleet.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {fleet.name}
                  {fleet.active && <Badge variant="default">Active</Badge>}
                </CardTitle>
                <CardDescription className="mt-1">
                  {fleet.description || 'No description'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span>{fleet._count.vessels} vessels</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href={`/dashboard/fleets/${fleet.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(fleet.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Fleet Detail Page with Vessel Assignment

**File**: `app/dashboard/fleets/[id]/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { FleetDetail } from '@/components/dashboard/fleets/FleetDetail'

export default async function FleetDetailPage({
  params
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading fleet...</div>}>
        <FleetDetail fleetId={params.id} />
      </Suspense>
    </div>
  )
}
```

**File**: `components/dashboard/fleets/FleetDetail.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Ship, Plus, Trash2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function FleetDetail({ fleetId }: { fleetId: string }) {
  const [fleet, setFleet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [vesselSearch, setVesselSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    fetchFleet()
  }, [fleetId])

  const fetchFleet = async () => {
    try {
      const res = await fetch(`/api/fleets/${fleetId}`)
      const data = await res.json()
      setFleet(data)
    } catch (error) {
      console.error('Error fetching fleet:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchVessels = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    try {
      const res = await fetch(`/api/vessels?search=${encodeURIComponent(query)}&limit=10`)
      const data = await res.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Error searching vessels:', error)
    }
  }

  const addVessel = async (vesselId: string) => {
    try {
      await fetch(`/api/fleets/${fleetId}/vessels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vesselId, role: 'primary', priority: 1 })
      })
      setShowAddDialog(false)
      setVesselSearch('')
      setSearchResults([])
      fetchFleet()
    } catch (error) {
      console.error('Error adding vessel:', error)
    }
  }

  const removeVessel = async (vesselId: string) => {
    if (!confirm('Remove this vessel from the fleet?')) return

    try {
      await fetch(`/api/fleets/${fleetId}/vessels/${vesselId}`, {
        method: 'DELETE'
      })
      fetchFleet()
    } catch (error) {
      console.error('Error removing vessel:', error)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!fleet) return <div>Fleet not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{fleet.name}</h1>
          <p className="text-muted-foreground mt-1">
            {fleet.description || 'No description'}
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vessel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vessel to Fleet</DialogTitle>
              <DialogDescription>
                Search for a vessel by name, MMSI, or IMO number
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vessels..."
                  value={vesselSearch}
                  onChange={(e) => {
                    setVesselSearch(e.target.value)
                    searchVessels(e.target.value)
                  }}
                  className="pl-9"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((vessel) => (
                    <Card key={vessel.id} className="cursor-pointer hover:bg-accent" onClick={() => addVessel(vessel.id)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{vessel.name}</p>
                            <p className="text-sm text-muted-foreground">
                              MMSI: {vessel.mmsi} | IMO: {vessel.imo || 'N/A'}
                            </p>
                          </div>
                          <Badge>{vessel.vesselType}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Vessels ({fleet.vessels.length})</CardTitle>
          <CardDescription>
            Vessels currently assigned to this fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fleet.vessels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ship className="mx-auto h-12 w-12 mb-4" />
              <p>No vessels in this fleet yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fleet.vessels.map((fv: any) => (
                <div
                  key={fv.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Ship className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{fv.vessel.name}</p>
                      <p className="text-sm text-muted-foreground">
                        MMSI: {fv.vessel.mmsi} | Type: {fv.vessel.vesselType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{fv.role}</Badge>
                    <Badge variant="secondary">Priority {fv.priority}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVessel(fv.vesselId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Testing

### Manual Testing Checklist

1. ✅ Create a new fleet
2. ✅ View fleet list
3. ✅ Search and add vessels to fleet
4. ✅ Remove vessels from fleet
5. ✅ Update fleet details
6. ✅ Delete fleet (soft delete)
7. ✅ Test RBAC (only ADMIN/FLEET_MANAGER can manage)

### API Testing

```bash
# Create fleet
curl -X POST http://localhost:3000/api/fleets \
  -H "Content-Type: application/json" \
  -d '{"name":"Pacific Fleet","description":"All vessels in Pacific region"}'

# Get fleets
curl http://localhost:3000/api/fleets

# Add vessel to fleet
curl -X POST http://localhost:3000/api/fleets/{fleetId}/vessels \
  -H "Content-Type: application/json" \
  -d '{"vesselId":"vessel_123","role":"primary","priority":1}'
```

---

## Next Steps

Once fleet management is complete:
1. ✅ Move to Week 1 Day 2-3: Vessel-Contact Assignment
2. ✅ Use fleet data in Week 3 for geo-fence monitoring
3. ✅ Link escalation policies to fleets in Week 2

**Implementation Status**: Ready to code ✅
