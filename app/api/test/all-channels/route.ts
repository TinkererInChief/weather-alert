import { NextRequest, NextResponse } from 'next/server'
import { SMSService } from '@/lib/sms-service'
import { WhatsAppService } from '@/lib/services/whatsapp-service'
import { voiceService, VoiceAlertType } from '@/lib/voice-service'
import { EmailService } from '@/lib/services/email-service'
import { db } from '@/lib/database'
import { protectTestEndpoint } from '@/lib/test-protection'

export async function POST(request: NextRequest) {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
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

    // Use template service for test messages
    const { TemplateService } = await import('@/lib/services/template-service')
    const templateService = new TemplateService()

    // Test SMS
    if (includeSMS) {
      console.log('📱 Testing SMS notifications...')
      const smsService = new SMSService()
      const smsContacts = contacts.filter(c => c.phone)
      
      if (smsContacts.length > 0) {
        // Render template for first contact
        const testContact = smsContacts[0]
        const rendered = await templateService.renderTemplate({
          type: 'test',
          channel: 'sms',
          language: 'en',
          data: {
            systemName: 'Emergency Alert System',
            timestamp: new Date().toLocaleString(),
            contactName: testContact.name,
            status: 'All systems operational',
            contactId: testContact.id
          }
        })
        
        const smsResult = await smsService.sendBulkSMS(smsContacts, rendered.content)
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
        const testContact = whatsappContacts[0]
        const rendered = await templateService.renderTemplate({
          type: 'test',
          channel: 'whatsapp',
          language: 'en',
          data: {
            systemName: 'Emergency Alert System',
            timestamp: new Date().toLocaleString(),
            contactName: testContact.name,
            status: 'All systems operational',
            contactId: testContact.id
          }
        })
        
        const whatsappResult = await whatsappService.sendBulkWhatsApp(whatsappContacts, rendered.content)
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
        const testContact = contacts.find(c => c.phone)
        const rendered = await templateService.renderTemplate({
          type: 'test',
          channel: 'voice',
          language: 'en',
          data: {
            systemName: 'Emergency Alert System',
            timestamp: new Date().toLocaleString(),
            contactName: testContact?.name || 'User',
            status: 'All systems operational',
            contactId: testContact?.id || ''
          }
        })
        
        const voiceResult = await voiceService.makeBulkVoiceCalls(
          voiceContacts,
          VoiceAlertType.TEST,
          rendered.content
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
        
        const rendered = await templateService.renderTemplate({
          type: 'test',
          channel: 'email',
          language: 'en',
          data: {
            systemName: 'Emergency Alert System',
            timestamp: new Date().toLocaleString(),
            contactName: contact.name,
            status: 'All systems operational',
            contactId: contact.id,
            channelsTested: 'SMS, WhatsApp, Email, Voice'
          }
        })
        
        const emailResult = await emailService.sendEmail({
          to: contact.email!,
          subject: rendered.subject || '🧪 System Test - Emergency Alert System',
          htmlContent: rendered.html!,
          textContent: rendered.content
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
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
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