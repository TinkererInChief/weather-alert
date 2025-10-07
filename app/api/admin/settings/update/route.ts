import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Only SUPER_ADMIN can update system settings
    if (!hasPermission(currentUser.role as Role, Permission.MANAGE_SYSTEM)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const settings = await req.json()

    // Update or create system settings
    const updatedSettings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        settings: settings as any,
        updatedBy: currentUser.id
      },
      create: {
        id: 'global',
        settings: settings as any,
        updatedBy: currentUser.id
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        resource: 'system_settings',
        resourceId: 'global',
        metadata: { settings }
      }
    })

    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
