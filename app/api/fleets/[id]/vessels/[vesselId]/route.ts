import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Remove vessel from fleet
    await prisma.fleetVessel.delete({
      where: {
        fleetId_vesselId: {
          fleetId: params.id,
          vesselId: params.vesselId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing vessel from fleet:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Vessel not found in fleet' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to remove vessel from fleet' },
      { status: 500 }
    )
  }
}
