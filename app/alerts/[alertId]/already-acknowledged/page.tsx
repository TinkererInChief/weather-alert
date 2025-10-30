import { Metadata } from 'next'
import Link from 'next/link'
import { Info } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Alert Already Acknowledged',
  description: 'This alert was already acknowledged'
}

export default function AlertAlreadyAcknowledgedPage({
  params
}: {
  params: { alertId: string }
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <Info className="w-20 h-20 text-blue-500 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Already Acknowledged
        </h1>
        
        <p className="text-gray-600 mb-6">
          This alert has already been acknowledged. No further action is required.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Alert ID:</strong> {params.alertId}
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
