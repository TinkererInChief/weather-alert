import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create fleet' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    const searchParams = req.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const fleets = await prisma.fleet.findMany({
      where: {
        ownerId: currentUser.id,
        ...(includeInactive ? {} : { active: true })
      },
      include: {
        vessels: {
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
          },
          orderBy: { priority: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(fleets)
  } catch (error) {
    console.error('Error fetching fleets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fleets' },
      { status: 500 }
    )
  }
}
