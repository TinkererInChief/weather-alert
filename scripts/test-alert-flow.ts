#!/usr/bin/env tsx

/**
 * Test Alert Flow
 * Tests the complete alert routing and delivery system
 */

// Load environment variables using Next.js env loader
import { loadEnvConfig } from '@next/env'
import { resolve } from 'path'

const projectDir = resolve(__dirname, '..')
loadEnvConfig(projectDir)

import { alertRoutingService } from '../lib/services/alert-routing-service'
import { prisma } from '../lib/prisma'

async function testAlertFlow() {
  console.log('🧪 TESTING ALERT FLOW\n')
  console.log('═'.repeat(60))

  try {
    // 1. Get test vessel
    console.log('\n📍 Step 1: Finding test vessel...')
    const vessel = await prisma.vessel.findFirst({
      where: {
        mmsi: '244710796' // CARMEN
      },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    if (!vessel) {
      throw new Error('Test vessel CARMEN not found')
    }

    console.log(`   ✓ Found: ${vessel.name} (${vessel.mmsi})`)
    console.log(`   ✓ Position: ${vessel.positions[0]?.latitude}, ${vessel.positions[0]?.longitude}`)

    // 2. Get test earthquake
    console.log('\n🌍 Step 2: Finding test earthquake...')
    const earthquake = await prisma.earthquakeEvent.findFirst({
      where: {
        sourceId: { startsWith: 'usgs_test_' }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!earthquake) {
      throw new Error('Test earthquake not found. Run setup-test-scenario.sql first!')
    }

    console.log(`   ✓ Found: Magnitude ${earthquake.magnitude} at ${earthquake.location}`)
    console.log(`   ✓ Location: ${earthquake.latitude}, ${earthquake.longitude}`)

    // 3. Calculate distance
    const vesselPos = vessel.positions[0]
    if (!vesselPos) {
      throw new Error('Vessel has no position data')
    }

    const distance = calculateDistance(
      vesselPos.latitude,
      vesselPos.longitude,
      earthquake.latitude,
      earthquake.longitude
    )

    console.log(`\n📏 Step 3: Distance calculation`)
    console.log(`   ✓ Distance: ${distance.toFixed(2)} km`)

    // Determine severity
    let severity: 'critical' | 'high' | 'moderate' | 'low' = 'low'
    if (distance <= 100) severity = 'critical'
    else if (distance <= 300) severity = 'high'
    else if (distance <= 500) severity = 'moderate'
    
    console.log(`   ✓ Severity: ${severity.toUpperCase()}`)

    // 4. Create alert
    console.log(`\n🚨 Step 4: Creating alert via AlertRoutingService...`)

    const result = await alertRoutingService.createAndRouteAlert({
      vesselId: vessel.id,
      eventId: earthquake.id,
      eventType: 'earthquake',
      severity,
      distance,
      coordinates: {
        lat: earthquake.latitude,
        lon: earthquake.longitude
      },
      message: generateTestMessage(vessel, earthquake, distance, severity),
      eventMagnitude: earthquake.magnitude
    })

    if (result.isDuplicate) {
      console.log(`   ⚠️  Duplicate alert detected (already exists)`)
      console.log(`   ℹ️  Alert ID: ${result.alert.id}`)
    } else {
      console.log(`   ✓ Alert created: ${result.alert.id}`)
      console.log(`   ✓ Status: ${result.alert.status}`)
      console.log(`   ✓ Recipients: ${result.recipientCount}`)
      console.log(`   ✓ Delivery logs: ${result.deliveryLogs.length}`)
    }

    // 5. Check delivery logs
    console.log(`\n📮 Step 5: Checking delivery logs...`)
    
    const deliveryLogs = await prisma.deliveryLog.findMany({
      where: {
        vesselAlertId: result.alert.id
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    })

    if (deliveryLogs.length === 0) {
      console.log(`   ⚠️  No delivery logs found`)
    } else {
      for (const log of deliveryLogs) {
        const icon = log.status === 'sent' ? '✓' : log.status === 'pending' ? '⏳' : '✗'
        console.log(`   ${icon} ${log.channel.toUpperCase()}: ${log.contact.name} - ${log.status}`)
        if (log.errorMessage) {
          console.log(`      Error: ${log.errorMessage}`)
        }
      }
    }

    // Wait a moment for async delivery
    console.log(`\n⏳ Waiting 3 seconds for delivery...`)
    await sleep(3000)

    // Check updated status
    const updatedLogs = await prisma.deliveryLog.findMany({
      where: {
        vesselAlertId: result.alert.id
      },
      orderBy: { updatedAt: 'desc' }
    })

    console.log(`\n📊 Step 6: Final delivery status:`)
    const stats = {
      sent: updatedLogs.filter(l => l.status === 'sent').length,
      failed: updatedLogs.filter(l => l.status === 'failed').length,
      pending: updatedLogs.filter(l => l.status === 'pending').length
    }

    console.log(`   ✓ Sent: ${stats.sent}`)
    console.log(`   ✗ Failed: ${stats.failed}`)
    console.log(`   ⏳ Pending: ${stats.pending}`)

    console.log('\n' + '═'.repeat(60))
    console.log('✅ TEST COMPLETE!\n')

    if (stats.failed > 0) {
      console.log('⚠️  Some deliveries failed. This is normal if Twilio/SendGrid are not configured.')
      console.log('   Check .env for TWILIO_* and SENDGRID_* credentials.\n')
    }

    if (stats.sent > 0) {
      console.log('🎉 SUCCESS! Check your phone and email for the alert!\n')
    }

    process.exit(0)

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
    process.exit(1)
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function generateTestMessage(vessel: any, earthquake: any, distance: number, severity: string): string {
  const emoji = {
    critical: '🔴',
    high: '🟠',
    moderate: '🟡',
    low: '🟢'
  }[severity] || '⚠️'

  return `${emoji} MARITIME ALERT - ${severity.toUpperCase()}

Vessel: ${vessel.name} (${vessel.mmsi})
Event: EARTHQUAKE
Magnitude: ${earthquake.magnitude}
Distance: ${distance.toFixed(0)} km
Location: ${earthquake.location}

Time: ${new Date().toISOString()}

⚠️ TAKE APPROPRIATE ACTION BASED ON YOUR EMERGENCY PROCEDURES.

This is a TEST alert from the automated vessel proximity monitor.`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run the test
testAlertFlow()
