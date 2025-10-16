import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { voiceService, VoiceAlertType } from '@/lib/voice-service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await voiceService.getCallStats()
    const config = voiceService.getConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        config,
        endpoints: {
          makeCall: '/api/voice (POST)',
          bulkCalls: '/api/voice/bulk (POST)',
          callStatus: '/api/voice/status (GET)',
          testCall: '/api/voice/test (POST)',
          config: '/api/voice/config (PUT)'
        }
      }
    })

  } catch (error) {
    log.error('Error getting voice service info', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get voice service information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, alertType, customMessage, contactName } = body

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    if (!Object.values(VoiceAlertType).includes(alertType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert type'
      }, { status: 400 })
    }

    log.info('Making voice call', { phoneNumber, alertType })

    const result = await voiceService.makeVoiceCall(
      phoneNumber,
      alertType as VoiceAlertType,
      customMessage,
      contactName
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Voice call initiated successfully',
        data: {
          callSid: result.callSid,
          status: result.status,
          phoneNumber,
          alertType
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to initiate voice call',
        message: result.errorMessage
      }, { status: 500 })
    }

  } catch (error) {
    log.error('Error making voice call', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to make voice call',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
