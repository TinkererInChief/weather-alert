import { NextRequest, NextResponse } from 'next/server'
import { voiceService } from '@/lib/voice-service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callSid = searchParams.get('callSid')

    if (callSid) {
      // Get status for specific call
      const result = await voiceService.checkCallStatus(callSid)
      
      return NextResponse.json({
        success: true,
        data: {
          callSid,
          status: result.status,
          duration: result.duration,
          success: result.success,
          error: result.errorMessage
        }
      })
    } else {
      // Get recent call statuses
      const recentCalls = await prisma.voiceCall.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          callSid: true,
          phoneNumber: true,
          alertType: true,
          status: true,
          duration: true,
          createdAt: true,
          completedAt: true
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          recentCalls,
          totalCalls: recentCalls.length
        }
      })
    }

  } catch (error) {
    console.error('❌ Error getting call status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get call status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callSids } = body

    if (!Array.isArray(callSids)) {
      return NextResponse.json({
        success: false,
        error: 'callSids must be an array'
      }, { status: 400 })
    }

    console.log(`📞 Checking status for ${callSids.length} calls`)

    const results = []
    
    for (const callSid of callSids) {
      try {
        const result = await voiceService.checkCallStatus(callSid)
        results.push({
          callSid,
          ...result
        })
      } catch (error) {
        results.push({
          callSid,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked status for ${callSids.length} calls`,
      data: {
        results,
        totalChecked: callSids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('❌ Error checking multiple call statuses:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check call statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
