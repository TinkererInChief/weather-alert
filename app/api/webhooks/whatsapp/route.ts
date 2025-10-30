export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/webhooks/whatsapp
 * Handle WhatsApp status callbacks (via Twilio)
 * 
 * WhatsApp Status Updates:
 * - queued: Message is queued for sending
 * - sent: Message sent to WhatsApp
 * - delivered: Message delivered to recipient
 * - read: Message read by recipient
 * - failed: Message failed to send
 * 
 * Note: WhatsApp via Twilio uses the same webhook format as SMS
 * This is a dedicated endpoint for clarity and future extensibility
 */
export async function POST(req: NextRequest) {
  try {
    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await req.formData()
    const body: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    // Extract status update details
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      ChannelPrefix // Will be 'whatsapp' for WhatsApp messages
    } = body

    console.log(`[WhatsApp Webhook] Status update: ${MessageSid} -> ${MessageStatus}`)

    // Find the delivery log by provider message ID
    const deliveryLog = await prisma.deliveryLog.findFirst({
      where: {
        providerMessageId: MessageSid,
        channel: 'whatsapp'
      }
    })

    if (!deliveryLog) {
      console.warn(`[WhatsApp Webhook] Delivery log not found for MessageSid: ${MessageSid}`)
      return NextResponse.json({ message: 'Log not found' }, { status: 404 })
    }

    // Update delivery log based on status
    const updateData: any = {
      status: MessageStatus,
      updatedAt: new Date()
    }

    switch (MessageStatus) {
      case 'queued':
        // Message queued for sending
        updateData.status = 'queued'
        break

      case 'sent':
        updateData.sentAt = new Date()
        updateData.status = 'sent'
        break
      
      case 'delivered':
        updateData.deliveredAt = new Date()
        updateData.status = 'delivered'
        if (!deliveryLog.sentAt) {
          updateData.sentAt = new Date()
        }
        break
      
      case 'read':
        // WhatsApp read receipt - this is the key event!
        updateData.readAt = new Date()
        updateData.status = 'delivered' // Keep status as delivered
        
        // Ensure we have sent and delivered timestamps
        if (!deliveryLog.deliveredAt) {
          updateData.deliveredAt = new Date()
        }
        if (!deliveryLog.sentAt) {
          updateData.sentAt = new Date()
        }

        // Store read receipt metadata
        updateData.metadata = {
          ...(deliveryLog.metadata as any || {}),
          readReceipt: {
            timestamp: new Date(),
            source: 'whatsapp'
          }
        }
        break
      
      case 'failed':
      case 'undelivered':
        updateData.status = 'failed'
        updateData.errorMessage = ErrorMessage || `Error code: ${ErrorCode}`
        break
    }

    // Update the delivery log
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: updateData
    })

    console.log(`[WhatsApp Webhook] Updated delivery log ${deliveryLog.id}: ${MessageStatus}`)

    // Store read receipt event in metadata for analytics
    if (MessageStatus === 'read') {
      console.log(`[WhatsApp Webhook] ✓ Read receipt received for ${deliveryLog.contactId}`)
    }

    return NextResponse.json({ success: true, message: 'Status updated' })
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'WhatsApp Webhook Handler',
    status: 'active',
    provider: 'Twilio',
    events: ['queued', 'sent', 'delivered', 'read', 'failed']
  })
}
