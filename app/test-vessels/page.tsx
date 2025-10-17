'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Import VesselMap dynamically to avoid SSR issues with Leaflet
const VesselMap = dynamic(() => import('@/components/vessels/VesselMap'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">Loading map...</div>
})

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  heading: number | null
  destination: string | null
  activeAlertCount: number
}

export default function TestVesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<any>(null)

  const startTracking = async () => {
    try {
      const response = await fetch('/api/vessel-tracking/start', {
        method: 'POST'
      })
      const data = await response.json()
      console.log('Tracking started:', data)
      setTrackingStatus(data.status)
      
      if (data.success) {
        alert('✅ Vessel tracking started! Wait 1-2 minutes for data to appear.')
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (err) {
      console.error('Error starting tracking:', err)
      alert('Error starting tracking. Check console.')
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/vessel-tracking/start')
      const data = await response.json()
      
      if (data.success) {
        setTrackingStatus(data.status)
        console.log('Tracking status:', data.status)
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const fetchVessels = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/vessel-tracking/vessels?limit=200')
      const data = await response.json()
      
      if (data.success) {
        setVessels(data.vessels)
        console.log(`✅ Loaded ${data.count} vessels`)
      } else {
        setError(data.error || 'Failed to fetch vessels')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    checkStatus()
    fetchVessels()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVessels, 30000)
    return () => clearInterval(interval)
  }, [])

  const vesselsBySource = vessels.reduce((acc, v: any) => {
    const source = v.dataSource || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🚢 Vessel Tracking Test
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? 'Loading...' : `${vessels.length} vessels tracked`}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={startTracking}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                ▶ Start Tracking
              </button>
              
              <button
                onClick={checkStatus}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
              >
                📊 Status
              </button>
              
              <button
                onClick={fetchVessels}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Status Bar */}
          {trackingStatus && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  AISStream.io
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {trackingStatus.services?.aisstream?.status === 'active' ? (
                    <span className="text-green-600 dark:text-green-400">● Active</span>
                  ) : (
                    <span className="text-gray-400">○ Inactive</span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">
                    ({trackingStatus.services?.aisstream?.coverage})
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                  OpenShipData
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {trackingStatus.services?.openshipdata?.status === 'active' ? (
                    <span className="text-green-600 dark:text-green-400">● Active</span>
                  ) : (
                    <span className="text-gray-400">○ Inactive</span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">
                    ({trackingStatus.services?.openshipdata?.coverage})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources */}
          {vessels.length > 0 && (
            <div className="flex gap-3 text-xs">
              {Object.entries(vesselsBySource).map(([source, count]) => (
                <div key={source} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <span className="font-semibold">{source}:</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="m-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">❌ Error: {error}</p>
        </div>
      )}
      
      <div className="h-[calc(100vh-200px)]">
        {vessels.length > 0 ? (
          <VesselMap vessels={vessels} alerts={[]} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="text-6xl mb-4">🚢</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {loading ? 'Loading vessels...' : 'No vessels found'}
              </h2>
              {!loading && (
                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                  <p>Click <strong>"Start Tracking"</strong> to begin</p>
                  <p className="text-sm">Wait 1-2 minutes for vessels to appear</p>
                  <p className="text-sm">Then click <strong>"Refresh"</strong></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
