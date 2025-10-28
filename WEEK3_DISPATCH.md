# Week 3 Day 4-5 + Week 4 Day 1: Enhanced Alert Dispatch

**Priority**: 🔴 CRITICAL | **Effort**: 10-12 hours

---

## Overview

Integrate geo-fence monitor with multi-channel notification system, ensuring alerts reach contacts via their preferred channels with proper acknowledgment mechanisms.

---

## Alert Acknowledgment Methods

Based on your `PRODUCTION_PLAN_SUMMARY.md` update, we support 4 ACK methods:

1. **Click link** in SMS/Email/WhatsApp → GET `/api/vessel-alerts/[id]/ack?token=XXX`
2. **Reply "ACK [code]"** via SMS → Twilio webhook parses response
3. **Press digit** during voice call → IVR captures DTMF input
4. **Manual ACK** in dashboard → POST `/api/vessel-alerts/[id]/acknowledge`

---

## Generate ACK Tokens

**File**: `lib/utils/ack-token.ts`

```typescript
import { createHmac, randomBytes } from 'crypto'

const ACK_SECRET = process.env.ACK_TOKEN_SECRET || 'change-me-in-production'

export class AckTokenManager {
  /**
   * Generate secure acknowledgment token for alert
   */
  static generateToken(alertId: string, contactId: string): string {
    const payload = `${alertId}:${contactId}:${Date.now()}`
    const signature = createHmac('sha256', ACK_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 16)

    return Buffer.from(`${payload}:${signature}`).toString('base64url')
  }

  /**
   * Verify and decode acknowledgment token
   */
  static verifyToken(token: string): { alertId: string; contactId: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8')
      const [alertId, contactId, timestamp, signature] = decoded.split(':')

      // Verify signature
      const expectedSignature = createHmac('sha256', ACK_SECRET)
        .update(`${alertId}:${contactId}:${timestamp}`)
        .digest('hex')
        .substring(0, 16)

      if (signature !== expectedSignature) {
        return null
      }

      // Check if token is expired (valid for 24 hours)
      const age = Date.now() - parseInt(timestamp)
      if (age > 24 * 60 * 60 * 1000) {
        return null
      }

      return {
        alertId,
        contactId,
        timestamp: parseInt(timestamp)
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Generate short ACK code for SMS reply (6 digits)
   */
  static generateAckCode(alertId: string): string {
    const hash = createHmac('sha256', ACK_SECRET)
      .update(alertId)
      .digest('hex')
    
    // Take first 6 characters and convert to uppercase for readability
    return hash.substring(0, 6).toUpperCase()
  }

  /**
   * Verify ACK code matches alert
   */
  static verifyAckCode(alertId: string, code: string): boolean {
    const expectedCode = this.generateAckCode(alertId)
    return expectedCode === code.toUpperCase()
  }
}
```

Add to `.env`:
```env
ACK_TOKEN_SECRET=your-secret-key-change-in-production
```

---

## Enhanced Alert Templates

**File**: `lib/templates/alert-templates.ts`

