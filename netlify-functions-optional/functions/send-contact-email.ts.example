import type { Handler, HandlerEvent } from '@netlify/functions'

// IMPORTANT: Set CONTACT_EMAIL environment variable in Netlify dashboard
// This keeps the email address secret and not exposed in the frontend code
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'fallback@example.com'

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse the form data
    const formData = JSON.parse(event.body || '{}')
    
    const { name, email, company, phone, subject, message } = formData

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // In production, you would send an actual email here using:
    // - SendGrid API
    // - Mailgun API
    // - AWS SES
    // - Or any other email service
    
    // Example with SendGrid (you would need to install @sendgrid/mail):
    /*
    import sgMail from '@sendgrid/mail'
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    
    const msg = {
      to: CONTACT_EMAIL,
      from: 'noreply@yoursite.com', // Must be verified in SendGrid
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      text: `
        Name: ${name}
        Email: ${email}
        Company: ${company || 'N/A'}
        Phone: ${phone || 'N/A'}
        Subject: ${subject}
        
        Message:
        ${message}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    }
    
    await sgMail.send(msg)
    */

    // For now, log the submission (in production, this would actually send the email)
    console.log('Contact form submission:', {
      to: CONTACT_EMAIL,
      from: email,
      subject,
      name,
      company,
      phone,
      message
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Form submitted successfully. We will contact you soon.' 
      })
    }

  } catch (error) {
    console.error('Error processing contact form:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process form submission',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
