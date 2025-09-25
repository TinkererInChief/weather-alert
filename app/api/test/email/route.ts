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

    const testSubject = '🧪 Emergency Alert System - Email Test'
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🧪 Email Test Alert</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            This is a test message from your <strong>Emergency Alert System</strong>.
          </p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="color: #28a745; margin-top: 0;">📊 Test Details</h3>
            <ul style="color: #666; line-height: 1.6;">
              <li><strong>Service:</strong> Email via SendGrid</li>
              <li><strong>Contact:</strong> ${testContact.name}</li>
              <li><strong>Email:</strong> ${testContact.email}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #155724; margin: 0; font-weight: bold;">
              ✅ If you received this email, your email integration is working correctly!
            </p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0;">
              🔔 <strong>This is a test</strong> - no emergency action required.
            </p>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            <strong>Emergency Alert System</strong><br>
            Multi-Channel Notification Platform<br>
            Powered by Next.js, Twilio & SendGrid
          </p>
        </div>
      </div>
    `
    
    const testText = `🧪 EMAIL TEST ALERT

This is a test message from your Emergency Alert System.

📊 Test Details:
• Service: Email via SendGrid  
• Contact: ${testContact.name}
• Email: ${testContact.email}
• Time: ${new Date().toLocaleString()}

✅ If you received this email, your email integration is working correctly!

🔔 This is a test - no emergency action required.

---
Emergency Alert System
Multi-Channel Notification Platform`

    console.log(`🧪 Testing Email service to ${testContact.name} (${testContact.email})...`)
    
    const result = await emailService.sendEmail({
      to: testContact.email!,
      subject: testSubject,
      html: testHtml,
      text: testText
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