```typescript
import { AckTokenManager } from '../utils/ack-token'

export function generateAlertTemplate(
  type: 'sms' | 'whatsapp' | 'email' | 'voice',
  data: {
    alertId: string
    contactId: string
    contactName: string
    vesselName: string
    vesselMMSI: string
    eventType: string
    magnitude: number
    distance: string
    riskLevel: string
    recommendation: string
    mapLink: string
  }
): any {
  const ackToken = AckTokenManager.generateToken(data.alertId, data.contactId)
  const ackCode = AckTokenManager.generateAckCode(data.alertId)
  const ackLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/vessel-alerts/${data.alertId}/ack?token=${ackToken}`

  switch (type) {
    case 'sms':
      return {
        to: '', // Will be filled by dispatch logic
        body: `MARITIME ALERT - ${data.riskLevel.toUpperCase()}

Vessel: ${data.vesselName} (${data.vesselMMSI})
Event: ${data.eventType.toUpperCase()} M${data.magnitude}
Distance: ${data.distance} NM

${data.recommendation}

ACK: Reply "ACK ${ackCode}" or click: ${ackLink}

View map: ${data.mapLink}`
      }

    case 'whatsapp':
      return {
        to: '', // Will be filled by dispatch logic
        contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
        contentVariables: JSON.stringify({
          1: data.contactName,
          2: data.vesselName,
          3: data.vesselMMSI,
          4: data.eventType,
          5: data.magnitude.toString(),
          6: data.distance,
          7: data.riskLevel,
          8: data.recommendation,
          9: ackLink,
          10: ackCode
        })
      }

    case 'email':
      return {
        to: '', // Will be filled by dispatch logic
        subject: `🚨 ${data.riskLevel.toUpperCase()} ALERT: ${data.vesselName} - ${data.eventType.toUpperCase()}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ff6b6b; padding: 20px; margin: 20px 0; }
    .critical { border-color: #dc3545; background: #f8d7da; }
    .high { border-color: #fd7e14; background: #fff3cd; }
    .moderate { border-color: #ffc107; background: #fff9e6; }
    .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
    .btn:hover { background: #0056b3; }
    .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="alert-box ${data.riskLevel}">
    <h2>⚠️ Maritime Safety Alert - ${data.riskLevel.toUpperCase()}</h2>
    
    <div class="info">
      <h3>Vessel Information</h3>
      <p><strong>Name:</strong> ${data.vesselName}<br>
      <strong>MMSI:</strong> ${data.vesselMMSI}</p>
    </div>

    <div class="info">
      <h3>Event Details</h3>
      <p><strong>Type:</strong> ${data.eventType.toUpperCase()}<br>
      <strong>Magnitude:</strong> M${data.magnitude}<br>
      <strong>Distance:</strong> ${data.distance} nautical miles</p>
    </div>

    <div class="info">
      <h3>Recommended Action</h3>
      <p>${data.recommendation}</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${ackLink}" class="btn">✅ ACKNOWLEDGE ALERT</a>
      <a href="${data.mapLink}" class="btn" style="background: #28a745;">📍 VIEW MAP</a>
    </div>

    <p style="font-size: 12px; color: #666;">
      <strong>Alternative ACK methods:</strong><br>
      • Reply to this email with "ACKNOWLEDGED"<br>
      • Reply to SMS with "ACK ${ackCode}"<br>
      • Login to dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts
    </p>
  </div>
</body>
</html>
        `,
        text: `MARITIME ALERT - ${data.riskLevel.toUpperCase()}

Vessel: ${data.vesselName} (${data.vesselMMSI})
Event: ${data.eventType.toUpperCase()} M${data.magnitude}
Distance: ${data.distance} NM

RECOMMENDED ACTION:
${data.recommendation}

ACKNOWLEDGE: ${ackLink}
VIEW MAP: ${data.mapLink}

Or reply "ACK ${ackCode}" to acknowledge.
`
      }

    case 'voice':
      return {
        to: '', // Will be filled by dispatch logic
        twiml: `
<Response>
  <Say voice="alice">
    This is an urgent maritime safety alert for vessel ${data.vesselName}, M M S I ${data.vesselMMSI.match(/.{1,3}/g)?.join(' ')}.
    
    A ${data.eventType} with magnitude ${data.magnitude} has been detected ${data.distance} nautical miles from your vessel.
    
    Risk level: ${data.riskLevel}.
    
    ${data.recommendation}
    
    To acknowledge this alert, press 1 now.
    To repeat this message, press 9.
  </Say>
  <Gather numDigits="1" action="${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-response?alertId=${data.alertId}&contactId=${data.contactId}">
    <Say>Press 1 to acknowledge, or 9 to repeat.</Say>
  </Gather>
  <Say>No input received. Goodbye.</Say>
</Response>
        `
      }

    default:
      throw new Error(`Unknown template type: ${type}`)
  }
}
```

---

## Enhanced Dispatch Service

**File**: `lib/services/alert-dispatch.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { AlertQueue } from './alert-queue'
import { ContactHierarchyService } from './contact-hierarchy'
import { EscalationService } from './escalation-service'
import { generateAlertTemplate } from '../templates/alert-templates'

export class AlertDispatchService {
  private static instance: AlertDispatchService
  private contactService: ContactHierarchyService
  private escalationService: EscalationService

  private constructor() {
    this.contactService = ContactHierarchyService.getInstance()
    this.escalationService = EscalationService.getInstance()
  }

  static getInstance() {
    if (!AlertDispatchService.instance) {
      AlertDispatchService.instance = new AlertDispatchService()
    }
    return AlertDispatchService.instance
  }

