import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    const currentUser = session.user as any

    const fleet = await prisma.fleet.findFirst({
      where: {
        id: params.id,
        ownerId: currentUser.id
      },
      include: {
        vessels: {
          include: {
            vessel: {
              select: {
                id: true,
                mmsi: true,
                imo: true,
                name: true,
                callsign: true,
                vesselType: true,
                flag: true,
                length: true,
                width: true,
                grossTonnage: true,
                active: true,
                lastSeen: true
              }
            }
          },
          orderBy: { priority: 'asc' }
        }
      }
    })

    if (!fleet) {
      return NextResponse.json({ error: 'Fleet not found' }, { status: 404 })
    }

    return NextResponse.json(fleet)
  } catch (error) {
    console.error('Error fetching fleet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fleet' },
      { status: 500 }
    )
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
    const body = await req.json()
    const validated = updateFleetSchema.parse(body)

    // Verify ownership
    const existingFleet = await prisma.fleet.findFirst({
      where: {
        id: params.id,
        ownerId: currentUser.id
      }
    })

    if (!existingFleet) {
      return NextResponse.json(
        { error: 'Fleet not found or access denied' },
        { status: 404 }
      )
    }

    const fleet = await prisma.fleet.update({
      where: { id: params.id },
      data: validated
    })

    return NextResponse.json(fleet)
  } catch (error) {
    console.error('Error updating fleet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update fleet' },
      { status: 500 }
    )
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

    // Verify ownership
    const existingFleet = await prisma.fleet.findFirst({
      where: {
        id: params.id,
        ownerId: currentUser.id
      }
    })

    if (!existingFleet) {
      return NextResponse.json(
        { error: 'Fleet not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.fleet.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fleet:', error)
    return NextResponse.json(
      { error: 'Failed to delete fleet' },
      { status: 500 }
    )
  }
}
