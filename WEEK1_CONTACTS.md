# Week 1 Day 2-3: Vessel-Contact Assignment

**Priority**: 🔴 CRITICAL | **Effort**: 10-12 hours

---

## Overview

Assign contacts to specific vessels with role hierarchy and priority ordering. This ensures the right people get notified for each vessel's alerts.

---

## Database Schema Enhancement

### Migration File: `prisma/migrations/XXX_enhance_vessel_contacts.sql`

```prisma
// Update existing model in schema.prisma

model VesselContact {
  id        String   @id @default(cuid())
  vesselId  String
  contactId String
  role      String   // "captain", "chief_officer", "operations_manager", "fleet_manager", "owner"
  priority  Int      @default(1)  // 1 = primary, 2 = secondary, 3 = tertiary
  notifyOn  String[] @default(["critical", "high"])  // Alert levels to notify
  primary   Boolean  @default(false) // DEPRECATED - use priority instead
  createdAt DateTime @default(now())
  
  vessel    Vessel   @relation(fields: [vesselId], references: [id], onDelete: Cascade)
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  @@unique([vesselId, contactId])
  @@index([vesselId])
  @@index([contactId])
  @@index([priority])
  @@map("vessel_contacts")
}
```

Run migration:
```bash
npx prisma migrate dev --name enhance_vessel_contacts
```

---

## Contact Hierarchy Service

**File**: `lib/services/contact-hierarchy.ts`

```typescript
import { prisma } from '@/lib/prisma'

export const ROLE_PRIORITY = {
  captain: 1,
  chief_officer: 2,
  operations_manager: 3,
  fleet_manager: 4,
  owner: 5,
  emergency_contact: 6
} as const

export type ContactRole = keyof typeof ROLE_PRIORITY
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export class ContactHierarchyService {
  private static instance: ContactHierarchyService

  static getInstance() {
    if (!ContactHierarchyService.instance) {
      ContactHierarchyService.instance = new ContactHierarchyService()
    }
    return ContactHierarchyService.instance
  }

  /**
   * Get contacts for a vessel based on alert severity
   * Returns contacts sorted by role hierarchy and priority
   */
  async getVesselContacts(
    vesselId: string,
    severity: AlertSeverity
  ): Promise<ContactWithMetadata[]> {
    // 1. Get vessel-specific contacts that should be notified for this severity
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        notifyOn: { has: severity }
      },
      include: {
        contact: {
          include: {
            notificationSettings: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },  // Primary first
        { role: 'asc' }       // Then by role hierarchy
      ]
    })

    // 2. Get global emergency contacts if critical
    let globalContacts: any[] = []
    if (severity === 'critical' || severity === 'high') {
      globalContacts = await prisma.contact.findMany({
        where: {
          active: true,
          metadata: {
            path: ['globalAlerts'],
            equals: true
          }
        }
      })
    }

    // 3. Merge and deduplicate
    const allContacts = [
      ...vesselContacts.map(vc => ({
        ...vc.contact,
        priority: vc.priority,
        role: vc.role as ContactRole,
        vesselSpecific: true
      })),
      ...globalContacts.map(c => ({
        ...c,
        priority: 999,
        role: 'emergency_contact' as ContactRole,
        vesselSpecific: false
      }))
    ]

    // Deduplicate by contact ID
    const uniqueContacts = this.deduplicateByContactId(allContacts)

    // Sort by role priority and then by assigned priority
    return uniqueContacts.sort((a, b) => {
      const roleComparison = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
      if (roleComparison !== 0) return roleComparison
      return a.priority - b.priority
    })
  }

  /**
   * Get contacts for escalation step
   * Returns contacts that match specified roles
   */
  async getContactsForRoles(
    vesselId: string,
    roles: string[],
    severity: AlertSeverity
  ): Promise<ContactWithMetadata[]> {
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        role: { in: roles },
        notifyOn: { has: severity }
      },
      include: {
        contact: true
      },
      orderBy: { priority: 'asc' }
    })

    return vesselContacts.map(vc => ({
      ...vc.contact,
      priority: vc.priority,
      role: vc.role as ContactRole,
      vesselSpecific: true
    }))
  }

  /**
   * Deduplicate contacts by ID (prefer vessel-specific over global)
   */
  private deduplicateByContactId(contacts: any[]): any[] {
    const seen = new Map()

    for (const contact of contacts) {
      const existing = seen.get(contact.id)
      
      if (!existing) {
        seen.set(contact.id, contact)
      } else if (contact.vesselSpecific && !existing.vesselSpecific) {
        // Replace global with vessel-specific
        seen.set(contact.id, contact)
      } else if (contact.priority < existing.priority) {
        // Keep higher priority
        seen.set(contact.id, contact)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Get notification channels for contact based on preferences and severity
   */
  getNotificationChannels(
    contact: any,
    severity: AlertSeverity
  ): string[] {
    const channels: string[] = []
    const settings = contact.notificationSettings || {}

    // Critical alerts use all available channels
    if (severity === 'critical') {
      if (settings.sms !== false) channels.push('sms')
      if (settings.whatsapp !== false) channels.push('whatsapp')
      if (settings.email !== false) channels.push('email')
      if (settings.voice !== false) channels.push('voice')
    } else if (severity === 'high') {
      if (settings.sms !== false) channels.push('sms')
      if (settings.whatsapp !== false) channels.push('whatsapp')
      if (settings.email !== false) channels.push('email')
    } else {
      // Medium/low severity - respect preferences
      if (settings.sms === true) channels.push('sms')
      if (settings.whatsapp === true) channels.push('whatsapp')
      if (settings.email !== false) channels.push('email')
    }

    // Fallback to SMS if no channels
    if (channels.length === 0 && contact.phone) {
      channels.push('sms')
    }

    return channels
  }
}

export type ContactWithMetadata = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role: ContactRole
  priority: number
  vesselSpecific: boolean
  notificationSettings?: any
}
```

