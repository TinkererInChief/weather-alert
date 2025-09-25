import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Get the most recent OTP records
    const otpRecords = await prisma.smsOtp.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        phone: true,
        tokenHash: true,
        expires: true,
        attempts: true,
        createdAt: true,
        consumedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      records: otpRecords,
      note: 'This endpoint is only available in development mode'
    })
  } catch (error) {
    console.error('Debug OTP error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}