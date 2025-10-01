import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'
import { db } from '@/lib/database'
import { protectTestEndpoint } from '@/lib/test-protection'

export async function POST() {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
  try {
    // Check if we have contacts
    const contacts = await db.getActiveContacts()
    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No test contacts available. Please add a contact first.'
      })
    }

    // Create a high-severity earthquake that will trigger voice calls
    // This simulates a M7.5+ earthquake in a coastal area (high tsunami threat)
    const highSeverityEarthquake = {
      id: `high-severity-test-${Date.now()}`,
      geometry: {
        coordinates: [-155.0, 19.5, 5] // Shallow depth = higher tsunami risk
      },
      properties: {
        mag: 7.8, // High magnitude
        place: 'Pacific Ocean, near populated coast',
        time: Date.now(),
        title: 'HIGH SEVERITY TEST - M 7.8 - Pacific Ocean Tsunami Risk',
        depth: 5, // Shallow = higher tsunami risk
        url: 'https://earthquake.usgs.gov/earthquakes/test-high-severity'
      }
    }

    console.log('🚨 Triggering HIGH SEVERITY test alert (should include VOICE calls)...')
    
    // Process the high-severity earthquake (should trigger voice + all other channels)
    await alertManager.processEarthquakeAlert(highSeverityEarthquake as any)
    
    return NextResponse.json({
      success: true,
      message: '🚨 High-severity test alert sent! Should include Voice calls + SMS + WhatsApp + Email.',
      details: {
        magnitude: 7.8,
        expectedChannels: 'Voice + SMS + WhatsApp + Email',
        expectedSeverity: '4-5 (Critical)',
        tsunamiRisk: 'High (shallow depth + high magnitude)'
      }
    })
  } catch (error) {
    console.error('Error testing high-severity alert:', error)
    return NextResponse.json({
      success: false,
      message: `High-severity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
