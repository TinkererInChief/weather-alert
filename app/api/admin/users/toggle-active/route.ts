import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/lib/rbac/roles'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Only SUPER_ADMIN and ORG_ADMIN can toggle active status
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.ORG_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, isActive } = body

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Prevent self-deactivation
    if (userId === currentUser.id && !isActive) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        resource: 'user',
        resourceId: userId,
        metadata: { isActive }
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Error toggling user active status:', error)
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
  }
}
