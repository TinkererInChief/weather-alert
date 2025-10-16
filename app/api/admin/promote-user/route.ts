import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/rbac'
import { Role } from '@/lib/rbac/roles'

/**
 * POST /api/admin/promote-user
 * 
 * Emergency admin endpoint to promote a user to SUPER_ADMIN.
 * Protected by a secret token for one-time administrative use.
 * 
 * Usage:
 *   POST /api/admin/promote-user
 *   Headers: { "x-admin-secret": "<ADMIN_SECRET>" }
 *   Body: { "email": "user@example.com", "role": "SUPER_ADMIN" }
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin secret
    const adminSecret = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production'
    
    if (adminSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid admin secret' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { email, role } = body

    // Validate inputs
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Valid roles: ${Object.values(Role).join(', ')}` },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: `User not found: ${email}` },
        { status: 404 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: role as Role,
        isActive: true,
        approvalStatus: 'approved'
      }
    })

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = req.headers.get('user-agent') || undefined
    await logAudit({
      userId: user.id,
      action: 'ADMIN_PROMOTE_USER',
      resource: 'User',
      resourceId: user.id,
      metadata: {
        oldRole: user.role,
        newRole: role,
        promotedViaAdminEndpoint: true,
        timestamp: new Date().toISOString()
      },
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({
      success: true,
      message: `User ${email} promoted to ${role}`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        approvalStatus: updatedUser.approvalStatus
      }
    })

  } catch (error) {
    console.error('Error promoting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to promote user' },
      { status: 500 }
    )
  }
}
