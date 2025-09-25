import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'
import { db } from '@/lib/database'

export async function POST() {
  try {
    // Get test contacts
    const contacts = await db.getActiveContacts()
    
    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No test contacts available. Please add a contact first.'
      })
    }

    // Create a simulated earthquake for testing multi-channel alerts
    const testEarthquake = {
      id: `test-${Date.now()}`,
      geometry: {
        coordinates: [-155.0, 19.5, 10] // longitude, latitude, depth
      },
      properties: {
        mag: 6.2,
        place: 'Test Location, Pacific Ocean',
        time: Date.now(),
        title: 'Test Multi-Channel Alert - M 6.2 - Test Location, Pacific Ocean',
        depth: 10,
        url: 'https://earthquake.usgs.gov/earthquakes/test'
      }
    }

    console.log('🧪 Triggering multi-channel test alert...')
    
    // Process the test earthquake through the new multi-channel system
    await alertManager.processEarthquakeAlert(testEarthquake as any)
    
    return NextResponse.json({
      success: true,
      message: `Multi-channel test alert sent to ${contacts.length} contact(s). Check logs for detailed channel delivery results.`,
      data: {
        contactsTargeted: contacts.length,
        contactDetails: contacts.map(c => ({
          name: c.name,
          hasPhone: !!c.phone,
          hasEmail: !!c.email,
          hasWhatsApp: !!c.whatsapp
        })),
        testEarthquake: {
          magnitude: testEarthquake.properties.mag,
          location: testEarthquake.properties.place,
          expectedChannels: 'SMS + WhatsApp + Email (severity 3 for test earthquake)'
        }
      }
    })
  } catch (error) {
    console.error('Error testing multi-channel service:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Multi-channel test failed',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check multi-channel service status
export async function GET() {
  try {
    const contacts = await db.getActiveContacts()
    
    return NextResponse.json({
      success: true,
      message: 'Multi-channel service status',
      data: {
        contactsAvailable: contacts.length,
        contacts: contacts.map(c => ({
          name: c.name,
          channels: {
            sms: !!c.phone,
            email: !!c.email,
            whatsapp: !!c.whatsapp || !!c.phone,
            voice: !!c.phone
          }
        })),
        serviceStatus: {
          sms: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials',
          email: process.env.SENDGRID_API_KEY ? 'configured' : 'missing credentials',
          whatsapp: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials',
          voice: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing credentials'
        },
        testInstructions: {
          post: 'POST /api/alerts/test-multichannel - Sends test alerts via all channels',
          expected: 'Test earthquake alert will be processed through new multi-channel system'
        }
      }
    })
  } catch (error) {
    console.error('Error checking multi-channel status:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Status check failed'
      },
      { status: 500 }
    )
  }
}
