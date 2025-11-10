import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    const currentUser = session.user as any

    // Try to find contact
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: currentUser.email },
          { phone: currentUser.phone }
        ]
      }
    })

    // Get fleets for this contact
    let fleets: any[] = []
    if (contact) {
      fleets = await prisma.fleet.findMany({
        where: {
          ownerId: contact.id
        },
        include: {
          _count: {
            select: { vessels: true }
          }
        }
      })
    }

    return NextResponse.json({
      session: {
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        }
      },
      contact: contact ? {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone
      } : null,
      fleets: fleets.map(f => ({
        id: f.id,
        name: f.name,
        vesselCount: f._count.vessels
      })),
      debug: {
        hasSession: !!session,
        hasUser: !!currentUser,
        hasContact: !!contact,
        fleetCount: fleets.length,
        totalVessels: fleets.reduce((sum, f) => sum + f._count.vessels, 0)
      }
    })
  } catch (error) {
    console.error('Debug session error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
