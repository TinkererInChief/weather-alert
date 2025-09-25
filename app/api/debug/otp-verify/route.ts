import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const OTP_SECRET = process.env.OTP_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''

function hashToken(phone: string, code: string) {
  if (!OTP_SECRET) {
    throw new Error('OTP secret not configured')
  }
  return crypto.createHash('sha256').update(`${phone}:${code}:${OTP_SECRET}`).digest('hex')
}

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()
    
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    // Get the most recent OTP record
    const otpRecord = await prisma.smsOtp.findFirst({
      where: {
        phone: phone,
        consumedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return NextResponse.json({
        success: false,
        error: 'No OTP record found',
        debug: { phone, code }
      })
    }

    const generatedHash = hashToken(phone, code.trim())
    const hashMatch = generatedHash === otpRecord.tokenHash

    return NextResponse.json({
      success: hashMatch,
      debug: {
        phone,
        inputCode: code.trim(),
        generatedHash: generatedHash.substring(0, 16) + '...',
        storedHash: otpRecord.tokenHash.substring(0, 16) + '...',
        hashMatch,
        attempts: otpRecord.attempts,
        expires: otpRecord.expires,
        expired: otpRecord.expires < new Date(),
        createdAt: otpRecord.createdAt
      }
    })
  } catch (error) {
    console.error('Debug OTP verify error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}