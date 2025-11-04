import { NextResponse } from 'next/server'

/**
 * Mock tsunami alert endpoint for testing DART features
 * Visit /dashboard/tsunami and change the API call to use this endpoint
 */
export async function GET() {
  const mockAlerts = [
    {
      id: 'mock-dart-1',
      source: 'PTWC',
      title: 'M8.2 Earthquake - Tsunami Warning',
      category: 'Warning',
      severity: 4,
      latitude: 38.297,
      longitude: 142.373,
      affectedRegions: ['Japan', 'Pacific Coast'],
      issuedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      description: 'A major earthquake has occurred. Tsunami waves observed.',
      instructions: 'Move to higher ground immediately. Do not wait for official warnings.',
      location: 'Off the coast of Sendai, Japan',
      urgency: 'Immediate',
      threat: {
        level: 'warning',
        confidence: 0.95,
        affectedRegions: ['Japan', 'Pacific Coast']
      },
      processedAt: new Date(Date.now() - 25 * 60 * 1000),
      ocean: 'Pacific',
      messageType: 'Warning',
      
      // DART ENRICHMENT DATA
      dartConfirmation: {
        stationId: '21413',
        stationName: 'DART 21413 - Off Japan Coast',
        height: 2.3, // meters
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        region: 'Western Pacific'
      },
      confidence: 95,
      sources: ['PTWC', 'JMA', 'DART'],
      sourceCount: 3,
      waveTrains: [
        {
          number: 1,
          height: 1.2,
          eta: new Date(Date.now() + 15 * 60 * 1000),
          isStrongest: false
        },
        {
          number: 2,
          height: 2.8,
          eta: new Date(Date.now() + 30 * 60 * 1000),
          isStrongest: true
        },
        {
          number: 3,
          height: 1.5,
          eta: new Date(Date.now() + 45 * 60 * 1000),
          isStrongest: false
        }
      ]
    },
    {
      id: 'mock-dart-2',
      source: 'JMA',
      title: 'M7.5 Earthquake - Tsunami Watch',
      category: 'Watch',
      severity: 3,
      latitude: -15.489,
      longitude: -173.972,
      affectedRegions: ['Tonga', 'Samoa'],
      issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      description: 'Moderate earthquake detected. Tsunami possible.',
      instructions: 'Stay alert for official tsunami information.',
      location: 'Tonga Region',
      urgency: 'Expected',
      threat: {
        level: 'watch',
        confidence: 0.70,
        affectedRegions: ['Tonga', 'Samoa']
      },
      processedAt: new Date(Date.now() - 110 * 60 * 1000),
      ocean: 'Pacific',
      messageType: 'Watch',
      
      // DART ENRICHMENT - No confirmation
      confidence: 70,
      sources: ['JMA', 'PTWC'],
      sourceCount: 2
    },
    {
      id: 'mock-dart-3',
      source: 'GeoNet',
      title: 'M6.8 Earthquake - Tsunami Advisory',
      category: 'Advisory',
      severity: 2,
      latitude: -37.814,
      longitude: 179.095,
      affectedRegions: ['New Zealand', 'East Coast'],
      issuedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      description: 'Small earthquake detected near coast.',
      instructions: 'Stay informed. Minor waves possible.',
      location: 'East of North Island, New Zealand',
      urgency: 'Future',
      threat: {
        level: 'advisory',
        confidence: 0.55,
        affectedRegions: ['New Zealand']
      },
      processedAt: new Date(Date.now() - 290 * 60 * 1000),
      ocean: 'Pacific',
      messageType: 'Advisory',
      
      // DART ENRICHMENT with confirmation
      dartConfirmation: {
        stationId: '55012',
        stationName: 'DART 55012 - New Zealand',
        height: 0.8,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        region: 'Southwest Pacific'
      },
      confidence: 85,
      sources: ['GeoNet', 'DART'],
      sourceCount: 2
    }
  ]

  return NextResponse.json({
    success: true,
    message: 'Mock DART-enriched tsunami alerts for testing',
    data: {
      alertCount: mockAlerts.length,
      alerts: mockAlerts,
      sources: ['PTWC', 'JMA', 'DART', 'GeoNet'],
      dartEnabled: true,
      lastChecked: new Date().toISOString()
    }
  })
}
