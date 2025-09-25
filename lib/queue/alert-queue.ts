import { Queue, Worker, Job } from 'bullmq'
import RedisConnection from './redis-connection'
import { NotificationService } from '../services/notification-service'
import { prisma } from '../prisma'

// Queue job types
export interface AlertJobData {
  alertJobId: string
  contactId: string
  channel: 'sms' | 'email' | 'whatsapp' | 'voice'
  templateData: {
    type: string
    severity: number
    data: Record<string, any>
  }
  priority: number
}

export interface BulkAlertJobData {
  alertJobId: string
  contactIds: string[]
  channels: string[]
  templateData: {
    type: string
    severity: number
    data: Record<string, any>
  }
  priority: number
}

class AlertQueue {
  private static instance: AlertQueue
  private alertQueue: Queue<AlertJobData>
  private bulkAlertQueue: Queue<BulkAlertJobData>
  private worker: Worker<AlertJobData> | null = null
  private bulkWorker: Worker<BulkAlertJobData> | null = null
  private notificationService: NotificationService

  constructor() {
    const redis = RedisConnection.getInstance()
    
    // Individual alert queue (high priority)
    this.alertQueue = new Queue<AlertJobData>('individual-alerts', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })

    // Bulk alert queue (for mass notifications)
    this.bulkAlertQueue = new Queue<BulkAlertJobData>('bulk-alerts', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })

    this.notificationService = new NotificationService()
  }

  static getInstance(): AlertQueue {
    if (!AlertQueue.instance) {
      AlertQueue.instance = new AlertQueue()
    }
    return AlertQueue.instance
  }

  // Add individual alert to queue
  async addAlert(data: AlertJobData): Promise<Job<AlertJobData>> {
    const priority = this.getPriority(data.priority, data.channel)
    
    return await this.alertQueue.add('send-alert', data, {
      priority,
      delay: this.getDelay(data.priority),
    })
  }

  // Add bulk alert to queue
  async addBulkAlert(data: BulkAlertJobData): Promise<Job<BulkAlertJobData>> {
    const priority = this.getPriority(data.priority, 'bulk')
    
    return await this.bulkAlertQueue.add('send-bulk-alert', data, {
      priority,
    })
  }

  // Start processing queues
  startWorkers(): void {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10')
    
    // Individual alert worker
    this.worker = new Worker<AlertJobData>(
      'individual-alerts',
      async (job: Job<AlertJobData>) => {
        return await this.processIndividualAlert(job)
      },
      {
        connection: RedisConnection.getInstance(),
        concurrency,
      }
    )

    // Bulk alert worker
    this.bulkWorker = new Worker<BulkAlertJobData>(
      'bulk-alerts',
      async (job: Job<BulkAlertJobData>) => {
        return await this.processBulkAlert(job)
      },
      {
        connection: RedisConnection.getInstance(),
        concurrency: Math.max(1, Math.floor(concurrency / 2)),
      }
    )

    // Error handlers
    this.worker.on('failed', (job, err) => {
      console.error(`Individual alert job ${job?.id} failed:`, err)
    })

    this.bulkWorker.on('failed', (job, err) => {
      console.error(`Bulk alert job ${job?.id} failed:`, err)
    })

    console.log('✅ Alert queue workers started')
  }

  // Stop workers
  async stopWorkers(): Promise<void> {
    if (this.worker) {
      await this.worker.close()
      this.worker = null
    }
    
    if (this.bulkWorker) {
      await this.bulkWorker.close()
      this.bulkWorker = null
    }
    
    console.log('🛑 Alert queue workers stopped')
  }

  // Process individual alert
  private async processIndividualAlert(job: Job<AlertJobData>): Promise<any> {
    const { alertJobId, contactId, channel, templateData } = job.data
    
    try {
      // Update delivery log status
      await this.updateDeliveryStatus(alertJobId, contactId, channel, 'processing')
      
      // Get contact details
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      })
      
      if (!contact || !contact.active || !contact.phone) {
        throw new Error('Contact not found, inactive, or missing phone number')
      }

      // Send notification via appropriate channel
      const result = await this.notificationService.sendNotification({
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone, // Now TypeScript knows this is not null
          email: contact.email,
          whatsapp: contact.whatsapp,
          notificationChannels: Array.isArray(contact.notificationChannels) ? contact.notificationChannels as string[] : [],
          active: contact.active
        },
        channel,
        templateData,
        alertJobId
      })

      // Update delivery log with result
      await this.updateDeliveryStatus(
        alertJobId, 
        contactId, 
        channel, 
        result.success ? 'sent' : 'failed',
        result.messageId,
        result.error
      )

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await this.updateDeliveryStatus(
        alertJobId, 
        contactId, 
        channel, 
        'failed',
        undefined,
        errorMessage
      )
      
      throw error
    }
  }

  // Process bulk alert
  private async processBulkAlert(job: Job<BulkAlertJobData>): Promise<any> {
    const { alertJobId, contactIds, channels, templateData } = job.data
    
    const results = []
    
    for (const contactId of contactIds) {
      for (const channel of channels) {
        // Add individual alert jobs for each contact/channel combination
        const individualJob = await this.addAlert({
          alertJobId,
          contactId,
          channel: channel as any,
          templateData,
          priority: job.data.priority
        })
        
        results.push({ contactId, channel, jobId: individualJob.id })
      }
    }
    
    return { processedCombinations: results.length, results }
  }

  // Update delivery log status
  private async updateDeliveryStatus(
    alertJobId: string,
    contactId: string, 
    channel: string,
    status: string,
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      ...(providerMessageId && { providerMessageId }),
      ...(errorMessage && { errorMessage }),
      ...(status === 'sent' && { sentAt: new Date() }),
      ...(status === 'delivered' && { deliveredAt: new Date() })
    }

    // Use raw SQL to avoid potential Prisma client property typing issues
    await prisma.$executeRaw`
      UPDATE "delivery_logs"
      SET status = ${status},
          "providerMessageId" = COALESCE(${providerMessageId}, "providerMessageId"),
          "errorMessage" = COALESCE(${errorMessage}, "errorMessage"),
          "sentAt" = CASE WHEN ${status} = 'sent' THEN NOW() ELSE "sentAt" END,
          "deliveredAt" = CASE WHEN ${status} = 'delivered' THEN NOW() ELSE "deliveredAt" END
      WHERE "alertJobId" = ${alertJobId}
        AND "contactId" = ${contactId}
        AND channel = ${channel}
    `
  }

  // Calculate job priority
  private getPriority(severity: number, channel: string): number {
    // Higher severity = higher priority (lower number)
    let basePriority = (5 - severity) * 10
    
    // Channel priority adjustments
    if (channel === 'voice') basePriority -= 5
    else if (channel === 'sms') basePriority -= 3
    else if (channel === 'whatsapp') basePriority -= 1
    
    return Math.max(1, basePriority)
  }

  // Calculate delay based on priority
  private getDelay(priority: number): number {
    if (priority >= 4) return 0 // Emergency - immediate
    if (priority >= 3) return 1000 // Warning - 1s delay
    if (priority >= 2) return 5000 // Advisory - 5s delay
    return 10000 // Watch/Info - 10s delay
  }

  // Get queue stats
  async getStats() {
    const [alertStats, bulkStats] = await Promise.all([
      this.alertQueue.getJobCounts(),
      this.bulkAlertQueue.getJobCounts()
    ])

    return {
      individualAlerts: alertStats,
      bulkAlerts: bulkStats,
      total: {
        active: alertStats.active + bulkStats.active,
        waiting: alertStats.waiting + bulkStats.waiting,
        completed: alertStats.completed + bulkStats.completed,
        failed: alertStats.failed + bulkStats.failed
      }
    }
  }
}

export default AlertQueue
