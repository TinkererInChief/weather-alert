// Check what's blocking the table
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLocks() {
  console.log('=== Checking Table Locks ===\n')
  
  const locks = await prisma.$queryRaw<Array<{
    pid: number
    usename: string
    application_name: string
    state: string
    query: string
    wait_event_type: string | null
    wait_event: string | null
  }>>(Prisma.sql`
    SELECT 
      pid,
      usename,
      application_name,
      state,
      substring(query, 1, 100) as query,
      wait_event_type,
      wait_event
    FROM pg_stat_activity
    WHERE state != 'idle'
      AND pid != pg_backend_pid()
    ORDER BY query_start
  `)

  if (locks.length === 0) {
    console.log('✓ No active queries or locks found')
  } else {
    console.log('Active database connections:')
    locks.forEach((lock, i) => {
      console.log(`\n${i+1}. PID ${lock.pid} (${lock.application_name})`)
      console.log(`   User: ${lock.usename}`)
      console.log(`   State: ${lock.state}`)
      console.log(`   Query: ${lock.query}`)
      if (lock.wait_event) {
        console.log(`   Waiting: ${lock.wait_event_type}/${lock.wait_event}`)
      }
    })
  }

  await prisma.$disconnect()
}

checkLocks().catch(console.error)
