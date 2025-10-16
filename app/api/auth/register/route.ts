import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/rbac'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phone: validatedData.phone }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists' },
        { status: 400 }
      )
    }

    // Create user with pending approval status
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        role: 'VIEWER', // Default role
        isActive: false, // Inactive until approved
        approvalStatus: 'pending'
      }
    })

    // TODO: Send notification to admins about new registration
    // This would typically send an email to all SUPER_ADMIN or ORG_ADMIN users
    
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = request.headers.get('user-agent') || undefined
    await logAudit({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      metadata: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      userId: user.id
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
