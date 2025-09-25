import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

export async function GET() {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL
    const fromName = process.env.SENDGRID_FROM_NAME

    // Basic environment check
    const diagnostics = {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'Not set',
      fromEmail: fromEmail || 'Not set',
      fromName: fromName || 'Not set',
      timestamp: new Date().toISOString()
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_API_KEY not configured',
        diagnostics
      })
    }

    if (!fromEmail) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_FROM_EMAIL not configured',
        diagnostics
      })
    }

    // Test API key validity with SendGrid
    sgMail.setApiKey(apiKey)
    
    try {
      // Try to send a minimal test email to validate the API key
      const msg = {
        to: fromEmail, // Send to self
        from: {
          email: fromEmail,
          name: fromName || 'Emergency Alert System'
        },
        subject: 'SendGrid API Test',
        text: 'This is a test to validate SendGrid API key.',
        html: '<p>This is a test to validate SendGrid API key.</p>',
        mailSettings: {
          sandboxMode: {
            enable: true // Enable sandbox mode for testing
          }
        }
      }

      const [response] = await sgMail.send(msg)
      
      return NextResponse.json({
        success: true,
        message: 'SendGrid API key is valid (sandbox test)',
        diagnostics: {
          ...diagnostics,
          statusCode: response.statusCode,
          messageId: response.headers['x-message-id']
        }
      })
      
    } catch (sendError: any) {
      let errorDetails = 'Unknown SendGrid error'
      
      if (sendError.response?.body?.errors) {
        errorDetails = sendError.response.body.errors.map((e: any) => e.message).join(', ')
      } else if (sendError.message) {
        errorDetails = sendError.message
      }

      return NextResponse.json({
        success: false,
        error: `SendGrid API Error: ${errorDetails}`,
        errorCode: sendError.code || sendError.response?.status,
        diagnostics
      })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Email debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      diagnostics: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
