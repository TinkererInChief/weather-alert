import { vesselEnrichmentService } from '../lib/services/vessel-enrichment.service'

async function main() {
  console.log('🚢 Vessel Enrichment Tool\n')
  
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (command === 'stats') {
    // Show enrichment statistics
    console.log('📊 Fetching enrichment statistics...\n')
    const stats = await vesselEnrichmentService.getEnrichmentStats()
    
    console.log('📈 Enrichment Statistics:')
    console.log(`   Total vessels: ${stats.totalVessels.toLocaleString()}`)
    console.log(`   Enriched vessels: ${stats.enrichedVessels.toLocaleString()}`)
    console.log(`   Enrichment score: ${stats.averageEnrichmentScore}%`)
    console.log(`\n📉 Missing data:`)
    console.log(`   Missing IMO: ${stats.missingIMO.toLocaleString()}`)
    console.log(`   Missing type: ${stats.missingType.toLocaleString()}`)
    console.log(`   Missing dimensions: ${stats.missingDimensions.toLocaleString()}`)
    
  } else if (command === 'list') {
    // List vessels needing enrichment
    const limit = parseInt(args[1]) || 10
    console.log(`📋 Vessels needing enrichment (showing ${limit})...\n`)
    
    const vessels = await vesselEnrichmentService.getVesselsNeedingEnrichment(limit)
    
    vessels.forEach((vessel, i) => {
      console.log(`${i + 1}. ${vessel.name} (MMSI: ${vessel.mmsi})`)
      console.log(`   IMO: ${vessel.imo || '❌ Missing'}`)
      console.log(`   Type: ${vessel.vesselType || '❌ Missing'}`)
      console.log(`   Dimensions: ${vessel.length ? `${vessel.length}m` : '❌ Missing'} x ${vessel.width ? `${vessel.width}m` : '❌ Missing'}`)
      console.log()
    })
    
  } else if (command === 'enrich') {
    // Enrich vessels
    const limit = parseInt(args[1]) || 100
    const batchSize = parseInt(args[2]) || 50
    
    console.log(`🔄 Starting enrichment...`)
    console.log(`   Limit: ${limit} vessels`)
    console.log(`   Batch size: ${batchSize}`)
    console.log(`   Source: Marinesia API\n`)
    
    const result = await vesselEnrichmentService.enrichVessels({
      limit,
      batchSize,
      onlyMissing: true
    })
    
    console.log('\n✅ Enrichment complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   Processed: ${result.processed}`)
    console.log(`   Enriched: ${result.enriched}`)
    console.log(`   Skipped: ${result.skipped}`)
    console.log(`   Failed: ${result.failed}`)
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`)
    console.log(`   Rate: ${(result.processed / (result.duration / 1000)).toFixed(1)} vessels/sec`)
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`)
    }
    
  } else if (command === 'single') {
    // Enrich single vessel by MMSI
    const mmsi = parseInt(args[1])
    
    if (!mmsi) {
      console.error('❌ Please provide MMSI number')
      console.log('Usage: npm run enrich single <MMSI>')
      process.exit(1)
    }
    
    console.log(`🔄 Enriching vessel MMSI ${mmsi}...\n`)
    const success = await vesselEnrichmentService.enrichVessel(mmsi)
    
    if (success) {
      console.log('\n✅ Vessel enriched successfully!')
    } else {
      console.log('\n⚠️  No enrichment performed')
    }
    
  } else {
    // Show help
    console.log('Usage:')
    console.log('  npm run enrich stats              - Show enrichment statistics')
    console.log('  npm run enrich list [limit]       - List vessels needing enrichment')
    console.log('  npm run enrich enrich [limit]     - Enrich vessels (default: 100)')
    console.log('  npm run enrich single <MMSI>      - Enrich single vessel by MMSI')
    console.log('\nExamples:')
    console.log('  npm run enrich stats')
    console.log('  npm run enrich list 20')
    console.log('  npm run enrich enrich 500')
    console.log('  npm run enrich single 512005706')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
