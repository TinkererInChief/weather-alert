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
    const { id, name, email, phone, whatsapp, language, timezone, active } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
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
      action: 'UPDATE_CONTACT',
      resource: 'contact',
      resourceId: contact.id,
      metadata: { name: contact.name },
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}
