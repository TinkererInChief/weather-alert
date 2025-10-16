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
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Get contact name before deletion for audit log
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { name: true }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Delete contact
    await prisma.contact.delete({
      where: { id }
    })

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = req.headers.get('user-agent') || undefined
    await logAudit({
      userId: currentUser.id,
      action: 'DELETE_CONTACT',
      resource: 'contact',
      resourceId: id,
      metadata: { name: contact.name },
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
