import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/services/email-service'
import { db } from '@/lib/database'

export async function POST() {
  try {
    const emailService = new EmailService()
    const contacts = await db.getActiveContacts()
    
    // Find a contact with email
    const testContact = contacts.find(c => c.email)
    
    if (!testContact) {
      return NextResponse.json({
        success: false,
        message: 'No contacts with email addresses found. Please add a contact with an email first.'
      })
    }

    // Use template service
    const { TemplateService } = await import('@/lib/services/template-service')
    const templateService = new TemplateService()
    
    const rendered = await templateService.renderTemplate({
      type: 'test',
      channel: 'email',
      language: 'en',
      data: {
        systemName: 'Emergency Alert System',
        timestamp: new Date().toLocaleString(),
        contactName: testContact.name,
        status: 'All systems operational',
        contactId: testContact.id,
        channelsTested: 'Email'
      }
    })

    console.log(`🧪 Testing Email service to ${testContact.name} (${testContact.email})...`)
    
    const result = await emailService.sendEmail({
      to: testContact.email!,
      subject: rendered.subject || '🧪 System Test - Emergency Alert System',
      htmlContent: rendered.html!,
      textContent: rendered.content
    })
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Email test sent successfully to ${testContact.name} (${testContact.email})! Message ID: ${result.messageId}`
        : `Email test failed: ${result.error}`,
      data: {
        contact: {
          name: testContact.name,
          email: testContact.email
        },
        result: {
          messageId: result.messageId,
          provider: result.provider,
          error: result.error
        }
      }
    })
  } catch (error) {
    console.error('Error testing Email service:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Email test failed',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const contacts = await db.getActiveContacts()
    const emailContacts = contacts.filter(c => c.email)
    
    return NextResponse.json({
      success: true,
      message: 'Email service status',
      data: {
        serviceConfigured: !!process.env.SENDGRID_API_KEY,
        emailContactsAvailable: emailContacts.length,
        contacts: emailContacts.map(c => ({
          name: c.name,
          email: c.email
        })),
        testInstructions: {
          post: 'POST /api/test/email - Sends a test email',
          requirements: 'Requires at least one contact with email field and SENDGRID_API_KEY'
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
