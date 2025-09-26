import { Contact, AlertLog } from '@/types/earthquake'
import { prisma } from './prisma'
// Full contact shape including email and whatsapp fields
type PrismaContactFull = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  language: string
  timezone: string
  elevationMeters: number | null
  notificationChannels: unknown
  notificationSettings: unknown
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// Row shape for alert_logs raw queries
type AlertLogRow = {
  id: string
  earthquakeId: string
  magnitude: number
  location: string
  timestamp: Date
  contactsNotified: number
  success: boolean
  errorMessage: string | null
}

class Database {
  constructor() {
    if (process.env.NODE_ENV === 'development' && process.env.DATABASE_URL) {
      // Only initialize test data when a database is available to avoid build-time Prisma errors
      this.initializeTestData().catch((err) => {
        console.warn('⚠️ Skipping test data initialization:', err)
      })
    }
  }

  private async initializeTestData() {
    try {
      // Check if test contacts already exist
      const existingContacts = await prisma.contact.count()
      
      if (existingContacts === 0) {
        await prisma.contact.upsert({
          where: { phone: '+1234567890' },
          update: {},
          create: {
            name: 'Emergency Contact 1',
            phone: '+1234567890', // Replace with your test number
            active: true
          }
        })
        
        await prisma.contact.upsert({
          where: { phone: '+0987654321' },
          update: {},
          create: {
            name: 'Emergency Contact 2', 
            phone: '+0987654321', // Replace with another test number
            active: true
          }
        })
        console.log('✅ Test contacts initialized')
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize test data:', error)
    }
  }

  // Contact Management
  async getAllContacts(): Promise<any[]> {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    }) as PrismaContactFull[]
    
