import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { SMSService } from '@/lib/sms-service'

export async function GET() {
  try {
    const contacts = await db.getAllContacts()
    
    return NextResponse.json({
      success: true,
      data: contacts
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contacts'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, email, whatsapp } = await request.json()
    
    if (!name || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and phone are required'
        },
        { status: 400 }
      )
    }

    // Basic phone validation
    const smsService = new SMSService()
    if (!smsService.validatePhoneNumber(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number format'
        },
        { status: 400 }
      )
    }

    const formattedPhone = smsService.formatPhoneNumber(phone)
    
    // Format WhatsApp number if provided
    let formattedWhatsApp = null
    if (whatsapp && whatsapp.trim()) {
      if (!smsService.validatePhoneNumber(whatsapp)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid WhatsApp number format'
          },
          { status: 400 }
        )
      }
      formattedWhatsApp = smsService.formatPhoneNumber(whatsapp)
    }

    // Basic email validation if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid email format'
          },
          { status: 400 }
        )
      }
    }
    
    // Use raw Prisma query since the Contact type in database.ts doesn't include email/whatsapp
    const { prisma } = await import('@/lib/prisma')
    const contact = await prisma.contact.create({
      data: {
        name,
        phone: formattedPhone,
        email: email && email.trim() ? email.trim() : null,
        whatsapp: formattedWhatsApp,
        active: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        whatsapp: contact.whatsapp,
        active: contact.active,
        createdAt: contact.createdAt
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create contact'
      },
      { status: 500 }
    )
  }
}
