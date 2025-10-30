#!/usr/bin/env tsx

/**
 * Test Monitor - Run Once
 * Runs the proximity check once for testing
 */

import { VesselProximityMonitor } from './monitor-vessel-proximity'

async function testMonitor() {
  console.log('🧪 Running proximity check once for testing...\n')
  
  const monitor = new VesselProximityMonitor()
  
  // Run check once using the private method (hacky but for testing)
  // @ts-ignore - accessing private method for testing
  await monitor['checkProximity']()
  
  console.log('\n✅ Test complete!')
  process.exit(0)
}

testMonitor().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
