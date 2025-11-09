import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recordingManager } from '@/lib/recording/recording-manager'

// Force Node.js runtime for fluent-ffmpeg support
export const runtime = 'nodejs'

/**
 * POST /api/record-simulation
 * Create a new recording job for a simulation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { scenarioId } = body

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      )
    }

    const currentUser = session.user as any
    const job = await recordingManager.createJob(scenarioId, currentUser.id)

    return NextResponse.json({
      success: true,
      recordingId: job.id,
      statusUrl: `/api/record-simulation/${job.id}`,
      message: 'Recording job created. Check status URL for progress.'
    })
  } catch (error: any) {
    console.error('Error creating recording:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create recording',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/record-simulation
 * List all recording jobs for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    const jobs = recordingManager.listJobs(currentUser.id)

    return NextResponse.json({
      success: true,
      jobs
    })
  } catch (error: any) {
    console.error('Error listing recordings:', error)
    return NextResponse.json(
      { 
        error: 'Failed to list recordings',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
