import useSWR, { SWRConfiguration } from 'swr'

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  
  return res.json()
}

// Default SWR configuration for the app
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // Dedupe requests within 10s
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
  keepPreviousData: true, // Keep showing old data while revalidating
}

// General stats hook
export function useStats(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/stats',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Monitoring status hook
export function useMonitoringStatus(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/monitoring',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Tsunami data hook
export function useTsunamiData(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/tsunami',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // 1 minute
      ...config,
    }
  )
}

// Tsunami monitoring hook
export function useTsunamiMonitoring(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/tsunami/monitor',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Alert history hook
export function useAlertHistory(params: {
  startDate?: string
  minMagnitude?: string
  limit?: string
  coordsOnly?: string
  distinctByEarthquake?: string
}, config: SWRConfiguration = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][]
  )
  
  return useSWR(
    `/api/alerts/history?${searchParams}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // 1 minute
      ...config,
    }
  )
}

// Alert stats hook
export function useAlertStats(days = 30, config: SWRConfiguration = {}) {
  return useSWR(
    `/api/alerts/stats?days=${days}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000,
      ...config,
    }
  )
}

// Health check hook
export function useHealthCheck(detailed = true, config: SWRConfiguration = {}) {
  return useSWR(
    `/api/health?detailed=${detailed}&record=true`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Delivery logs hook
export function useDeliveryLogs(params: {
  page?: number
  limit?: number
  channel?: string
  status?: string
}, config: SWRConfiguration = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.append('page', String(params.page))
  if (params.limit) searchParams.append('limit', String(params.limit))
  if (params.channel) searchParams.append('channel', params.channel)
  if (params.status) searchParams.append('status', params.status)
  
  return useSWR(
    `/api/delivery/logs?${searchParams}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Delivery stats hook
export function useDeliveryStats(range = '30d', config: SWRConfiguration = {}) {
  return useSWR(
    `/api/delivery/stats?range=${range}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Contacts hook
export function useContacts(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/contacts',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // 1 minute (contacts change less frequently)
      ...config,
    }
  )
}

// Database stats hook
export function useDatabaseStats(config: SWRConfiguration = {}) {
  return useSWR(
    '/api/database/stats-cached',
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000,
      ...config,
    }
  )
}

// Vessel alerts hook
export function useVesselAlerts(params: {
  page?: number
  limit?: number
  severity?: string
  status?: string
  acknowledged?: string
  eventType?: string
}, config: SWRConfiguration = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, String(value))
  })
  
  return useSWR(
    `/api/vessel-alerts?${searchParams}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000,
      ...config,
    }
  )
}

// Audit logs hook
export function useAuditLogs(params: {
  page?: number
  limit?: number
  action?: string
  user?: string
  startDate?: string
  endDate?: string
}, config: SWRConfiguration = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, String(value))
  })
  
  return useSWR(
    `/api/audit-logs?${searchParams}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000,
      ...config,
    }
  )
}
