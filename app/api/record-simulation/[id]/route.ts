import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recordingManager } from '@/lib/recording/recording-manager'

// Force Node.js runtime for fluent-ffmpeg support
export const runtime = 'nodejs'

/**
 * GET /api/record-simulation/[id]
 * Get status of a recording job
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const job = recordingManager.getJob(id)

    if (!job) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })
  } catch (error: any) {
    console.error('Error getting recording status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get recording status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/record-simulation/[id]
 * Delete a recording job
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const deleted = recordingManager.deleteJob(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Recording deleted'
    })
  } catch (error: any) {
    console.error('Error deleting recording:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete recording',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
