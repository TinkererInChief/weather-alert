import { useEffect, useState } from 'react'

type DartStatus = {
  active: number
  total: number
  health: number
  lastUpdate: string
}

type UseDartStatusReturn = {
  status: DartStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDartStatus(): UseDartStatusReturn {
  const [status, setStatus] = useState<DartStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchDartStatus = async () => {
    try {
      setError(null)
      const response = await fetch('/api/dart/status')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch DART status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.status) {
        setStatus(data.status)
      } else {
        throw new Error(data.error || 'Invalid response from DART status API')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to fetch DART status:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDartStatus()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDartStatus, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  return { 
    status, 
    loading, 
    error,
    refresh: fetchDartStatus 
  }
}
