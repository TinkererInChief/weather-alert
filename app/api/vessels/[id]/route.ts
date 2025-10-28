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
    const allowPublic = (process.env.VESSELS_PUBLIC_READ ?? 'true') !== 'false'
    
    if (!session && !allowPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vessel = await prisma.vessel.findUnique({
      where: { id: params.id },
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
        height: true,
        draught: true,
        grossTonnage: true,
        operator: true,
        owner: true,
        active: true,
        lastSeen: true,
        buildYear: true,
        manager: true
      }
    })

    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 })
    }

    return NextResponse.json(vessel)
  } catch (error) {
    console.error('Error fetching vessel:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vessel' },
      { status: 500 }
    )
  }
}
