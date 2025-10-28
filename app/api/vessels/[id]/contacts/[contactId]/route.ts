import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateContactSchema = z.object({
  role: z.string().optional(),
  priority: z.number().int().min(1).optional(),
  notifyOn: z.array(z.enum(['critical', 'high', 'moderate', 'low'])).optional()
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

    const vesselContact = await prisma.vesselContact.updateMany({
      where: {
        vesselId: params.id,
        contactId: params.contactId
      },
      data: validated
    })

    if (vesselContact.count === 0) {
      return NextResponse.json(
        { error: 'Contact assignment not found' },
        { status: 404 }
      )
    }

    // Fetch updated record
    const updated = await prisma.vesselContact.findUnique({
      where: {
        vesselId_contactId: {
          vesselId: params.id,
          contactId: params.contactId
        }
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating vessel contact:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update vessel contact' },
      { status: 500 }
    )
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
  } catch (error: any) {
    console.error('Error removing vessel contact:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Contact assignment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to remove vessel contact' },
      { status: 500 }
    )
  }
}
