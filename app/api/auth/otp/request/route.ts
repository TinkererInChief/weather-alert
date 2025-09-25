import { NextResponse } from 'next/server'
import { otpService } from '@/lib/services/otp-service'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    
    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a phone number to receive a code'
        },
        { status: 400 }
      )
    }

    const result = await otpService.sendOtp({ phone })
    
    return NextResponse.json({
      success: true,
      maskedPhone: result.maskedPhone
    })
  } catch (error) {
    console.error('OTP request error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to send the verification code via SMS'
      },
      { status: 400 }
    )
  }
}