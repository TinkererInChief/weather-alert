import { prisma } from '@/lib/prisma'

export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low'

export type ContactWithMetadata = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  role: string
  priority: number
  notifyOn: string[]
  notificationChannels: any
  language: string
  timezone: string
}

export class ContactHierarchyService {
  private static instance: ContactHierarchyService

  static getInstance() {
    if (!ContactHierarchyService.instance) {
      ContactHierarchyService.instance = new ContactHierarchyService()
    }
    return ContactHierarchyService.instance
  }

  /**
   * Get vessel contacts sorted by priority for a specific severity level
   */
  async getVesselContacts(
    vesselId: string,
    severity: AlertSeverity
  ): Promise<ContactWithMetadata[]> {
    // Get vessel-specific contacts that should be notified for this severity
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        notifyOn: {
          has: severity
        }
      },
      include: {
        contact: true
      },
      orderBy: [
        { priority: 'asc' },  // Primary first (priority 1, 2, 3...)
        { role: 'asc' }       // Then by role hierarchy
      ]
    })

    // Map to ContactWithMetadata format
    return vesselContacts.map(vc => ({
      id: vc.contact.id,
      name: vc.contact.name,
      email: vc.contact.email,
      phone: vc.contact.phone,
      whatsapp: vc.contact.whatsapp,
      role: vc.role,
      priority: vc.priority,
      notifyOn: vc.notifyOn,
      notificationChannels: vc.contact.notificationChannels,
      language: vc.contact.language,
      timezone: vc.contact.timezone
    }))
  }

  /**
   * Get all contacts for a vessel (regardless of severity)
   */
  async getAllVesselContacts(vesselId: string): Promise<ContactWithMetadata[]> {
    const vesselContacts = await prisma.vesselContact.findMany({
      where: { vesselId },
      include: {
        contact: true
      },
      orderBy: [
        { priority: 'asc' },
        { role: 'asc' }
      ]
    })

    return vesselContacts.map(vc => ({
      id: vc.contact.id,
      name: vc.contact.name,
      email: vc.contact.email,
      phone: vc.contact.phone,
      whatsapp: vc.contact.whatsapp,
      role: vc.role,
      priority: vc.priority,
      notifyOn: vc.notifyOn,
      notificationChannels: vc.contact.notificationChannels,
      language: vc.contact.language,
      timezone: vc.contact.timezone
    }))
  }

  /**
   * Get primary contact for a vessel
   */
  async getPrimaryContact(vesselId: string): Promise<ContactWithMetadata | null> {
    const vesselContact = await prisma.vesselContact.findFirst({
      where: { vesselId },
      include: {
        contact: true
      },
      orderBy: { priority: 'asc' }
    })

    if (!vesselContact) return null

    return {
      id: vesselContact.contact.id,
      name: vesselContact.contact.name,
      email: vesselContact.contact.email,
      phone: vesselContact.contact.phone,
      whatsapp: vesselContact.contact.whatsapp,
      role: vesselContact.role,
      priority: vesselContact.priority,
      notifyOn: vesselContact.notifyOn,
      notificationChannels: vesselContact.contact.notificationChannels,
      language: vesselContact.contact.language,
      timezone: vesselContact.contact.timezone
    }
  }

  /**
   * Get contacts by role
   */
  async getContactsByRole(vesselId: string, role: string): Promise<ContactWithMetadata[]> {
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        role: role as any
      },
      include: {
        contact: true
      },
      orderBy: { priority: 'asc' }
    })

    return vesselContacts.map(vc => ({
      id: vc.contact.id,
      name: vc.contact.name,
      email: vc.contact.email,
      phone: vc.contact.phone,
      whatsapp: vc.contact.whatsapp,
      role: vc.role,
      priority: vc.priority,
      notifyOn: vc.notifyOn,
      notificationChannels: vc.contact.notificationChannels,
      language: vc.contact.language,
      timezone: vc.contact.timezone
    }))
  }

  /**
   * Update contact priorities (for reordering)
   */
  async updateContactPriorities(
    vesselId: string,
    priorities: Array<{ contactId: string; priority: number }>
  ): Promise<void> {
    await Promise.all(
      priorities.map(({ contactId, priority }) =>
        prisma.vesselContact.updateMany({
          where: {
            vesselId,
            contactId
          },
          data: { priority }
        })
      )
    )
  }
}
