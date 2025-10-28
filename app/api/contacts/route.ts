import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { SMSService } from '@/lib/sms-service'
import { Permission, withPermission, logAudit } from '@/lib/rbac'

/**
 * GET /api/contacts
 * List all contacts (requires VIEW_CONTACTS permission)
 * Supports ?search=query parameter for filtering
 */
export const GET = withPermission(Permission.VIEW_CONTACTS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    
    // If search parameter provided, use Prisma for better filtering
    if (search && search.trim().length > 0) {
      const { prisma } = await import('@/lib/prisma')
      const contacts = await prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ],
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsapp: true
        },
        take: 20,
        orderBy: { name: 'asc' }
      })
      
      return NextResponse.json({
        success: true,
        contacts
      })
    }
    
    // Otherwise use existing db method
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
})

/**
 * POST /api/contacts
 * Create a new contact (requires CREATE_CONTACTS permission)
 */
export const POST = withPermission(Permission.CREATE_CONTACTS, async (request, session) => {
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
})
