import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSystemSettings, saveSystemSettings, SystemSettingsSchema } from '@/lib/system-settings'
import { prisma } from '@/lib/prisma'
import { initializeApp } from '@/lib/init'

export async function GET() {
  try {
    // Ensure app is initialized
    await initializeApp().catch(console.error)
    
    const session = await getServerSession(authOptions as any)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const role = (session as any)?.user?.role || 'viewer'
    if (role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const settings = await getSystemSettings()
    const row = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
      select: { updatedAt: true, updatedBy: true }
    })
    return NextResponse.json({ success: true, data: { settings, meta: row ? { updatedAt: row.updatedAt, updatedBy: row.updatedBy || null } : null } }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Failed to load settings:', error)
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Ensure app is initialized
    await initializeApp().catch(console.error)
    
    const session = await getServerSession(authOptions as any)
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const role = (session as any)?.user?.role || 'viewer'
    if (role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    // Validate early for clear errors
    const parsed = SystemSettingsSchema.parse(body)

    const email = (session as any)?.user?.email as string | undefined
    const userId = (session as any)?.user?.id as string | undefined

    // Load previous for audit diff
    const before = await getSystemSettings()
    const saved = await saveSystemSettings(parsed, email)
    const row = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
      select: { updatedAt: true, updatedBy: true }
    })

    // Best-effort audit log
    try {
      const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0] || null
      const ua = request.headers.get('user-agent') || null
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: 'update_settings',
          resource: 'SystemSettings',
          resourceId: 'global',
          metadata: { before, after: saved, actorEmail: email },
          ipAddress: ip || undefined,
          userAgent: ua || undefined,
        }
      })
    } catch (e) {
      console.warn('⚠️ Failed to record settings audit log:', e)
    }

    return NextResponse.json({ success: true, data: { settings: saved, meta: row ? { updatedAt: row.updatedAt, updatedBy: row.updatedBy || null } : null } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
