'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, Shield } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Shield className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-white font-medium">Loading Emergency Alert System...</span>
            </div>
            <p className="text-slate-300 text-sm">Verifying authentication</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Shield className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="text-white font-medium">Redirecting to login...</span>
            <p className="text-slate-300 text-sm">Authentication required</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}