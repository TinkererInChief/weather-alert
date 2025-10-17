/**
 * Vessel Ingestion Background Worker
 * 
 * This worker runs continuously to ingest vessel data from:
 * - AISStream.io (WebSocket - real-time streaming)
 * - OpenShipData (REST API - polling every 60 seconds)
 * 
 * Handles:
 * - Automatic reconnection on failures
 * - Graceful shutdown
 * - Error recovery
 * - Performance monitoring
 */

import { VesselTrackingCoordinator } from '@/lib/services/vessel-tracking-coordinator'

class VesselIngestionWorker {
  private coordinator: VesselTrackingCoordinator
  private isRunning = false
  private shutdownRequested = false
  private statsInterval: NodeJS.Timeout | null = null
  
  // Performance tracking
  private stats = {
    startTime: Date.now(),
    vesselsProcessed: 0,
    positionsReceived: 0,
    errors: 0,
    lastUpdate: Date.now()
  }
  
  constructor() {
    this.coordinator = VesselTrackingCoordinator.getInstance()
  }
  
  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Worker already running')
      return
    }
    
    console.log('🚀 Starting vessel ingestion worker...')
    console.log(`📅 ${new Date().toISOString()}`)
    
    try {
      this.isRunning = true
      this.stats.startTime = Date.now()
      
      // Start vessel tracking services
      await this.coordinator.start()
      
      // Set up periodic stats reporting
      this.startStatsReporting()
      
      // Set up graceful shutdown handlers
      this.setupShutdownHandlers()
      
      console.log('✅ Vessel ingestion worker started successfully')
      console.log('📊 Will report statistics every 5 minutes')
      
      // Keep process alive
      await this.keepAlive()
      
    } catch (error) {
      console.error('❌ Failed to start worker:', error)
      this.isRunning = false
      throw error
    }
  }
  
  /**
   * Keep the worker running indefinitely
   */
  private async keepAlive() {
    return new Promise((resolve) => {
      const checkShutdown = () => {
        if (this.shutdownRequested) {
          resolve(null)
        } else {
          setTimeout(checkShutdown, 1000)
        }
      }
      checkShutdown()
    })
  }
  
  /**
   * Report statistics periodically
   */
  private startStatsReporting() {
    this.statsInterval = setInterval(() => {
      this.reportStats()
    }, 5 * 60 * 1000) // Every 5 minutes
    
    // Also report on first run after 1 minute
    setTimeout(() => this.reportStats(), 60 * 1000)
  }
  
  /**
   * Log current statistics
   */
  private async reportStats() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000)
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    
    console.log('\n📊 === Vessel Ingestion Statistics ===')
    console.log(`⏱️  Uptime: ${hours}h ${minutes}m`)
    console.log(`🚢 Vessels in DB: ${await this.getVesselCount()}`)
    console.log(`📍 Positions in DB: ${await this.getPositionCount()}`)
    console.log(`📡 Recent positions (15m): ${await this.getRecentPositionCount()}`)
    console.log(`❌ Errors: ${this.stats.errors}`)
    
    const status = this.coordinator.getStatus()
    console.log(`🔄 Services:`)
    console.log(`   - AISStream: ${status.services.aisstream.status}`)
    console.log(`   - OpenShipData: ${status.services.openshipdata.status}`)
    console.log('=====================================\n')
  }
  
  /**
   * Get total vessel count from database
   */
  private async getVesselCount(): Promise<number> {
    try {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.vessel.count()
    } catch (error) {
      return 0
    }
  }
  
  /**
   * Get total position count
   */
  private async getPositionCount(): Promise<number> {
    try {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.vesselPosition.count()
    } catch (error) {
      return 0
    }
  }
  
  /**
   * Get recent position count (last 15 minutes)
   */
  private async getRecentPositionCount(): Promise<number> {
    try {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.vesselPosition.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000)
          }
        }
      })
    } catch (error) {
      return 0
    }
  }
  
  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers() {
    const shutdown = async (signal: string) => {
      if (this.shutdownRequested) {
        return // Already shutting down
      }
      
      console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`)
      this.shutdownRequested = true
      
      // Stop stats reporting
      if (this.statsInterval) {
        clearInterval(this.statsInterval)
      }
      
      // Stop vessel tracking
      this.coordinator.stop()
      
      // Final stats
      await this.reportStats()
      
      console.log('✅ Shutdown complete')
      process.exit(0)
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error)
      this.stats.errors++
      // Don't crash, just log
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
      this.stats.errors++
      // Don't crash, just log
    })
  }
  
  /**
   * Stop the worker
   */
  async stop() {
    console.log('🛑 Stopping vessel ingestion worker...')
    this.shutdownRequested = true
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
    
    this.coordinator.stop()
    this.isRunning = false
    
    console.log('✅ Worker stopped')
  }
}

// Export singleton instance
export const vesselIngestionWorker = new VesselIngestionWorker()

// If running as standalone script
if (require.main === module) {
  console.log('🚀 Starting vessel ingestion worker as standalone process...')
  
  vesselIngestionWorker.start().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}
