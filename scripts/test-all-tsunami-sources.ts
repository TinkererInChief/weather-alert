#!/usr/bin/env tsx

import { PTWCSource } from '../lib/data-sources/ptwc-source'
import { DARTBuoySource } from '../lib/data-sources/dart-buoy-source'
import { GeoNetSource } from '../lib/data-sources/geonet-source'
import { JMASource } from '../lib/data-sources/jma-source'

async function testAllSources() {
  console.log('🌊 Testing All Tsunami Data Sources\n')
  console.log('=' .repeat(60))
  
  const sources = [
    { name: 'PTWC', source: new PTWCSource(), hasTsunami: true },
    { name: 'JMA', source: new JMASource(), hasTsunami: true },
    { name: 'DART', source: new DARTBuoySource(), hasTsunami: true },
    { name: 'GeoNet', source: new GeoNetSource(), hasTsunami: true }
  ]
  
  for (const { name, source, hasTsunami } of sources) {
    console.log(`\n📡 ${name} (${source.coverage.join(', ')})`)
    console.log('-'.repeat(60))
    
    try {
      // Check availability
      const available = await source.isAvailable()
      console.log(`   Status: ${available ? '✅ Available' : '❌ Unavailable'}`)
      
      if (!available) {
        const health = source.getHealthStatus()
        console.log(`   Error: ${health.lastError || 'Unknown'}`)
        console.log(`   Failures: ${health.consecutiveFailures}`)
        continue
      }
      
      // Check tsunami support
      if (hasTsunami && source.fetchTsunamiAlerts) {
        const alerts = await source.fetchTsunamiAlerts()
        console.log(`   Tsunami Alerts: ${alerts.length}`)
        
        if (alerts.length > 0) {
          alerts.forEach(alert => {
            console.log(`   - ${alert.title}`)
            console.log(`     Severity: ${alert.severity} (${alert.category})`)
            console.log(`     Location: ${alert.affectedRegions.join(', ')}`)
          })
        }
      } else {
        console.log(`   Tsunami Support: ❌ Not implemented`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Test Complete')
}

testAllSources().catch(console.error)
