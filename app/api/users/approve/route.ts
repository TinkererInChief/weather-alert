import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const approvalSchema = z.object({
  userId: z.string(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional()
})

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser || !['SUPER_ADMIN', 'ORG_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can approve users.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, action, rejectionReason } = approvalSchema.parse(body)

    // Get the user to approve/reject
    const userToApprove = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToApprove) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToApprove.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: `User has already been ${userToApprove.approvalStatus}` },
        { status: 400 }
      )
    }

    // Update user approval status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: action === 'approve' ? 'approved' : 'rejected',
        isActive: action === 'approve',
        approvedBy: currentUser.id,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null
      }
    })

    // Log the approval/rejection in audit trail
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: action === 'approve' ? 'USER_APPROVED' : 'USER_REJECTED',
        resource: 'User',
        resourceId: userId,
        metadata: {
          approvedBy: currentUser.name,
          userName: updatedUser.name,
          userEmail: updatedUser.email,
          rejectionReason: rejectionReason || null
        }
      }
    })

    // TODO: Send notification to user about approval/rejection
    // This would typically send an email to the user

    return NextResponse.json({
      success: true,
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        approvalStatus: updatedUser.approvalStatus
      }
    })

  } catch (error) {
    console.error('User approval error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process user approval' },
      { status: 500 }
    )
  }
}
