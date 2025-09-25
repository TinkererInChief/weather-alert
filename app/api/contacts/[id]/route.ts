import { NextResponse } from 'next/server'
import { SMSService } from '@/lib/sms-service'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, phone, email, whatsapp } = await request.json()
    const contactId = params.id
    
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
    
    // Update contact using Prisma
    const { prisma } = await import('@/lib/prisma')
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name,
        phone: formattedPhone,
        email: email && email.trim() ? email.trim() : null,
        whatsapp: formattedWhatsApp
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
  } catch (error: any) {
    // Handle contact not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update contact'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id
    
    // Delete contact using Prisma
    const { prisma } = await import('@/lib/prisma')
    await prisma.contact.delete({
      where: { id: contactId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error: any) {
    // Handle contact not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete contact'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id
    
    // Get contact using Prisma
    const { prisma } = await import('@/lib/prisma')
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })
    
    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found'
        },
        { status: 404 }
      )
    }
    
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
        error: error instanceof Error ? error.message : 'Failed to fetch contact'
      },
      { status: 500 }
    )
  }
}