---

## API Routes

### 1. Get Vessel Contacts

**File**: `app/api/vessels/[id]/contacts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addContactSchema = z.object({
  contactId: z.string(),
  role: z.enum(['captain', 'chief_officer', 'operations_manager', 'fleet_manager', 'owner']),
  priority: z.number().int().min(1).max(10).default(1),
  notifyOn: z.array(z.enum(['low', 'medium', 'high', 'critical'])).default(['critical', 'high'])
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

    const contacts = await prisma.vesselContact.findMany({
      where: { vesselId: params.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            active: true,
            notificationSettings: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { role: 'asc' }
      ]
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching vessel contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch vessel contacts' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = addContactSchema.parse(body)

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: validated.contactId }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if already assigned
    const existing = await prisma.vesselContact.findUnique({
      where: {
        vesselId_contactId: {
          vesselId: params.id,
          contactId: validated.contactId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Contact already assigned to this vessel' }, { status: 409 })
    }

    const vesselContact = await prisma.vesselContact.create({
      data: {
        vesselId: params.id,
        contactId: validated.contactId,
        role: validated.role,
        priority: validated.priority,
        notifyOn: validated.notifyOn
      },
      include: {
        contact: true
      }
    })

    return NextResponse.json(vesselContact, { status: 201 })
  } catch (error) {
    console.error('Error adding vessel contact:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add vessel contact' }, { status: 500 })
  }
}
```

### 2. Update/Delete Vessel Contact

**File**: `app/api/vessels/[id]/contacts/[contactId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateContactSchema = z.object({
  role: z.enum(['captain', 'chief_officer', 'operations_manager', 'fleet_manager', 'owner']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  notifyOn: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional()
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateContactSchema.parse(body)

    const vesselContact = await prisma.vesselContact.update({
      where: {
        vesselId_contactId: {
          vesselId: params.id,
          contactId: params.contactId
        }
      },
      data: validated,
      include: {
        contact: true
      }
    })

    return NextResponse.json(vesselContact)
  } catch (error) {
    console.error('Error updating vessel contact:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update vessel contact' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.vesselContact.delete({
      where: {
        vesselId_contactId: {
          vesselId: params.id,
          contactId: params.contactId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vessel contact:', error)
    return NextResponse.json({ error: 'Failed to delete vessel contact' }, { status: 500 })
  }
}
```

---

## UI Components

### Vessel Contacts Management Page

**File**: `app/dashboard/vessels/[id]/contacts/page.tsx`

```typescript
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { VesselContactsManager } from '@/components/dashboard/vessels/VesselContactsManager'

export default async function VesselContactsPage({
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
      <Suspense fallback={<div>Loading contacts...</div>}>
        <VesselContactsManager vesselId={params.id} />
      </Suspense>
    </div>
  )
}
```

### Vessel Contacts Manager Component

