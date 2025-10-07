#!/usr/bin/env ts-node
/**
 * Maritime Services Test Runner
 * Run with: npx ts-node scripts/test-maritime.ts
 */

import { runAllTests } from '../lib/services/__tests__/maritime-services.test'

console.log('Starting Maritime Intelligence Test Suite...\n')

runAllTests()
  .then(() => {
    console.log('\n✅ Test suite completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:')
    console.error(error)
    process.exit(1)
  })
