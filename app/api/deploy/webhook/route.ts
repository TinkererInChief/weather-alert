import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Railway Deployment Webhook Handler
 * 
 * Configure in Railway:
 * 1. Go to Project Settings → Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/deploy/webhook
 * 3. Select events: deployment.success, deployment.failed
 * 
 * This will create deploy events in your timeline
 */

type RailwayWebhook = {
  type: 'deployment.success' | 'deployment.failed' | 'deployment.started'
  deployment: {
    id: string
    status: string
    creator: string
    meta: {
      commitHash?: string
      commitMessage?: string
    }
  }
  timestamp: string
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-railway-signature')
    const webhookSecret = process.env.RAILWAY_WEBHOOK_SECRET
    
    if (webhookSecret && signature) {
      // Add signature verification logic here
      // const isValid = verifySignature(body, signature, webhookSecret)
      // if (!isValid) return Response.json({ error: 'invalid_signature' }, { status: 401 })
    }

    const webhook: RailwayWebhook = await req.json()
    
    const eventType = webhook.type === 'deployment.success' ? 'deploy' : 
                      webhook.type === 'deployment.failed' ? 'error' : 'deploy'
    
    const severity = webhook.type === 'deployment.failed' ? 'critical' : 
                     webhook.type === 'deployment.started' ? 'warning' : 'healthy'
    
    const message = webhook.type === 'deployment.success'
      ? `Deployment completed successfully${webhook.deployment.meta?.commitMessage ? `: ${webhook.deployment.meta.commitMessage}` : ''}`
      : webhook.type === 'deployment.failed'
      ? `Deployment failed`
      : `Deployment started`

    // Create deployment event
    await (prisma as any).healthEvent.create({
      data: {
        eventType,
        severity,
        message,
        metadata: {
          deploymentId: webhook.deployment.id,
          commitHash: webhook.deployment.meta?.commitHash,
          commitMessage: webhook.deployment.meta?.commitMessage,
          creator: webhook.deployment.creator,
          webhookType: webhook.type,
        },
        createdAt: new Date(webhook.timestamp),
      },
    })
    
    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Deploy webhook error', error)
    return Response.json({ error: 'webhook_failed' }, { status: 500 })
  }
}
