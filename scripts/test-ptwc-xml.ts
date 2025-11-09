#!/usr/bin/env tsx

import { PTWCSource } from '../lib/data-sources/ptwc-source'

async function testPTWC() {
  console.log('🌊 Testing PTWC XML/Atom Feed Parser\n')
  console.log('=' .repeat(70))
  
  const ptwc = new PTWCSource()
  
  try {
    console.log('1. Checking availability...')
    const available = await ptwc.isAvailable()
    console.log(`   Status: ${available ? '✅ Available' : '❌ Unavailable'}\n`)
    
    if (!available) {
      const health = ptwc.getHealthStatus()
      console.log(`   Error: ${health.lastError}`)
      return
    }
    
    console.log('2. Fetching tsunami alerts from Atom feeds...')
    const alerts = await ptwc.fetchTsunamiAlerts()
    
    console.log(`\n✅ Found ${alerts.length} tsunami alerts from PTWC:\n`)
    console.log('─'.repeat(70))
    
    if (alerts.length === 0) {
      console.log('   No active tsunami alerts')
    } else {
      alerts.forEach((alert, i) => {
        console.log(`\n${i + 1}. ${alert.title}`)
        console.log(`   ID: ${alert.id}`)
        console.log(`   Category: ${alert.category} (Severity: ${alert.severity})`)
        console.log(`   Location: ${alert.affectedRegions.join(', ')}`)
        console.log(`   Coordinates: ${alert.latitude}°N, ${alert.longitude}°E`)
        console.log(`   Issued: ${alert.issuedAt.toISOString()}`)
        console.log(`   Description: ${alert.description?.substring(0, 150) || 'N/A'}...`)
        console.log(`   Instructions: ${alert.instructions}`)
      })
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n✅ Test Complete')
    
    // Show raw feed sample
    console.log('\n📋 Testing raw feed access...')
    const feeds = [
      'https://www.tsunami.gov/events/xml/PHEBAtom.xml',
      'https://www.tsunami.gov/events/xml/PAAQAtom.xml'
    ]
    
    for (const feed of feeds) {
      try {
        const response = await fetch(feed, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmergencyAlertSystem/1.0)' }
        })
        console.log(`   ${feed.split('/').pop()}: ${response.ok ? '✅' : '❌'} ${response.status}`)
      } catch (error) {
        console.log(`   ${feed.split('/').pop()}: ❌ Error`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown')
  }
}

testPTWC().catch(console.error)
