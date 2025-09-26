import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session as any)?.user?.role || 'viewer'
    if (role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const BodySchema = z.union([
      z.object({ all: z.literal(true) }),
      z.object({
        ids: z.array(z.string().min(1)).min(1).max(100).transform((arr) =>
          arr.map((id) => (id.startsWith('delivery-') ? id.slice('delivery-'.length) : id))
        )
      })
    ])

    let parsed: { all?: true; ids?: string[] }
    try {
      parsed = BodySchema.parse(await request.json())
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    let where: Prisma.DeliveryLogWhereInput
    if (parsed.all) {
      where = { readAt: null }
    } else if (parsed.ids && parsed.ids.length > 0) {
      where = { id: { in: parsed.ids } }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const result = await prisma.deliveryLog.updateMany({
      where,
      data: { readAt: new Date() },
    })

    return NextResponse.json({ success: true, updated: result.count })
  } catch (error) {
    console.error('❌ Failed to mark notifications as read:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
  }
}
