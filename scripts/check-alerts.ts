/**
 * Check Alert Database Status
 * 
 * Quick script to check if we have any alerts in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking alert database...\n')
  
  try {
    // Count total alerts
    const totalAlerts = await prisma.alertLog.count()
    console.log(`📊 Total Alerts in Database: ${totalAlerts}`)
    
    if (totalAlerts === 0) {
      console.log('\n❌ No alerts found in database!')
      console.log('\n💡 To populate the database with alerts:')
      console.log('   1. Run earthquake monitoring: POST /api/monitoring/start')
      console.log('   2. Run tsunami monitoring: POST /api/tsunami/monitor')
      console.log('   3. Or trigger a test alert: POST /api/alerts/test-high-severity')
      return
    }
    
    // Get date range
    const oldestAlert = await prisma.alertLog.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, location: true, magnitude: true }
    })
    
    const newestAlert = await prisma.alertLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, location: true, magnitude: true }
    })
    
    console.log(`\n📅 Date Range:`)
    console.log(`   Oldest: ${oldestAlert?.timestamp.toLocaleString()}`)
    console.log(`   Newest: ${newestAlert?.timestamp.toLocaleString()}`)
    
    // Count by time period
    const now = Date.now()
    const last24h = await prisma.alertLog.count({
      where: { timestamp: { gte: new Date(now - 24 * 60 * 60 * 1000) } }
    })
    
    const last7d = await prisma.alertLog.count({
      where: { timestamp: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }
    })
    
    const last30d = await prisma.alertLog.count({
      where: { timestamp: { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } }
    })
    
    console.log(`\n⏰ Alerts by Time Period:`)
    console.log(`   Last 24 hours: ${last24h}`)
    console.log(`   Last 7 days:   ${last7d}`)
    console.log(`   Last 30 days:  ${last30d}`)
    
    // Count with coordinates (for map)
    const withCoordinates = await prisma.alertLog.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    })
    
    console.log(`\n🗺️  Alerts with Coordinates (mappable): ${withCoordinates}`)
    
    // Sample recent alerts
    console.log(`\n📋 Recent Alerts (last 5):`)
    const recentAlerts = await prisma.alertLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: {
        timestamp: true,
        magnitude: true,
        location: true,
        contactsNotified: true,
        success: true
      }
    })
    
    recentAlerts.forEach((alert, i) => {
      console.log(`   ${i + 1}. M${alert.magnitude} - ${alert.location}`)
      console.log(`      ${alert.timestamp.toLocaleString()} | ${alert.contactsNotified} contacts | ${alert.success ? '✅' : '❌'}`)
    })
    
    console.log(`\n✅ Database check complete!`)
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
