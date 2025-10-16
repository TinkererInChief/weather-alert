import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, Role, withPermission, logAudit } from '@/lib/rbac'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * PATCH /api/users/[id]/role
 * Update user role (requires ASSIGN_ROLES permission)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.ASSIGN_ROLES, async (req, session) => {
    try {
      const { id } = context.params
      const body = await req.json()
      const { role } = body
      
      // Validate role
      if (!Object.values(Role).includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role' },
          { status: 400 }
        )
      }
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id }
      })
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Update role
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role }
      })
      
      const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
      const ua = req.headers.get('user-agent') || undefined
      await logAudit({
        action: 'UPDATE_USER_ROLE',
        resource: 'User',
        resourceId: id,
        metadata: { oldRole: user.role, newRole: role },
        ipAddress: ip,
        userAgent: ua,
      })
      
      return NextResponse.json({
        success: true,
        data: updatedUser
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user role' },
        { status: 500 }
      )
    }
  })(req)
}
