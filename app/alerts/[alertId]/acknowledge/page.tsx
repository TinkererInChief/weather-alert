import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isRedirectError } from 'next/dist/client/components/redirect'

export default async function AcknowledgeAlertPage({
  params
}: {
  params: { alertId: string }
}) {
  const { alertId } = params

  try {
    // Find the alert
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      redirect('/404')
    }

    // Check if already acknowledged
    if (alert.acknowledged) {
      redirect(`/alerts/${alertId}/already-acknowledged`)
    }

    // Acknowledge the alert
    await prisma.vesselAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        status: 'acknowledged'
      }
    })

    // Redirect to success page
    redirect(`/alerts/${alertId}/acknowledged`)

  } catch (error: any) {
    // Re-throw redirect errors (they're not actually errors!)
    if (isRedirectError(error)) {
      throw error
    }
    
    console.error('[Acknowledge] Error:', error)
    
    // Show error page with details
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">Failed to acknowledge alert. Please try again.</p>
          <div className="bg-red-50 p-4 rounded text-left text-sm">
            <p className="font-mono text-red-800">{error?.message || 'Unknown error'}</p>
            <p className="text-gray-600 mt-2">Alert ID: {alertId}</p>
          </div>
        </div>
      </div>
    )
  }
}
