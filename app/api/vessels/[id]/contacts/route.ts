import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignContactSchema = z.object({
  contactId: z.string(),
  role: z.string().default('crew'),
  priority: z.number().int().min(1).default(1),
  notifyOn: z.array(z.enum(['critical', 'high', 'moderate', 'low'])).default(['critical', 'high'])
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

    const vesselContacts = await prisma.vesselContact.findMany({
      where: { vesselId: params.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            language: true,
            timezone: true,
            notificationChannels: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { role: 'asc' }
      ]
    })

    return NextResponse.json(vesselContacts)
  } catch (error) {
    console.error('Error fetching vessel contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vessel contacts' },
      { status: 500 }
    )
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
    const validated = assignContactSchema.parse(body)

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
      return NextResponse.json(
        { error: 'Contact already assigned to this vessel' },
        { status: 409 }
      )
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
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true
          }
        }
      }
    })

    return NextResponse.json(vesselContact, { status: 201 })
  } catch (error) {
    console.error('Error assigning contact:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to assign contact' },
      { status: 500 }
    )
  }
}
