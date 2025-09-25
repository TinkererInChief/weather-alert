import { NextRequest, NextResponse } from 'next/server'
import { voiceService, VoiceAlertType } from '@/lib/voice-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertType, customMessage, contactIds, includeAll = false } = body

    if (!Object.values(VoiceAlertType).includes(alertType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert type'
      }, { status: 400 })
    }

    console.log(`📞 Starting bulk voice calls for ${alertType}`)

    // Get contacts to call
    let contacts
    
    if (includeAll) {
      // Call all active contacts
      contacts = await prisma.contact.findMany({
        where: { 
          active: true,
          phone: { not: null }
        },
        select: {
          name: true,
          phone: true,
          id: true
        }
      })
    } else if (contactIds && Array.isArray(contactIds)) {
      // Call specific contacts
      contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          active: true,
          phone: { not: null }
        },
        select: {
          name: true,
          phone: true,
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
        error: 'No valid contacts found for voice calls'
      }, { status: 400 })
    }

    // Format contacts for voice service
    const contactsForCalling = contacts.map(contact => ({
      phone: contact.phone!,
      name: contact.name
    }))

    // Make bulk voice calls
    const result = await voiceService.makeBulkVoiceCalls(
      contactsForCalling,
      alertType as VoiceAlertType,
      customMessage
    )

    // Create bulk call job record
    await prisma.bulkCallJob.create({
      data: {
        alertType,
        totalContacts: result.totalCalls,
        successfulCalls: result.successful,
        failedCalls: result.failed,
        customMessage: customMessage || null,
        createdAt: new Date()
      }
    })

    console.log(`✅ Bulk voice calls completed: ${result.successful}/${result.totalCalls} successful`)

    return NextResponse.json({
      success: true,
      message: `Bulk voice calls completed: ${result.successful} successful, ${result.failed} failed`,
      data: {
        totalCalls: result.totalCalls,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        alertType,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error making bulk voice calls:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to make bulk voice calls',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