  /**
   * Dispatch alert to all appropriate contacts
   */
  async dispatchAlert(alert: any, vessel: any): Promise<void> {
    try {
      console.log(`📤 Dispatching alert ${alert.id} for vessel ${vessel.mmsi}`)

      // Get escalation policy
      const policy = await this.escalationService.getPolicy(
        vessel.id,
        alert.eventType,
        alert.severity
      )

      // Get contacts based on severity
      const contacts = await this.contactService.getVesselContacts(
        vessel.id,
        this.severityToAlertLevel(alert.severity)
      )

      if (contacts.length === 0) {
        console.warn(`No contacts found for vessel ${vessel.mmsi}`)
        return
      }

      // Dispatch to each contact
      let dispatched = 0

      for (const contact of contacts) {
        const channels = this.contactService.getNotificationChannels(
          contact,
          this.severityToAlertLevel(alert.severity)
        )

        for (const channel of channels) {
          await this.dispatchToChannel(alert, vessel, contact, channel)
          dispatched++
        }
      }

      console.log(`✅ Dispatched ${dispatched} notifications for alert ${alert.id}`)

      // Start escalation if policy exists
      if (policy && policy.rules && policy.rules.length > 0) {
        await this.escalationService.initiateEscalation(alert, policy)
      }
    } catch (error) {
      console.error('Error dispatching alert:', error)
    }
  }

  /**
   * Dispatch notification to specific channel
   */
  private async dispatchToChannel(
    alert: any,
    vessel: any,
    contact: any,
    channel: string
  ): Promise<void> {
    const templateData = generateAlertTemplate(
      channel as any,
      {
        alertId: alert.id,
        contactId: contact.id,
        contactName: contact.name,
        vesselName: vessel.name,
        vesselMMSI: vessel.mmsi,
        eventType: alert.eventType,
        magnitude: alert.metadata?.magnitude || 0,
        distance: alert.distance?.toString() || 'Unknown',
        riskLevel: alert.riskLevel,
        recommendation: alert.recommendation || 'Monitor situation closely',
        mapLink: `https://www.openstreetmap.org/?mlat=${vessel.latitude}&mlon=${vessel.longitude}&zoom=8`
      }
    )

    await AlertQueue.getInstance().addAlert({
      alertJobId: alert.id,
      contactId: contact.id,
      channel,
      templateData: {
        ...templateData,
        to: channel === 'sms' ? contact.phone : contact.email
      },
      priority: alert.severity
    })
  }

