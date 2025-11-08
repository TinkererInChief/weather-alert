import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    // Get fleets owned by this user
    const fleets = await prisma.fleet.findMany({
      where: { ownerId: currentUser.id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        active: true
      }
    })

    return NextResponse.json({
      session: {
        userId: currentUser.id,
        email: currentUser.email,
        name: currentUser.name
      },
      database: dbUser,
      fleetsOwnedByThisUser: fleets,
      totalFleets: await prisma.fleet.count()
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
