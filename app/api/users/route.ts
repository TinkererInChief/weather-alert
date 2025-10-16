import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission, logAudit } from '@/lib/rbac'

/**
 * GET /api/users
 * List all users (requires VIEW_USERS permission)
 */
export const GET = withPermission(Permission.VIEW_USERS, async (req, session) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        organizationId: true,
        isActive: true,
        lastLoginAt: true,
        approvalStatus: true,
        approvedBy: true,
        approvedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      users: users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/users
 * Create a new user (requires MANAGE_USERS permission)
 */
export const POST = withPermission(Permission.MANAGE_USERS, async (req, session) => {
  try {
    const body = await req.json()
    const { name, email, phone, role, organizationId } = body
    
    // Validate required fields
    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: 'Name and either email or phone are required' },
        { status: 400 }
      )
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: role || 'VIEWER',
        organizationId,
        isActive: true,
      }
    })
    
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = req.headers.get('user-agent') || undefined
    await logAudit({
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: user.id,
      metadata: { role: user.role, organizationId: user.organizationId },
      ipAddress: ip,
      userAgent: ua,
    })
    
    return NextResponse.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
})