  private severityToAlertLevel(severity: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severity >= 5) return 'critical'
    if (severity >= 4) return 'high'
    if (severity >= 3) return 'medium'
    return 'low'
  }
}
```

---

## ACK via Link API

**File**: `app/api/vessel-alerts/[id]/ack/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { EscalationService } from '@/lib/services/escalation-service'
import { AckTokenManager } from '@/lib/utils/ack-token'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?error=missing_token`)
    }

    // Verify token
    const decoded = AckTokenManager.verifyToken(token)

    if (!decoded || decoded.alertId !== params.id) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?error=invalid_token`)
    }

    // Check if alert exists and is not already acknowledged
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: params.id }
    })

    if (!alert) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?error=alert_not_found`)
    }

    if (alert.acknowledgedAt) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?success=already_acknowledged`)
    }

    // Get contact info for logging
    const contact = await prisma.contact.findUnique({
      where: { id: decoded.contactId }
    })

    // Acknowledge alert
    const escalationService = EscalationService.getInstance()
    await escalationService.acknowledgeAlert(params.id, decoded.contactId)

    // Log acknowledgment
    console.log(`✅ Alert ${params.id} acknowledged via link by ${contact?.name || decoded.contactId}`)

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?success=acknowledged&alertId=${params.id}`
    )
  } catch (error) {
    console.error('Error acknowledging alert via link:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/active-alerts?error=server_error`)
  }
}
```

---

## ACK via SMS Reply (Twilio Webhook)

**File**: `app/api/twilio/sms-webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { EscalationService } from '@/lib/services/escalation-service'
import { AckTokenManager } from '@/lib/utils/ack-token'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string

    console.log(`📱 SMS received from ${from}: ${body}`)

    // Parse ACK message: "ACK XXXXXX" or just "XXXXXX"
    const ackMatch = body.trim().match(/^(?:ACK\s+)?([A-Z0-9]{6})$/i)

    if (!ackMatch) {
      // Not an ACK message, ignore
      return new NextResponse('', { status: 200 })
    }

    const ackCode = ackMatch[1]

    // Find contact by phone number
    const contact = await prisma.contact.findFirst({
      where: { phone: from }
    })

    if (!contact) {
      console.warn(`Contact not found for phone ${from}`)
      return new NextResponse('', { status: 200 })
    }

    // Find unacknowledged alert with matching ACK code
    const alerts = await prisma.vesselAlert.findMany({
      where: {
        acknowledgedAt: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        }
      }
    })

    const matchingAlert = alerts.find(alert => 
      AckTokenManager.verifyAckCode(alert.id, ackCode)
    )

    if (!matchingAlert) {
      // Send error response
      await twilioClient.messages.create({
        to: from,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: 'Invalid or expired ACK code. Please check your alert notification or visit the dashboard.'
      })
      return new NextResponse('', { status: 200 })
    }

    // Acknowledge alert
    const escalationService = EscalationService.getInstance()
    await escalationService.acknowledgeAlert(matchingAlert.id, contact.id)

    console.log(`✅ Alert ${matchingAlert.id} acknowledged via SMS by ${contact.name}`)

    // Send confirmation
    await twilioClient.messages.create({
      to: from,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: `✅ Alert acknowledged. Thank you for confirming. Stay safe!`
    })

    return new NextResponse('', { status: 200 })
  } catch (error) {
    console.error('Error processing SMS webhook:', error)
    return new NextResponse('', { status: 500 })
  }
}
```

Configure in Twilio Console:
- Messaging → Phone Numbers → Your Number
- A MESSAGE COMES IN: Webhook → `https://yourdomain.com/api/twilio/sms-webhook` → HTTP POST

---

## ACK via Voice Call (IVR)

**File**: `app/api/twilio/voice-response/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { EscalationService } from '@/lib/services/escalation-service'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const digits = formData.get('Digits') as string
    const alertId = req.nextUrl.searchParams.get('alertId')
    const contactId = req.nextUrl.searchParams.get('contactId')

    if (!alertId || !contactId) {
      return new NextResponse(
        `<Response><Say>Invalid request. Goodbye.</Say></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (digits === '1') {
      // Acknowledge alert
      const escalationService = EscalationService.getInstance()
      await escalationService.acknowledgeAlert(alertId, contactId)

      console.log(`✅ Alert ${alertId} acknowledged via voice by ${contactId}`)

      return new NextResponse(
        `<Response><Say>Thank you. Alert has been acknowledged. Stay safe. Goodbye.</Say></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    } else if (digits === '9') {
      // Repeat message - redirect back to original TwiML
      return new NextResponse(
        `<Response><Redirect method="POST">/api/twilio/voice-alert?alertId=${alertId}&contactId=${contactId}</Redirect></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    } else {
      return new NextResponse(
        `<Response><Say>Invalid input. Goodbye.</Say></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }
  } catch (error) {
    console.error('Error processing voice response:', error)
    return new NextResponse(
      `<Response><Say>An error occurred. Please contact support. Goodbye.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
```

---

## Testing

### Test ACK Token Generation

```typescript
import { AckTokenManager } from '@/lib/utils/ack-token'

const token = AckTokenManager.generateToken('alert_123', 'contact_456')
console.log('Token:', token)

const decoded = AckTokenManager.verifyToken(token)
console.log('Decoded:', decoded)

const ackCode = AckTokenManager.generateAckCode('alert_123')
console.log('ACK Code:', ackCode)

const valid = AckTokenManager.verifyAckCode('alert_123', ackCode)
console.log('Valid:', valid)
```

### Test SMS ACK

Send SMS to your Twilio number:
```
ACK ABC123
```

Should receive confirmation message.

### Test Voice ACK

Call your Twilio number, listen to message, press 1 to acknowledge.

---

## Next Steps

1. ✅ Test all ACK methods thoroughly
2. ✅ Move to Week 4 Day 2-3: Alert Acknowledgment UI
3. ✅ Monitor delivery logs and ACK rates

**Implementation Status**: Ready to code ✅
