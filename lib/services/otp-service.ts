import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { SMSService } from '@/lib/sms-service'
import { getSecret, getSecretNumber } from '@/lib/secrets'

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) {
    return phone
  }

  const lastFour = digits.slice(-4)
  return `•••${lastFour}`
}

export class OtpService {
  private readonly smsService: SMSService

  constructor() {
    this.smsService = new SMSService()
  }

  // Lazy getters so values are resolved at runtime, not at module import
  private get otpLength() {
    return getSecretNumber('OTP_LENGTH', 6)
  }

  private get otpExpiryMinutes() {
    return getSecretNumber('OTP_EXPIRY_MINUTES', 5)
  }

  private get otpMaxAttempts() {
    return getSecretNumber('OTP_MAX_ATTEMPTS', 5)
  }

  private get otpSecret() {
    const primary = getSecret('OTP_SECRET', '')
    if (primary) return primary
    return getSecret('NEXTAUTH_SECRET', '')
  }

  private generateCode() {
    const digits: string[] = []

    while (digits.length < this.otpLength) {
      const randomDigit = crypto.randomInt(0, 10)
      digits.push(String(randomDigit))
    }

    return digits.join('')
  }

  private formatPhone(rawPhone: string) {
    const trimmed = rawPhone.trim()
    if (!trimmed) {
      throw new Error('Enter a phone number to receive a code.')
    }

    return this.smsService.formatPhoneNumber(trimmed)
  }

  private validatePhone(formattedPhone: string) {
    if (!this.smsService.validatePhoneNumber(formattedPhone)) {
      throw new Error('Enter a valid mobile number including country code (e.g. +14155552671).')
    }
  }

  private hashToken(phone: string, code: string) {
    const secret = this.otpSecret
    if (!secret) {
      throw new Error('OTP secret not configured. Set OTP_SECRET or NEXTAUTH_SECRET.')
    }

    return crypto.createHash('sha256').update(`${phone}:${code}:${secret}`).digest('hex')
  }

  async sendOtp(params: { phone: string }) {
    const formattedPhone = this.formatPhone(params.phone)
    this.validatePhone(formattedPhone)

    const code = this.generateCode()
    const tokenHash = this.hashToken(formattedPhone, code)
    const expiresAt = addMinutes(new Date(), this.otpExpiryMinutes)

    await prisma.$transaction([
      prisma.smsOtp.updateMany({
        where: {
          phone: formattedPhone,
          consumedAt: null
        },
        data: {
          consumedAt: new Date()
        }
      }),
      prisma.smsOtp.create({
        data: {
          phone: formattedPhone,
          tokenHash,
          expires: expiresAt
        }
      })
    ])

    const message = `Use ${code} to access the Emergency Alert Command Center. This code expires in ${this.otpExpiryMinutes} minutes.`
    const result = await this.smsService.sendSMS(formattedPhone, message)

    if (!result.success) {
      throw new Error(result.error ?? 'Unable to send the verification code via SMS.')
    }

    console.log('📲 OTP code dispatched via SMS', {
      phone: formattedPhone,
      masked: maskPhone(formattedPhone),
      // Only log the actual code in development mode for debugging
      ...(process.env.NODE_ENV !== 'production' && { code })
    })

    return {
      phone: formattedPhone,
      maskedPhone: maskPhone(formattedPhone)
    }
  }

  async verifyOtp(params: { phone: string; code: string }) {
    const formattedPhone = this.formatPhone(params.phone)
    this.validatePhone(formattedPhone)

    // Fetch a small window of recent, unconsumed OTPs to guard against
    // accidental duplicate sends (e.g., double-clicks or network retries)
    const recentOtps = await prisma.smsOtp.findMany({
      where: {
        phone: formattedPhone,
        consumedAt: null,
        expires: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })

    if (recentOtps.length === 0) {
      throw new Error('Enter the most recent code we sent to your phone.')
    }

    // Progressive lockout check is based on the latest OTP record
    const latest = recentOtps[0]
    if (latest.attempts >= this.otpMaxAttempts) {
      await prisma.smsOtp.update({
        where: { id: latest.id },
        data: { consumedAt: new Date() }
      })
      throw new Error('Too many incorrect attempts. Request a new code.')
    }

    const tokenHash = this.hashToken(formattedPhone, params.code.trim())

    // Try to find a matching OTP among the recent, valid ones
    const matching = recentOtps.find((r) => r.tokenHash === tokenHash)

    if (!matching) {
      // Count the attempt against the latest OTP for throttling
      await prisma.smsOtp.update({
        where: { id: latest.id },
        data: { attempts: { increment: 1 } }
      })
      throw new Error('Incorrect code. Check your SMS inbox and try again.')
    }

    // Consume the matched OTP
    await prisma.smsOtp.update({
      where: { id: matching.id },
      data: { consumedAt: new Date() }
    })

    return {
      phone: formattedPhone,
      maskedPhone: maskPhone(formattedPhone)
    }
  }
}

export const otpService = new OtpService()