    return contacts.map((contact: PrismaContactFull) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      whatsapp: contact.whatsapp,
      active: contact.active,
      createdAt: contact.createdAt
    }))
  }

  async getActiveContacts(): Promise<any[]> {
    const contacts = await prisma.contact.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    }) as PrismaContactFull[]
    
    return contacts.map((contact: PrismaContactFull) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      whatsapp: contact.whatsapp,
      language: contact.language,
      notificationChannels: contact.notificationChannels,
      notificationSettings: contact.notificationSettings,
      active: contact.active,
      createdAt: contact.createdAt
    }))
  }

  async addContact(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> {
    const newContact = await prisma.contact.create({
      data: {
        name: contact.name,
        phone: contact.phone || '',
        active: contact.active
      }
    })
    
    return {
      id: newContact.id,
      name: newContact.name,
      phone: newContact.phone || '',
      active: newContact.active,
      createdAt: newContact.createdAt
    }
  }

  async updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>): Promise<Contact | null> {
    try {
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: updates
      })
      
      return {
        id: updatedContact.id,
        name: updatedContact.name,
        phone: updatedContact.phone || '',
        active: updatedContact.active,
        createdAt: updatedContact.createdAt
      }
    } catch (error) {
      return null
    }
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      await prisma.contact.delete({
        where: { id }
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Alert Log Management
  async addAlertLog(log: Omit<AlertLog, 'id'>): Promise<AlertLog> {
    // Use Prisma create instead of raw SQL to ensure proper ID generation
    const newLog = await prisma.alertLog.create({
      data: {
        earthquakeId: log.earthquakeId,
        magnitude: log.magnitude,
        location: log.location,
        timestamp: log.timestamp,
        contactsNotified: log.contactsNotified,
        success: log.success,
        errorMessage: log.errorMessage ?? null
      }
    })
  
    return {
      id: newLog.id,
      earthquakeId: newLog.earthquakeId,
      magnitude: newLog.magnitude,
      location: newLog.location,
      timestamp: newLog.timestamp,
      contactsNotified: newLog.contactsNotified,
      success: newLog.success,
      errorMessage: newLog.errorMessage ?? undefined
    }
  }

  async getAlertLogs(): Promise<AlertLog[]> {
    const logs = await prisma.$queryRaw<AlertLogRow[]>`
      SELECT id, "earthquakeId", magnitude, location, timestamp,
             "contactsNotified", success, "errorMessage"
      FROM "alert_logs"
      ORDER BY timestamp DESC
    `

    return logs.map((log: AlertLogRow) => ({
      id: log.id,
      earthquakeId: log.earthquakeId,
      magnitude: log.magnitude,
      location: log.location,
      timestamp: log.timestamp,
      contactsNotified: log.contactsNotified,
      success: log.success,
      errorMessage: log.errorMessage ?? undefined
    }))
  }

  async getRecentAlertLogs(limit: number = 10): Promise<AlertLog[]> {
    const logs = await prisma.$queryRaw<AlertLogRow[]>`
      SELECT id, "earthquakeId", magnitude, location, timestamp,
             "contactsNotified", success, "errorMessage"
      FROM "alert_logs"
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `

    return logs.map((log: AlertLogRow) => ({
      id: log.id,
      earthquakeId: log.earthquakeId,
      magnitude: log.magnitude,
      location: log.location,
      timestamp: log.timestamp,
      contactsNotified: log.contactsNotified,
      success: log.success,
      errorMessage: log.errorMessage ?? undefined
    }))
  }

  // Get detailed alert logs with notification breakdown
  async getDetailedAlertLogs(limit: number = 20): Promise<any[]> {
    try {
      // First get the basic alert logs
      const logs = await prisma.$queryRaw<AlertLogRow[]>`
        SELECT id, "earthquakeId", magnitude, location, timestamp,
               "contactsNotified", success, "errorMessage"
        FROM "alert_logs"
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `

      // Build detailed notifications using DeliveryLog anchored by AlertJob.metadata->>sourceId
      const results: any[] = []

      for (const log of logs) {
        // Fetch delivery logs for alert jobs created for this earthquakeId
        const deliveries = await prisma.$queryRaw<Array<{
          id: string
          contactId: string
          contactName: string
          phone: string | null
          email: string | null
          whatsapp: string | null
          channel: string
          status: string
          providerMessageId: string | null
          errorMessage: string | null
          createdAt: Date
        }>>`
          WITH aj AS (
            SELECT id FROM "alert_jobs"
            WHERE metadata ->> 'sourceId' = ${log.earthquakeId}
            ORDER BY "createdAt" DESC
            LIMIT 5
          )
          SELECT dl.id,
                 dl."contactId",
                 c.name AS "contactName",
                 c.phone,
                 c.email,
                 c.whatsapp,
                 dl.channel,
                 dl.status,
                 dl."providerMessageId",
                 dl."errorMessage",
                 dl."createdAt"
          FROM "delivery_logs" dl
          JOIN aj ON dl."alertJobId" = aj.id
          JOIN "contacts" c ON c.id = dl."contactId"
          ORDER BY dl."createdAt" DESC
        `

        // Group deliveries by contact
        const byContact: Record<string, {
          contactId: string
          contactName: string
          contactPhone?: string
          contactEmail?: string
          contactWhatsapp?: string
          channels: Array<{
            channel: 'sms' | 'email' | 'whatsapp' | 'voice'
            success: boolean
            messageId?: string
            error?: string
            timestamp: string
          }>
          totalChannels: number
          successfulChannels: number
        }> = {}

        for (const d of deliveries) {
          const key = d.contactId
          if (!byContact[key]) {
            byContact[key] = {
              contactId: d.contactId,
              contactName: d.contactName,
              contactPhone: d.phone ?? undefined,
              contactEmail: d.email ?? undefined,
              contactWhatsapp: d.whatsapp ?? undefined,
              channels: [],
              totalChannels: 0,
              successfulChannels: 0,
            }
          }
          const success = ['sent', 'delivered', 'queued', 'completed'].includes(d.status)
          byContact[key].channels.push({
            channel: d.channel as any,
            success,
            messageId: d.providerMessageId ?? undefined,
            error: d.errorMessage ?? undefined,
            timestamp: d.createdAt.toISOString(),
          })
          byContact[key].totalChannels += 1
          if (success) byContact[key].successfulChannels += 1
        }

        const notifications = Object.values(byContact)

        results.push({
          id: log.id,
          earthquakeId: log.earthquakeId,
          magnitude: log.magnitude,
          location: log.location,
          timestamp: log.timestamp.toISOString(),
          contactsNotified: log.contactsNotified,
          success: log.success,
          errorMessage: log.errorMessage ?? undefined,
          notifications,
        })
      }

      return results
    } catch (error) {
      console.error('Error fetching detailed alert logs:', error)
      return []
    }
  }

  // Parse notification details from error messages (temporary solution)
  private parseNotificationDetails(errorMessage: string): any[] {
    if (!errorMessage) return []

    const notifications: any[] = []
    
    // Parse error messages like "email to MP: No email address provided; sms to Yash: Success"
    const parts = errorMessage.split(';')
    const contactResults: { [key: string]: any } = {}

    for (const part of parts) {
      const trimmed = part.trim()
      const match = trimmed.match(/(\w+) to ([^:]+): (.+)/)
      
      if (match) {
        const [, channel, contactName, result] = match
        
        if (!contactResults[contactName]) {
          contactResults[contactName] = {
            contactName: contactName.trim(),
            channels: [],
            totalChannels: 0,
            successfulChannels: 0
          }
        }

        const success = !result.toLowerCase().includes('error') && 
                       !result.toLowerCase().includes('failed') && 
                       !result.toLowerCase().includes('not') &&
                       result.toLowerCase() !== 'unknown error'

        contactResults[contactName].channels.push({
          channel,
          success,
          error: success ? undefined : result,
          timestamp: new Date().toISOString()
        })

        contactResults[contactName].totalChannels++
        if (success) {
          contactResults[contactName].successfulChannels++
        }
      }
    }

    return Object.values(contactResults)
  }

  // Earthquake Cache Management
  async cacheEarthquake(earthquake: {
    earthquakeId: string
    magnitude: number
    location: string
    latitude?: number
    longitude?: number
    depth?: number
    timestamp: Date
    processed?: boolean
  }) {
    return await prisma.earthquakeCache.upsert({
      where: { earthquakeId: earthquake.earthquakeId },
      update: {
        processed: earthquake.processed ?? false
      },
      create: earthquake
    })
  }

  async getProcessedEarthquakeIds(): Promise<string[]> {
    const processed = await prisma.earthquakeCache.findMany({
      where: { processed: true },
      select: { earthquakeId: true }
    })
    
    return processed.map((e: { earthquakeId: string }) => e.earthquakeId)
  }

  async markEarthquakeProcessed(earthquakeId: string): Promise<void> {
    await prisma.earthquakeCache.upsert({
      where: { earthquakeId },
      update: { processed: true },
      create: {
        earthquakeId,
        magnitude: 0,
        location: '',
        timestamp: new Date(),
        processed: true
      }
    })
  }

  // Statistics
  async getStats() {
    const [totalContacts, activeContacts, totalAlerts, successfulAlerts] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { active: true } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint as count FROM "alert_logs"`,
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint as count FROM "alert_logs" WHERE success = true`
    ])

    // Unwrap counts from raw queries
    const totalAlertsCount = Array.isArray(totalAlerts) ? Number(totalAlerts[0].count) : Number(totalAlerts)
    const successfulAlertsCount = Array.isArray(successfulAlerts) ? Number(successfulAlerts[0].count) : Number(successfulAlerts)

    const recentAlertsRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count FROM "alert_logs"
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `
    const recentAlerts = recentAlertsRows.length > 0 ? Number(recentAlertsRows[0].count) : 0

    return {
      totalContacts,
      activeContacts,
      totalAlerts: totalAlertsCount,
      successfulAlerts: successfulAlertsCount,
      recentAlerts,
      successRate: totalAlertsCount > 0 ? ((successfulAlertsCount / totalAlertsCount) * 100).toFixed(1) : '0'
    }
  }
}

// Export singleton instance
export const db = new Database()
