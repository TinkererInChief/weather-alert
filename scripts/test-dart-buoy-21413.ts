#!/usr/bin/env tsx

/**
 * Test DART buoy 21413 (near Japan) to verify tsunami detection
 */

async function testDARTBuoy() {
  console.log('🌊 Testing DART Buoy 21413 (Western Pacific - near Japan)\n')
  console.log('=' .repeat(70))
  
  try {
    const url = 'https://www.ndbc.noaa.gov/data/realtime2/21413.dart'
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EmergencyAlertSystem/1.0' }
    })
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch data: ${response.status}`)
      return
    }
    
    const data = await response.text()
    const lines = data.trim().split('\n').filter(line => line.trim())
    
    console.log(`✅ Fetched ${lines.length} lines of data\n`)
    console.log('Sample data format:')
    console.log(lines[0]) // Header
    console.log(lines[1]) // Column names
    console.log(lines.slice(2, 5).join('\n')) // First few data lines
    
    // Parse recent data around earthquake time (08:03 UTC)
    console.log('\n' + '─'.repeat(70))
    console.log('\n📊 Pressure readings around earthquake time (08:03 UTC):')
    console.log('─'.repeat(70))
    
    const earthquakeTimeLines = lines.filter(line => {
      return line.includes('2025 11 09 07') || 
             line.includes('2025 11 09 08') || 
             line.includes('2025 11 09 09')
    })
    
    const readings: Array<{time: string, pressure: number}> = []
    
    for (const line of earthquakeTimeLines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 8) continue
      
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      const hour = parts[3]
      const min = parts[4]
      const pressure = parseFloat(parts[parts.length - 1])
      
      const time = `${year}-${month}-${day} ${hour}:${min} UTC`
      readings.push({ time, pressure })
    }
    
    // Display readings
    console.log('\nTime                 | Pressure (m) | Change from baseline')
    console.log('-'.repeat(70))
    
    const baseline = readings[0]?.pressure || 0
    
    for (const reading of readings) {
      const change = reading.pressure - baseline
      const changeStr = change >= 0 ? `+${change.toFixed(3)}` : change.toFixed(3)
      const changeCm = (change * 100).toFixed(1)
      console.log(`${reading.time} | ${reading.pressure.toFixed(3)}  | ${changeStr}m (${changeCm}cm)`)
    }
    
    // Calculate max change in 30-minute window
    console.log('\n' + '─'.repeat(70))
    console.log('\n🔍 Tsunami Detection Analysis:')
    console.log('─'.repeat(70))
    
    const last10 = readings.slice(-10)
    if (last10.length >= 3) {
      const pressures = last10.map(r => r.pressure * 100) // Convert to cm
      const min = Math.min(...pressures)
      const max = Math.max(...pressures)
      const change = max - min
      
      console.log(`\nLast 10 readings (${last10.length} samples):`)
      console.log(`  Min pressure: ${min.toFixed(2)} cm`)
      console.log(`  Max pressure: ${max.toFixed(2)} cm`)
      console.log(`  Total change: ${change.toFixed(2)} cm`)
      
      console.log('\n📋 Detection Thresholds:')
      console.log(`  >5cm in <30 min   → Minor (Watch)     ${change > 5 ? '✅ TRIGGERED' : '❌ Not met'}`)
      console.log(`  >10cm in <30 min  → Moderate (Advisory) ${change > 10 ? '✅ TRIGGERED' : '❌ Not met'}`)
      console.log(`  >20cm in <20 min  → Significant (Warning) ${change > 20 ? '✅ TRIGGERED' : '❌ Not met'}`)
      console.log(`  >50cm in <15 min  → Major (Warning)   ${change > 50 ? '✅ TRIGGERED' : '❌ Not met'}`)
      
      if (change > 5) {
        console.log(`\n⚠️  ALERT: Pressure change of ${change.toFixed(2)}cm detected!`)
      } else {
        console.log(`\n✅ Normal conditions: Change (${change.toFixed(2)}cm) below tsunami threshold`)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testDARTBuoy().catch(console.error)
