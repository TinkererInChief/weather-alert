/*
 * BullMQ Worker Entrypoint
 * Starts the alert queue workers for individual and bulk notifications.
 */

import AlertQueue from '../lib/queue/alert-queue'

async function main() {
  try {
    const queue = AlertQueue.getInstance()
    queue.startWorkers()
    // Keep process alive; BullMQ workers hold connections but add a noop interval as safety.
    setInterval(() => {}, 60_000).unref()

    // Graceful shutdown
    const shutdown = async () => {
      try {
        await queue.stopWorkers()
      } finally {
        process.exit(0)
      }
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    // eslint-disable-next-line no-console
    console.log('🚀 Queue worker started')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start queue worker:', error)
    process.exit(1)
  }
}

void main()
