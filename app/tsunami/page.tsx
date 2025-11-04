'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect /tsunami to /dashboard/tsunami
 * All tsunami monitoring now requires authentication and is in the dashboard
 */
export default function TsunamiRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/tsunami')
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
 * Tsunami monitoring page functionality has been moved to /dashboard/tsunami
 * This file now only serves as a redirect
 */
