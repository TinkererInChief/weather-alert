import { NextRequest, NextResponse } from 'next/server'
import { voiceService, VoiceAlertType } from '@/lib/voice-service'
import { prisma } from '@/lib/prisma'
import { protectTestEndpoint } from '@/lib/test-protection'

// Ensure Node.js runtime for Twilio SDK compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
  try {
    const body = await request.json()
    const { phoneNumber, contactName } = body

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required for test call'
      }, { status: 400 })
    }

    console.log(`📞 Making test voice call to ${phoneNumber}`)

    // Make test voice call
    const result = await voiceService.makeVoiceCall(
      phoneNumber,
      VoiceAlertType.TEST,
      'This is a test call from your Emergency Alert System. All systems are functioning normally.',
      contactName
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test voice call initiated successfully',
        data: {
          callSid: result.callSid,
          status: result.status,
          phoneNumber,
          type: 'test',
          timestamp: new Date().toISOString()
        }
      })
    } else {
      // Safe diagnostics - do not leak secrets
      const sidOk = !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
      const tokenOk = !!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.length > 10
      const fromOk = !!process.env.TWILIO_PHONE_NUMBER
      const env = process.env.NODE_ENV

      return NextResponse.json({
        success: false,
        error: 'Failed to initiate test voice call',
        message: result.errorMessage,
        diagnostics: { env, sidOk, tokenOk, fromOk }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error making test voice call:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to make test voice call',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
  try {
    // Safe diagnostics - do not leak secrets
    const sidOk = !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
    const tokenOk = !!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.length > 10
    const fromOk = !!process.env.TWILIO_PHONE_NUMBER
    const env = process.env.NODE_ENV

    // Get a test contact for demo purposes
    const testContact = await prisma.contact.findFirst({
      where: { 
        active: true,
        phone: { not: null }
      },
      select: {
        name: true,
        phone: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Voice test endpoint ready',
      data: {
        testContact: testContact ? {
          name: testContact.name,
          phone: testContact.phone
        } : null,
        availableAlertTypes: Object.values(VoiceAlertType),
        diagnostics: { env, sidOk, tokenOk, fromOk },
        testInstructions: {
          post: 'POST /api/voice/test with { phoneNumber, contactName? }',
          example: {
            phoneNumber: testContact?.phone || '+1234567890',
            contactName: testContact?.name || 'Test User'
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting test info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get test information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
