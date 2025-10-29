import { NextRequest, NextResponse } from 'next/server'
import { SMSService } from '@/lib/sms-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * PUT /api/contacts/[id]
 * Update a contact
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contactId = context.params.id
    const { name, phone, email, whatsapp, location, role } = await request.json()
    
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
        whatsapp: formattedWhatsApp,
        location: location && location.trim() ? location.trim() : null,
        role: role || null
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

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contactId = context.params.id
    
    // Delete contact using Prisma
    const { prisma } = await import("@/lib/prisma")
    await prisma.contact.delete({
      where: { id: contactId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete contact'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/contacts/[id]
 * Get a single contact
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contactId = context.params.id
    
    // Get contact using Prisma
    const { prisma } = await import("@/lib/prisma")
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
