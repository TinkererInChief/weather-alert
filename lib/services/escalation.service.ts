/**
 * Escalation Service - Multi-step alert escalation with timeout handling
 * 
 * Features:
 * - Process escalation policies step-by-step
 * - Send notifications via multiple channels (SMS, Email, WhatsApp, Voice)
 * - Track acknowledgments and responses
 * - Auto-escalate to next step on timeout
 * - Log all escalation events
 */

import { prisma } from '@/lib/prisma'
import { NotificationService } from './notification-service'

type EscalationStep = {
  stepNumber: number
  waitMinutes: number
  channels: string[]
  contactRoles: string[]
  timeoutMinutes: number
}

type EscalationPolicy = {
  id: string
  name: string
  steps: EscalationStep[]
}

type Contact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  whatsapp: string | null
  notificationChannels?: string[]
  active: boolean
}

export class EscalationService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Initiate escalation for a vessel alert
   */
  async initiateEscalation(alertId: string, dryRun = false): Promise<{
    success: boolean
    escalationStarted: boolean
    stepExecuted: number
    notificationsSent: number
    logs: string[]
    error?: string
  }> {
    const logs: string[] = []
    
    try {
      // Get alert with vessel and policy
      const alert = await prisma.vesselAlert.findUnique({
        where: { id: alertId },
        include: {
          vessel: {
            include: {
              contacts: {
                include: { contact: true },
                orderBy: { priority: 'asc' }
              }
            }
          },
          escalationPolicy: true
        }
      })

      if (!alert) {
        return {
          success: false,
          escalationStarted: false,
          stepExecuted: 0,
          notificationsSent: 0,
          logs,
          error: 'Alert not found'
        }
      }

      if (!alert.escalationPolicy) {
        return {
          success: false,
          escalationStarted: false,
          stepExecuted: 0,
          notificationsSent: 0,
          logs,
          error: 'No escalation policy assigned to alert'
        }
      }

      logs.push(`🚀 Initiating escalation for alert ${alertId}`)
      logs.push(`📋 Policy: ${alert.escalationPolicy.name}`)
      logs.push(`🚢 Vessel: ${alert.vessel.name || alert.vessel.mmsi}`)

      // Mark escalation as started
      if (!dryRun) {
        await prisma.vesselAlert.update({
          where: { id: alertId },
          data: {
            escalationStarted: true,
            escalationStep: 1,
            lastEscalationAt: new Date()
          }
        })
      }

      // Execute first step
      const policy = alert.escalationPolicy as unknown as EscalationPolicy
      const firstStep = policy.steps[0]

      if (!firstStep) {
        return {
          success: false,
          escalationStarted: true,
          stepExecuted: 0,
          notificationsSent: 0,
          logs,
          error: 'No steps defined in escalation policy'
        }
      }

      // Execute step 1 (step 0 means immediate, so we execute it now)
      const result = await this.executeStep(
        alertId,
        alert,
        firstStep,
        alert.vessel.contacts.map((vc: any) => vc.contact as Contact),
        dryRun
      )

      logs.push(...result.logs)

      return {
        success: result.success,
        escalationStarted: true,
        stepExecuted: 1,
        notificationsSent: result.notificationsSent,
        logs,
        error: result.error
      }
    } catch (error: any) {
      logs.push(`❌ Error: ${error.message}`)
      return {
        success: false,
        escalationStarted: false,
        stepExecuted: 0,
        notificationsSent: 0,
        logs,
        error: error.message
      }
    }
  }

  /**
   * Execute a specific escalation step
   */
  private async executeStep(
    alertId: string,
    alert: any,
    step: EscalationStep,
    allContacts: Contact[],
    dryRun: boolean
  ): Promise<{
    success: boolean
    notificationsSent: number
    logs: string[]
    error?: string
  }> {
    const logs: string[] = []
    let notificationsSent = 0

    try {
      logs.push(`\n📍 Executing Step ${step.stepNumber}`)
      logs.push(`   Wait: ${step.waitMinutes} minutes`)
      logs.push(`   Channels: ${step.channels.join(', ')}`)
      logs.push(`   Target Roles: ${step.contactRoles.join(', ')}`)

      // Filter contacts by role
      const targetContacts = allContacts.filter(contact => 
        step.contactRoles.includes((contact as any).role)
      )

      if (targetContacts.length === 0) {
        logs.push(`   ⚠️  No contacts found matching roles: ${step.contactRoles.join(', ')}`)
        return { success: true, notificationsSent: 0, logs }
      }

      logs.push(`   👥 Found ${targetContacts.length} contacts to notify`)

      // Send notifications via each channel
      for (const contact of targetContacts) {
        for (const channel of step.channels) {
          const channelLower = channel.toLowerCase()

          // Skip if contact doesn't have this channel
          if (channelLower === 'sms' && !contact.phone) continue
          if (channelLower === 'email' && !contact.email) continue
          if (channelLower === 'whatsapp' && !contact.whatsapp) continue
          if (channelLower === 'voice' && !contact.phone) continue

          logs.push(`   📤 Sending ${channel} to ${contact.name} (${contact.phone || contact.email})`)

          if (dryRun) {
            logs.push(`      [DRY RUN] Would send ${channel} notification`)
            notificationsSent++
            
            // Create log entry even in dry run
            await prisma.escalationLog.create({
              data: {
                vesselAlertId: alertId,
                step: step.stepNumber,
                contactId: contact.id,
                channel: channel.toUpperCase(),
                status: 'dry_run',
                attemptedAt: new Date(),
                metadata: { dryRun: true }
              }
            })
          } else {
            // Actually send notification
            const result = await this.sendNotification(
              contact,
              channelLower as 'sms' | 'email' | 'whatsapp' | 'voice',
              alert,
              step
            )

            if ('success' in result && result.success) {
              const msgId = 'messageId' in result ? result.messageId : undefined
              const provider = 'provider' in result ? result.provider : undefined
              
              logs.push(`      ✅ Sent successfully${msgId ? ` (ID: ${msgId})` : ''}`)
              notificationsSent++

              // Create escalation log
              await prisma.escalationLog.create({
                data: {
                  vesselAlertId: alertId,
                  step: step.stepNumber,
                  contactId: contact.id,
                  channel: channel.toUpperCase(),
                  status: 'sent',
                  attemptedAt: new Date(),
                  deliveredAt: new Date(),
                  metadata: {
                    messageId: msgId || 'n/a',
                    provider: provider || 'unknown'
                  }
                }
              })
            } else {
              const errorMsg = 'error' in result ? result.error : 'Unknown error'
              logs.push(`      ❌ Failed: ${errorMsg}`)
              
              // Log failure
              await prisma.escalationLog.create({
                data: {
                  vesselAlertId: alertId,
                  step: step.stepNumber,
                  contactId: contact.id,
                  channel: channel.toUpperCase(),
                  status: 'failed',
                  attemptedAt: new Date(),
                  errorMessage: errorMsg || 'Unknown error',
                  metadata: {}
                }
              })
            }
          }

          // Small delay between sends to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      return { success: true, notificationsSent, logs }
    } catch (error: any) {
      logs.push(`❌ Error executing step: ${error.message}`)
      return { success: false, notificationsSent, logs, error: error.message }
    }
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(
    contact: Contact,
    channel: 'sms' | 'email' | 'whatsapp' | 'voice',
    alert: any,
    step: EscalationStep
  ) {
    const message = this.buildMessage(alert, step)

    try {
      const result = await this.notificationService.sendNotification({
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone || '',
          email: contact.email,
          whatsapp: contact.whatsapp,
          notificationChannels: contact.notificationChannels || [],
          active: contact.active
        },
        channel,
        templateData: {
          type: alert.type,
          severity: this.mapSeverity(alert.severity),
          data: {
            vesselName: alert.vessel.name || alert.vessel.mmsi,
            vesselMMSI: alert.vessel.mmsi,
            eventType: alert.eventType,
            severity: alert.severity,
            message: message,
            recommendation: alert.recommendation,
            distance: alert.distance,
            waveHeight: alert.waveHeight,
            tsunamiETA: alert.tsunamiETA,
            acknowledgeLink: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert.id}/acknowledge`
          }
        },
        alertJobId: alert.id
      })

      return result
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Build notification message
   */
  private buildMessage(alert: any, step: EscalationStep): string {
    const vesselName = alert.vessel.name || alert.vessel.mmsi
    const eventType = alert.eventType || alert.type
    const severity = alert.severity?.toUpperCase() || 'UNKNOWN'

    let message = `🚨 ${severity} ALERT - ${eventType}\n\n`
    message += `Vessel: ${vesselName}\n`
    
    if (alert.distance) {
      message += `Distance: ${Math.round(alert.distance)} km\n`
    }
    
    if (alert.waveHeight) {
      message += `Wave Height: ${alert.waveHeight}m\n`
    }
    
    if (alert.tsunamiETA) {
      message += `ETA: ${alert.tsunamiETA} minutes\n`
    }

    message += `\n${alert.recommendation || alert.message}\n`
    message += `\n⚠️ ESCALATION STEP ${step.stepNumber}`
    
    if (step.timeoutMinutes > 0) {
      message += `\n⏱️ Please acknowledge within ${step.timeoutMinutes} minutes`
    }

    return message
  }

  /**
   * Map severity string to number
   */
  private mapSeverity(severity: string): number {
    const map: Record<string, number> = {
      critical: 4,
      high: 3,
      moderate: 2,
      low: 1
    }
    return map[severity?.toLowerCase()] || 2
  }

  /**
   * Check for acknowledgment and stop escalation if acknowledged
   */
  async checkAcknowledgment(alertId: string): Promise<boolean> {
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId },
      select: { acknowledged: true }
    })

    return alert?.acknowledged || false
  }

  /**
   * Escalate to next step (called by background job after timeout)
   */
  async escalateToNextStep(alertId: string): Promise<{
    success: boolean
    stepExecuted: number
    completed: boolean
    logs: string[]
  }> {
    const logs: string[] = []

    try {
      const alert = await prisma.vesselAlert.findUnique({
        where: { id: alertId },
        include: {
          vessel: {
            include: {
              contacts: {
                include: { contact: true },
                orderBy: { priority: 'asc' }
              }
            }
          },
          escalationPolicy: true
        }
      })

      if (!alert || !alert.escalationPolicy) {
        return { success: false, stepExecuted: 0, completed: false, logs }
      }

      // Check if already acknowledged
      if (alert.acknowledged) {
        logs.push('✅ Alert already acknowledged, stopping escalation')
        return { success: true, stepExecuted: alert.escalationStep, completed: true, logs }
      }

      const policy = alert.escalationPolicy as unknown as EscalationPolicy
      const nextStepNumber = alert.escalationStep + 1
      const nextStep = policy.steps.find(s => s.stepNumber === nextStepNumber)

      if (!nextStep) {
        logs.push('⚠️ No more escalation steps, escalation complete')
        return { success: true, stepExecuted: alert.escalationStep, completed: true, logs }
      }

      logs.push(`⏫ Escalating to step ${nextStepNumber}`)

      // Update alert
      await prisma.vesselAlert.update({
        where: { id: alertId },
        data: {
          escalationStep: nextStepNumber,
          lastEscalationAt: new Date()
        }
      })

      // Execute next step
      const result = await this.executeStep(
        alertId,
        alert,
        nextStep,
        alert.vessel.contacts.map((vc: any) => vc.contact as Contact),
        false // Not a dry run
      )

      logs.push(...result.logs)

      return {
        success: result.success,
        stepExecuted: nextStepNumber,
        completed: nextStepNumber >= policy.steps.length,
        logs
      }
    } catch (error: any) {
      logs.push(`❌ Error: ${error.message}`)
      return { success: false, stepExecuted: 0, completed: false, logs }
    }
  }
}

export const escalationService = new EscalationService()
