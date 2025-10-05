import { NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp-service'
import { db } from '@/lib/database'
import { protectTestEndpoint } from '@/lib/test-protection'

export async function POST() {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
  try {
    const whatsappService = new WhatsAppService()
    const contacts = await db.getActiveContacts()
    
    // Find a contact with WhatsApp or phone number
    const testContact = contacts.find(c => c.whatsapp || c.phone)
    
    if (!testContact) {
      return NextResponse.json({
        success: false,
        message: 'No contacts with WhatsApp or phone numbers found. Please add a contact first.'
      })
    }

    // Use template service
    const { TemplateService } = await import('@/lib/services/template-service')
    const templateService = new TemplateService()
    
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

    console.log(`🧪 Testing WhatsApp service to ${testContact.name}...`)
    
    const result = await whatsappService.sendMessage(
      testContact.whatsapp || testContact.phone!,
      rendered.content
    )
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `WhatsApp test message sent successfully to ${testContact.name}! Message ID: ${result.messageId}`
        : `WhatsApp test failed: ${result.error}`,
      data: {
        contact: {
          name: testContact.name,
          whatsappNumber: testContact.whatsapp || testContact.phone,
          usedFallback: !testContact.whatsapp && !!testContact.phone
        },
        result: {
          messageId: result.messageId,
          provider: result.provider,
          error: result.error
        }
      }
    })
  } catch (error) {
    console.error('Error testing WhatsApp service:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'WhatsApp test failed',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
  try {
    const contacts = await db.getActiveContacts()
    const whatsappContacts = contacts.filter(c => c.whatsapp || c.phone)
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp service status',
      data: {
        serviceConfigured: !!process.env.TWILIO_ACCOUNT_SID,
        whatsappContactsAvailable: whatsappContacts.length,
        contacts: whatsappContacts.map(c => ({
          name: c.name,
          hasWhatsAppField: !!c.whatsapp,
          hasFallbackPhone: !!c.phone,
          willUseNumber: c.whatsapp || c.phone
        })),
        testInstructions: {
          post: 'POST /api/test/whatsapp - Sends a test WhatsApp message',
          requirements: 'Requires at least one contact with whatsapp or phone field'
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Status check failed'
      },
      { status: 500 }
    )
  }
}
