import { NextResponse } from 'next/server'
import { otpService } from '@/lib/services/otp-service'

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()
    
    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number and code are required'
        },
        { status: 400 }
      )
    }

    // Verify the OTP - this will throw an error if verification fails
    const otpResult = await otpService.verifyOtp({ phone, code })
    
    // Return success response - the NextAuth credentials provider will handle user creation/lookup
    return NextResponse.json({
      success: true,
      phone: otpResult.phone,
      maskedPhone: otpResult.maskedPhone
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      },
      { status: 400 }
    )
  }
}