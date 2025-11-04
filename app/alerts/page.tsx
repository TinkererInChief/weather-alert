'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect /alerts to /dashboard/alerts
 * All alert monitoring now consolidated in the dashboard
 */
export default function AlertsRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/alerts')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

/*
 * LEGACY CODE REMOVED
 * Alert history page functionality has been moved to /dashboard/alerts
 * This file now only serves as a redirect
 */
