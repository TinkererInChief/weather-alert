'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'

/**
 * User Management Redirect
 * 
 * User Management has been consolidated into the Admin Panel.
 * This page redirects users to /dashboard/admin for a unified admin experience.
 */
export default function UsersPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Admin Panel after a brief moment
    const timer = setTimeout(() => {
      router.push('/dashboard/admin')
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl mx-auto animate-pulse">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Redirecting to Admin Panel</h2>
          <p className="text-slate-600 max-w-md">
            User Management is now part of the unified Admin Panel for a better experience.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-blue-600 font-medium">
          <span>Taking you there now</span>
          <ArrowRight className="h-5 w-5 animate-bounce" style={{ animationDirection: 'alternate' }} />
        </div>

        <button
          onClick={() => router.push('/dashboard/admin')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          Go Now
        </button>
      </div>
    </div>
  )
}
