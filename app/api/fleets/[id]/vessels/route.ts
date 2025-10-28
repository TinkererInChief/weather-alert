import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
    const body = await req.json()
    const validated = addVesselSchema.parse(body)

    // Verify fleet ownership
    const fleet = await prisma.fleet.findFirst({
      where: {
        id: params.id,
        ownerId: currentUser.id
      }
    })

    if (!fleet) {
      return NextResponse.json(
        { error: 'Fleet not found or access denied' },
        { status: 404 }
      )
    }

    // Verify vessel exists
    const vessel = await prisma.vessel.findUnique({
      where: { id: validated.vesselId }
    })

    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 })
    }

    // Check if already added
    const existing = await prisma.fleetVessel.findUnique({
      where: {
        fleetId_vesselId: {
          fleetId: params.id,
          vesselId: validated.vesselId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Vessel already in fleet' },
        { status: 409 }
      )
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
            mmsi: true,
            name: true,
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
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add vessel to fleet' },
      { status: 500 }
    )
  }
}