**File**: `components/dashboard/vessels/VesselContactsManager.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Edit, GripVertical, User, Phone, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const ROLES = [
  { value: 'captain', label: 'Captain', priority: 1 },
  { value: 'chief_officer', label: 'Chief Officer', priority: 2 },
  { value: 'operations_manager', label: 'Operations Manager', priority: 3 },
  { value: 'fleet_manager', label: 'Fleet Manager', priority: 4 },
  { value: 'owner', label: 'Owner', priority: 5 }
]

const SEVERITIES = [
  { value: 'critical', label: 'Critical', color: 'destructive' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'blue' }
]

export function VesselContactsManager({ vesselId }: { vesselId: string }) {
  const [vessel, setVessel] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [availableContacts, setAvailableContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newContact, setNewContact] = useState({
    contactId: '',
    role: 'captain',
    priority: 1,
    notifyOn: ['critical', 'high']
  })

  useEffect(() => {
    fetchData()
  }, [vesselId])

  const fetchData = async () => {
    try {
      const [vesselRes, contactsRes, availableRes] = await Promise.all([
        fetch(`/api/vessels/${vesselId}`),
        fetch(`/api/vessels/${vesselId}/contacts`),
        fetch('/api/contacts')
      ])

      const vesselData = await vesselRes.json()
      const contactsData = await contactsRes.json()
      const availableData = await availableRes.json()

      setVessel(vesselData)
      setContacts(contactsData)
      setAvailableContacts(availableData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async () => {
    try {
      await fetch(`/api/vessels/${vesselId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      })
      
      setShowAddDialog(false)
      setNewContact({
        contactId: '',
        role: 'captain',
        priority: 1,
        notifyOn: ['critical', 'high']
      })
      fetchData()
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Remove this contact from the vessel?')) return

    try {
      await fetch(`/api/vessels/${vesselId}/contacts/${contactId}`, {
        method: 'DELETE'
      })
      fetchData()
    } catch (error) {
      console.error('Error removing contact:', error)
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(contacts)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update priorities
    const updates = items.map((item, index) => ({
      ...item,
      priority: index + 1
    }))

    setContacts(updates)

    // Save to backend
    try {
      await Promise.all(
        updates.map(item =>
          fetch(`/api/vessels/${vesselId}/contacts/${item.contactId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: item.priority })
          })
        )
      )
    } catch (error) {
      console.error('Error updating priorities:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contact Management</h1>
          <p className="text-muted-foreground mt-1">
            Vessel: {vessel?.name} ({vessel?.mmsi})
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact to Vessel</DialogTitle>
              <DialogDescription>
                Assign a contact person with their role and notification preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Contact Person</Label>
                <Select
                  value={newContact.contactId}
                  onValueChange={(value) => setNewContact({ ...newContact, contactId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts
                      .filter(c => !contacts.find(vc => vc.contactId === c.id))
                      .map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} ({contact.phone || contact.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={newContact.role}
                  onValueChange={(value) => setNewContact({ ...newContact, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority (1 = highest)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newContact.priority}
                  onChange={(e) => setNewContact({ ...newContact, priority: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Notify On Severity Levels</Label>
                <div className="space-y-2 mt-2">
                  {SEVERITIES.map((severity) => (
                    <div key={severity.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={severity.value}
                        checked={newContact.notifyOn.includes(severity.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewContact({
                              ...newContact,
                              notifyOn: [...newContact.notifyOn, severity.value]
                            })
                          } else {
                            setNewContact({
                              ...newContact,
                              notifyOn: newContact.notifyOn.filter(s => s !== severity.value)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={severity.value} className="cursor-pointer">
                        <Badge variant={severity.color as any}>{severity.label}</Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleAddContact} className="w-full">
                Add Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Contacts ({contacts.length})</CardTitle>
          <CardDescription>
            Drag to reorder priority. Contact with priority 1 will be notified first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4" />
              <p>No contacts assigned to this vessel yet</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="contacts">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {contacts.map((vc, index) => (
                      <Draggable key={vc.id} draggableId={vc.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{vc.contact.name}</p>
                                <Badge variant="outline">{ROLES.find(r => r.value === vc.role)?.label}</Badge>
                                <Badge variant="secondary">Priority {vc.priority}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {vc.contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {vc.contact.phone}
                                  </span>
                                )}
                                {vc.contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {vc.contact.email}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 mt-2">
                                {vc.notifyOn.map((severity: string) => (
                                  <Badge
                                    key={severity}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {severity}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveContact(vc.contactId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Dependencies

Add drag-and-drop library:

```bash
npm install @hello-pangea/dnd
# or
pnpm add @hello-pangea/dnd
```

---

## Testing

### Manual Testing Checklist

1. ✅ Assign contact to vessel with role and priority
2. ✅ Drag-and-drop to reorder contacts
3. ✅ Update contact role and notification preferences
4. ✅ Remove contact from vessel
5. ✅ Test contact hierarchy service
6. ✅ Verify notification level filtering

### API Testing

```bash
# Add contact to vessel
curl -X POST http://localhost:3000/api/vessels/{vesselId}/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contactId":"contact_123",
    "role":"captain",
    "priority":1,
    "notifyOn":["critical","high"]
  }'

# Get vessel contacts
curl http://localhost:3000/api/vessels/{vesselId}/contacts

# Update contact priority
curl -X PUT http://localhost:3000/api/vessels/{vesselId}/contacts/{contactId} \
  -H "Content-Type: application/json" \
  -d '{"priority":2}'
```

---

## Usage in Alert System

### Example: Get contacts for vessel alert

```typescript
import { ContactHierarchyService } from '@/lib/services/contact-hierarchy'

// In alert dispatch logic
const contactService = ContactHierarchyService.getInstance()

// Get contacts for critical alert
const contacts = await contactService.getVesselContacts(
  vesselId,
  'critical'
)

// Dispatch notifications to contacts in priority order
for (const contact of contacts) {
  const channels = contactService.getNotificationChannels(contact, 'critical')
  
  for (const channel of channels) {
    await dispatchNotification(contact, channel, alertData)
  }
}
```

---

## Next Steps

Once vessel-contact assignment is complete:
1. ✅ Move to Week 1 Day 3-4: Dashboard Performance Optimization
2. ✅ Use contact hierarchy in Week 2 escalation system
3. ✅ Use in Week 3 alert dispatch

**Implementation Status**: Ready to code ✅
