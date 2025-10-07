'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requiredRole?: Role
  requiredPermissions?: Permission[]
}

export default function AuthGuard({ 
  children,
  requireAdmin,
  requiredRole,
  requiredPermissions
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/login')
      return
    }

    const user = session.user as any

    // Check admin requirement
    if (requireAdmin && user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      router.push('/dashboard')
      return
    }

    // Check specific role requirement
    if (requiredRole && user.role !== requiredRole) {
      router.push('/dashboard')
      return
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(perm =>
        hasPermission(user.role as Role, perm)
      )
      if (!hasAllPermissions) {
        router.push('/dashboard')
        return
      }
    }
  }, [session, status, requireAdmin, requiredRole, requiredPermissions, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
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

  // Check authorization after authentication
  const user = session.user as any

  // Show access denied if admin required but user is not admin
  if (requireAdmin && user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-slate-300 text-sm">Administrator privileges required</p>
            <p className="text-slate-400 text-xs">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check specific role requirement
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-slate-300 text-sm">Insufficient role permissions</p>
            <p className="text-slate-400 text-xs">Required role: {requiredRole}</p>
          </div>
        </div>
      </div>
    )
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm =>
      hasPermission(user.role as Role, perm)
    )
    if (!hasAllPermissions) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Access Denied</h2>
              <p className="text-slate-300 text-sm">Insufficient permissions</p>
              <p className="text-slate-400 text-xs">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
