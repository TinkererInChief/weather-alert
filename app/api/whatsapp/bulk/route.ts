import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, contactIds, includeAll = false } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 })
    }

    console.log(`📱 Starting bulk WhatsApp messages`)

    // Get contacts to message
    let contacts
    
    if (includeAll) {
      // Message all active contacts with WhatsApp or phone numbers
      contacts = await prisma.contact.findMany({
        where: { 
          active: true,
          OR: [
            { whatsapp: { not: null } },
            { phone: { not: null } }
          ]
        },
        select: {
          name: true,
          phone: true,
          whatsapp: true,
          id: true
        }
      })
    } else if (contactIds && Array.isArray(contactIds)) {
      // Message specific contacts
      contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          active: true,
          OR: [
            { whatsapp: { not: null } },
            { phone: { not: null } }
          ]
        },
        select: {
          name: true,
          phone: true,
          whatsapp: true,
          id: true
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either contactIds or includeAll must be specified'
      }, { status: 400 })
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid contacts found for WhatsApp messages'
      }, { status: 400 })
    }

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService()

    // Send bulk WhatsApp messages
    const result = await whatsappService.sendBulkWhatsApp(contacts, message)

    console.log(`✅ Bulk WhatsApp messages completed: ${result.successful}/${result.totalSent} successful`)

    return NextResponse.json({
      success: true,
      message: `Bulk WhatsApp messages completed: ${result.successful} successful, ${result.failed} failed`,
      data: {
        totalSent: result.totalSent,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error sending bulk WhatsApp messages:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send bulk WhatsApp messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get contacts available for WhatsApp
    const contacts = await prisma.contact.findMany({
      where: {
        active: true,
        OR: [
          { whatsapp: { not: null } },
          { phone: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp bulk endpoint ready',
      data: {
        availableContacts: contacts.length,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          hasWhatsApp: !!c.whatsapp,
          hasPhone: !!c.phone,
          preferredNumber: c.whatsapp || c.phone
        })),
        usage: {
          post: 'POST /api/whatsapp/bulk',
          parameters: {
            message: 'string (required) - Message to send',
            includeAll: 'boolean (optional) - Send to all contacts',
            contactIds: 'string[] (optional) - Specific contact IDs'
          },
          example: {
            message: '🧪 Test WhatsApp message from Emergency Alert System',
            includeAll: true
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting WhatsApp bulk info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get WhatsApp bulk information'
    }, { status: 500 })
  }
}