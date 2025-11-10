import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { formatDualTime } from '@/lib/time-display'

export const metadata: Metadata = {
  title: 'Alert Acknowledged',
  description: 'Alert has been acknowledged'
}

export default function AlertAcknowledgedPage({
  params
}: {
  params: { alertId: string }
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Alert Acknowledged
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for acknowledging this alert. The alert status has been updated.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            <strong>Alert ID:</strong> {params.alertId}
          </p>
          <p className="text-sm text-green-800 mt-1">
            <strong>Time:</strong> {new Date().toLocaleString()}
          </p>
        </div>

        <Link 
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
