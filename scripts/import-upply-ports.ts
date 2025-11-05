import { portImportService } from '../lib/services/port-import.service'

async function main() {
  console.log('🚢 Starting Upply seaports import...')
  
  const filePath = '/Users/yash/weather-alert/UPPLY-SEAPORTS.csv'
  
  try {
    const result = await portImportService.importFromCSV(
      filePath,
      'upply',
      'system' // system user ID
    )
    
    console.log('\n✅ Import complete!')
    console.log(`📊 Results:`)
    console.log(`   - Imported: ${result.imported}`)
    console.log(`   - Updated: ${result.updated}`)
    console.log(`   - Skipped: ${result.skipped}`)
    console.log(`   - Failed: ${result.failed}`)
    console.log(`   - Duration: ${(result.duration / 1000).toFixed(2)}s`)
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`)
      result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more`)
      }
    }
    
    // Get stats
    const stats = await portImportService.getStats()
    console.log(`\n📈 Database stats:`)
    console.log(`   - Total ports: ${stats.total}`)
    console.log(`   - Average quality: ${stats.averageQuality}%`)
    console.log(`   - Top countries:`)
    stats.byCountry.slice(0, 5).forEach((c: any) => {
      console.log(`     • ${c.country}: ${c._count} ports`)
    })
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
