#!/usr/bin/env tsx

import { JMASource } from '../lib/data-sources/jma-source'

async function testJMA() {
  console.log('Testing JMA Tsunami API...\n')
  
  const jma = new JMASource()
  
  console.log('1. Checking availability...')
  const isAvailable = await jma.isAvailable()
  console.log(`   Available: ${isAvailable}\n`)
  
  if (!isAvailable) {
    console.log('❌ JMA is not available')
    process.exit(1)
  }
  
  console.log('2. Fetching tsunami alerts...')
  const alerts = await jma.fetchTsunamiAlerts()
  
  console.log(`\n✅ Found ${alerts.length} tsunami alerts:\n`)
  
  for (const alert of alerts) {
    console.log(`  - ${alert.title}`)
    console.log(`    ID: ${alert.id}`)
    console.log(`    Severity: ${alert.severity} (${alert.category})`)
    console.log(`    Issued: ${alert.issuedAt.toISOString()}`)
    console.log(`    Location: ${alert.affectedRegions.join(', ')}`)
    console.log(`    Description: ${alert.description}\n`)
  }
  
  if (alerts.length === 0) {
    console.log('   No active tsunami alerts found')
  }
}

testJMA().catch(console.error)
