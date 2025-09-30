import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type MaintenanceWindow = {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  affectedServices: string[]
  createdAt: string
}

/**
 * GET /api/maintenance - List maintenance windows
 * POST /api/maintenance - Schedule a maintenance window
 * DELETE /api/maintenance?id=xxx - Cancel a maintenance window
 */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const activeOnly = url.searchParams.get('active') === 'true'
    
    const now = new Date()
    
    const windows = await (prisma as any).maintenanceWindow.findMany({
      where: activeOnly ? {
        startTime: { lte: now },
        endTime: { gte: now },
      } : undefined,
      orderBy: { startTime: 'desc' },
      take: 50,
    })
    
    return Response.json({ windows }, { status: 200 })
  } catch (error) {
    console.error('Get maintenance windows error', error)
    return Response.json({ error: 'fetch_failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, startTime, endTime, affectedServices } = body
    
    // Validation
    if (!title || !startTime || !endTime) {
      return Response.json({ error: 'missing_fields' }, { status: 400 })
    }
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (end <= start) {
      return Response.json({ error: 'invalid_time_range' }, { status: 400 })
    }
    
    // Create maintenance window
    const window = await (prisma as any).maintenanceWindow.create({
      data: {
        title,
        description,
        startTime: start,
        endTime: end,
        affectedServices: affectedServices || [],
      },
    })
    
    // Create a scheduled deploy event
    await (prisma as any).healthEvent.create({
      data: {
        eventType: 'deploy',
        severity: 'warning',
        message: `Scheduled maintenance: ${title}`,
        metadata: {
          maintenanceWindowId: window.id,
          scheduled: true,
        },
        createdAt: start,
      },
    })
    
    return Response.json({ window }, { status: 201 })
  } catch (error) {
    console.error('Create maintenance window error', error)
    return Response.json({ error: 'create_failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return Response.json({ error: 'missing_id' }, { status: 400 })
    }
    
    await (prisma as any).maintenanceWindow.delete({
      where: { id },
    })
    
    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete maintenance window error', error)
    return Response.json({ error: 'delete_failed' }, { status: 500 })
  }
}
