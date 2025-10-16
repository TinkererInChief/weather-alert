import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'
import { logAudit } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Check permission
    if (!hasPermission(currentUser.role as Role, Permission.MANAGE_CONTACTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, phone, whatsapp, language, timezone, active } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'At least one contact method (email or phone) is required' }, { status: 400 })
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        language: language || 'en',
        timezone: timezone || 'UTC',
        active: active !== undefined ? active : true
      }
    })

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = req.headers.get('user-agent') || undefined
    await logAudit({
      userId: currentUser.id,
      action: 'CREATE_CONTACT',
      resource: 'contact',
      resourceId: contact.id,
      metadata: { name: contact.name },
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
