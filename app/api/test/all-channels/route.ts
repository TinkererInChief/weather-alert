import { NextRequest, NextResponse } from 'next/server'
import { SMSService } from '@/lib/sms-service'
import { WhatsAppService } from '@/lib/services/whatsapp-service'
import { voiceService, VoiceAlertType } from '@/lib/voice-service'
import { EmailService } from '@/lib/services/email-service'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { includeVoice = true, includeWhatsApp = true, includeSMS = true, includeEmail = true } = body

    // Get all active contacts
    const contacts = await db.getActiveContacts()
    
    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active contacts found. Please add contacts first.'
      })
    }

    console.log(`🧪 Testing all notification channels for ${contacts.length} contacts`)

    const results = {
      sms: { attempted: 0, successful: 0, failed: 0, results: [] as any[] },
      whatsapp: { attempted: 0, successful: 0, failed: 0, results: [] as any[] },
      voice: { attempted: 0, successful: 0, failed: 0, results: [] as any[] },
      email: { attempted: 0, successful: 0, failed: 0, results: [] as any[] }
    }

    const testMessage = `🧪 **EMERGENCY SYSTEM TEST**

This is a test of all notification channels in the Emergency Alert System.

📅 Test Time: ${new Date().toLocaleString()}
🔔 All systems are functioning normally.

This is only a test - no emergency action required.

Emergency Alert System`

    // Test SMS
    if (includeSMS) {
      console.log('📱 Testing SMS notifications...')
      const smsService = new SMSService()
      const smsContacts = contacts.filter(c => c.phone)
      
      if (smsContacts.length > 0) {
        const smsResult = await smsService.sendBulkSMS(smsContacts, testMessage)
        results.sms = {
          attempted: smsResult.totalSent,
          successful: smsResult.successful,
          failed: smsResult.failed,
          results: smsResult.results
        }
      }
    }

    // Test WhatsApp
    if (includeWhatsApp) {
      console.log('💬 Testing WhatsApp notifications...')
      const whatsappService = new WhatsAppService()
      const whatsappContacts = contacts.filter(c => c.whatsapp || c.phone)
      
      if (whatsappContacts.length > 0) {
        const whatsappResult = await whatsappService.sendBulkWhatsApp(whatsappContacts, testMessage)
        results.whatsapp = {
          attempted: whatsappResult.totalSent,
          successful: whatsappResult.successful,
          failed: whatsappResult.failed,
          results: whatsappResult.results
        }
      }
    }

    // Test Voice Calls
    if (includeVoice) {
      console.log('📞 Testing voice call notifications...')
      const voiceContacts = contacts.filter(c => c.phone).map(c => ({
        phone: c.phone!,
        name: c.name
      }))
      
      if (voiceContacts.length > 0) {
        const voiceResult = await voiceService.makeBulkVoiceCalls(
          voiceContacts,
          VoiceAlertType.TEST,
          'This is a test call from your Emergency Alert System. All systems are functioning normally. This is only a test.'
        )
        results.voice = {
          attempted: voiceResult.totalCalls,
          successful: voiceResult.successful,
          failed: voiceResult.failed,
          results: voiceResult.results
        }
      }
    }

    // Test Email
    if (includeEmail) {
      console.log('📧 Testing email notifications...')
      const emailService = new EmailService()
      const emailContacts = contacts.filter(c => c.email)
      
      for (const contact of emailContacts) {
        results.email.attempted++
        
        const emailResult = await emailService.sendEmail({
          to: contact.email!,
          subject: '🧪 Emergency System Test - All Systems Operational',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">🧪 Emergency System Test</h1>
              </div>
              <div style="padding: 20px;">
                <h2>System Test Notification</h2>
                <p>Hello ${contact.name},</p>
                <p>This is a test of the Emergency Alert System email notifications.</p>
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                  <p><strong>Test Details:</strong></p>
                  <ul>
                    <li>Test Time: ${new Date().toLocaleString()}</li>
                    <li>All systems are functioning normally</li>
                    <li>This is only a test - no action required</li>
                  </ul>
                </div>
                <p>If you received this message, your email notifications are working correctly.</p>
                <p>Stay safe!</p>
                <p><em>Emergency Alert System</em></p>
              </div>
            </div>
          `,
          textContent: testMessage
        })

        if (emailResult.success) {
          results.email.successful++
        } else {
          results.email.failed++
        }

        results.email.results.push({
          contact: { name: contact.name, email: contact.email },
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error
        })

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Calculate totals
    const totalAttempted = results.sms.attempted + results.whatsapp.attempted + results.voice.attempted + results.email.attempted
    const totalSuccessful = results.sms.successful + results.whatsapp.successful + results.voice.successful + results.email.successful
    const totalFailed = results.sms.failed + results.whatsapp.failed + results.voice.failed + results.email.failed

    console.log(`✅ All-channel test completed: ${totalSuccessful}/${totalAttempted} successful`)

    return NextResponse.json({
      success: totalSuccessful > 0,
      message: `All-channel test completed: ${totalSuccessful} successful, ${totalFailed} failed across all channels`,
      data: {
        summary: {
          totalContacts: contacts.length,
          totalAttempted,
          totalSuccessful,
          totalFailed,
          successRate: totalAttempted > 0 ? Math.round((totalSuccessful / totalAttempted) * 100) : 0
        },
        channelResults: {
          sms: {
            ...results.sms,
            enabled: includeSMS,
            available: contacts.filter(c => c.phone).length
          },
          whatsapp: {
            ...results.whatsapp,
            enabled: includeWhatsApp,
            available: contacts.filter(c => c.whatsapp || c.phone).length
          },
          voice: {
            ...results.voice,
            enabled: includeVoice,
            available: contacts.filter(c => c.phone).length
          },
          email: {
            ...results.email,
            enabled: includeEmail,
            available: contacts.filter(c => c.email).length
          }
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error testing all channels:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test all channels',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const contacts = await db.getActiveContacts()
    
    return NextResponse.json({
      success: true,
      message: 'All-channel test endpoint ready',
      data: {
        availableContacts: contacts.length,
        channelAvailability: {
          sms: contacts.filter(c => c.phone).length,
          whatsapp: contacts.filter(c => c.whatsapp || c.phone).length,
          voice: contacts.filter(c => c.phone).length,
          email: contacts.filter(c => c.email).length
        },
        serviceStatus: {
          sms: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials',
          whatsapp: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials',
          voice: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials',
          email: process.env.SENDGRID_API_KEY ? 'configured' : 'missing credentials'
        },
        usage: {
          post: 'POST /api/test/all-channels',
          parameters: {
            includeSMS: 'boolean (default: true)',
            includeWhatsApp: 'boolean (default: true)',
            includeVoice: 'boolean (default: true)',
            includeEmail: 'boolean (default: true)'
          },
          example: {
            includeSMS: true,
            includeWhatsApp: true,
            includeVoice: true,
            includeEmail: true
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting all-channel test info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get all-channel test information'
    }, { status: 500 })
  }
}