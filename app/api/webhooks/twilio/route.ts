export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * POST /api/webhooks/twilio
 * Handle Twilio SMS status callbacks
 * 
 * Twilio sends status updates for:
 * - queued: Message accepted by Twilio
 * - sending: Message being sent
 * - sent: Message sent to carrier
 * - delivered: Message delivered to recipient
 * - undelivered: Message failed to deliver
 * - failed: Message failed
 * 
 * For read receipts (WhatsApp only):
 * - read: Message was read by recipient
 */
export async function POST(req: NextRequest) {
  try {
    // Get Twilio credentials for signature verification
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!authToken) {
      console.error('[Twilio Webhook] TWILIO_AUTH_TOKEN not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await req.formData()
    const body: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    // Verify Twilio signature for security
    const signature = req.headers.get('x-twilio-signature')
    const url = req.url
    
    if (signature && !verifyTwilioSignature(url, body, signature, authToken)) {
      console.error('[Twilio Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract status update details
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage
    } = body

    console.log(`[Twilio Webhook] Status update: ${MessageSid} -> ${MessageStatus}`)

    // Find the delivery log by provider message ID
    const deliveryLog = await prisma.deliveryLog.findFirst({
      where: {
        providerMessageId: MessageSid,
        channel: { in: ['sms', 'whatsapp'] }
      }
    })

    if (!deliveryLog) {
      console.warn(`[Twilio Webhook] Delivery log not found for MessageSid: ${MessageSid}`)
      return NextResponse.json({ message: 'Log not found' }, { status: 404 })
    }

    // Update delivery log based on status
    const updateData: any = {
      status: MessageStatus,
      updatedAt: new Date()
    }

    switch (MessageStatus) {
      case 'sent':
        updateData.sentAt = new Date()
        break
      
      case 'delivered':
        updateData.deliveredAt = new Date()
        if (!updateData.sentAt) {
          updateData.sentAt = new Date()
        }
        break
      
      case 'read':
        // WhatsApp read receipt
        updateData.readAt = new Date()
        if (!updateData.deliveredAt) {
          updateData.deliveredAt = new Date()
        }
        if (!updateData.sentAt) {
          updateData.sentAt = new Date()
        }
        break
      
      case 'failed':
      case 'undelivered':
        updateData.errorMessage = ErrorMessage || `Error code: ${ErrorCode}`
        break
    }

    // Update the delivery log
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: updateData
    })

    console.log(`[Twilio Webhook] Updated delivery log ${deliveryLog.id}: ${MessageStatus}`)

    return NextResponse.json({ success: true, message: 'Status updated' })
  } catch (error) {
    console.error('[Twilio Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Verify Twilio signature to ensure webhook is from Twilio
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  try {
    // Sort params alphabetically and build string
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url)

    // Compute HMAC SHA1
    const hmac = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    return hmac === signature
  } catch (error) {
    console.error('[Twilio Webhook] Signature verification error:', error)
    return false
  }
}

/**
 * GET /api/webhooks/twilio
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Twilio Webhook Handler',
    status: 'active',
    endpoints: {
      sms: '/api/webhooks/twilio',
      whatsapp: '/api/webhooks/twilio'
    }
  })
}
