#!/usr/bin/env node

/**
 * Page Performance Testing Script
 * Tests load times of all pages in the application
 * Usage: node scripts/test-page-performance.js
 */

const { performance } = require('perf_hooks')

// List of all pages to test
const pages = [
  // Dashboard pages
  { path: '/', name: 'Home/Dashboard' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/dashboard/alerts', name: 'Alerts' },
  { path: '/dashboard/tsunami', name: 'Tsunami' },
  { path: '/dashboard/contacts', name: 'Contacts' },
  { path: '/dashboard/vessels', name: 'Vessels' },
  { path: '/dashboard/database', name: 'Database Stats' },
  { path: '/dashboard/communications', name: 'Communications' },
  { path: '/dashboard/audit-logs', name: 'Audit Logs' },
  { path: '/dashboard/admin/users', name: 'Admin Users' },
  
  // Public pages
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/status', name: 'Status' },
  { path: '/help', name: 'Help' },
  
  // Other pages
  { path: '/settings', name: 'Settings' },
  { path: '/data-sources', name: 'Data Sources' },
]

// API endpoints to test
const apiEndpoints = [
  { path: '/api/stats', name: 'Stats API' },
  { path: '/api/monitoring', name: 'Monitoring API' },
  { path: '/api/alerts/history?limit=50', name: 'Alert History API' },
  { path: '/api/tsunami', name: 'Tsunami API' },
  { path: '/api/contacts', name: 'Contacts API' },
  { path: '/api/vessels', name: 'Vessels API' },
  { path: '/api/database/stats-cached', name: 'Database Stats API' },
]

async function testPageLoad(baseUrl, page) {
  const url = `${baseUrl}${page.path}`
  const start = performance.now()
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Performance-Test-Script',
        'Accept': 'text/html,application/json',
      }
    })
    
    const end = performance.now()
    const loadTime = end - start
    const contentLength = response.headers.get('content-length') || '0'
    const cacheControl = response.headers.get('cache-control') || 'none'
    
    return {
      path: page.path,
      name: page.name,
      status: response.status,
      loadTime: Math.round(loadTime),
      contentLength: parseInt(contentLength),
      cacheControl,
      success: response.ok
    }
  } catch (error) {
    return {
      path: page.path,
      name: page.name,
      status: 'ERROR',
      loadTime: -1,
      error: error.message,
      success: false
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getPerformanceRating(loadTime) {
  if (loadTime < 100) return { rating: '🟢 Excellent', color: '\x1b[32m' }
  if (loadTime < 300) return { rating: '🟡 Good', color: '\x1b[33m' }
  if (loadTime < 1000) return { rating: '🟠 Fair', color: '\x1b[33m' }
  return { rating: '🔴 Slow', color: '\x1b[31m' }
}

async function runTests() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 PAGE PERFORMANCE TESTING')
  console.log('='.repeat(80))
  console.log(`\nBase URL: ${baseUrl}`)
  console.log(`Testing ${pages.length} pages + ${apiEndpoints.length} API endpoints...\n`)
  
  // Test API endpoints first
  console.log('\n' + '-'.repeat(80))
  console.log('🔌 API ENDPOINTS')
  console.log('-'.repeat(80))
  
  const apiResults = []
  for (const endpoint of apiEndpoints) {
    const result = await testPageLoad(baseUrl, endpoint)
    apiResults.push(result)
    
    const { rating, color } = getPerformanceRating(result.loadTime)
    const reset = '\x1b[0m'
    
    console.log(`${color}${rating}${reset} - ${result.name}`)
    console.log(`  Path: ${result.path}`)
    console.log(`  Load Time: ${result.loadTime}ms`)
    console.log(`  Size: ${formatBytes(result.contentLength)}`)
    console.log(`  Cache: ${result.cacheControl}`)
    console.log()
  }
  
  // Test pages
  console.log('\n' + '-'.repeat(80))
  console.log('📄 PAGES')
  console.log('-'.repeat(80))
  
  const pageResults = []
  for (const page of pages) {
    const result = await testPageLoad(baseUrl, page)
    pageResults.push(result)
    
    const { rating, color } = getPerformanceRating(result.loadTime)
    const reset = '\x1b[0m'
    
    console.log(`${color}${rating}${reset} - ${result.name}`)
    console.log(`  Path: ${result.path}`)
    console.log(`  Load Time: ${result.loadTime}ms`)
    if (result.contentLength > 0) {
      console.log(`  Size: ${formatBytes(result.contentLength)}`)
    }
    console.log()
  }
  
  // Summary
  const allResults = [...apiResults, ...pageResults].filter(r => r.loadTime > 0)
  const avgLoadTime = Math.round(allResults.reduce((sum, r) => sum + r.loadTime, 0) / allResults.length)
  const slowPages = allResults.filter(r => r.loadTime > 1000).sort((a, b) => b.loadTime - a.loadTime)
  
  console.log('\n' + '='.repeat(80))
  console.log('📈 SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nAverage Load Time: ${avgLoadTime}ms`)
  console.log(`Total Tested: ${allResults.length}`)
  console.log(`Excellent (<100ms): ${allResults.filter(r => r.loadTime < 100).length}`)
  console.log(`Good (<300ms): ${allResults.filter(r => r.loadTime >= 100 && r.loadTime < 300).length}`)
  console.log(`Fair (<1000ms): ${allResults.filter(r => r.loadTime >= 300 && r.loadTime < 1000).length}`)
  console.log(`Slow (>1000ms): ${slowPages.length}`)
  
  if (slowPages.length > 0) {
    console.log('\n' + '-'.repeat(80))
    console.log('🔴 SLOW PAGES REQUIRING OPTIMIZATION')
    console.log('-'.repeat(80))
    slowPages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.name} - ${page.loadTime}ms`)
      console.log(`   Path: ${page.path}`)
      console.log(`   Size: ${formatBytes(page.contentLength)}`)
    })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Testing Complete!')
  console.log('='.repeat(80) + '\n')
  
  return { apiResults, pageResults, slowPages }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests, testPageLoad }
