import { useSession } from 'next-auth/react'
import { Role, Permission, hasPermission, hasAnyPermission, hasAllPermissions, getRolePermissions } from '@/lib/rbac/roles'

/**
 * Client-side authorization hook
 */
export function useAuthorization() {
  const { data: session, status } = useSession()
  
  // Extract role from session (default to VIEWER if not set)
  const role = (session?.user as any)?.role as Role || Role.VIEWER
  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  
  /**
   * Check if user has a specific permission
   */
  const can = (permission: Permission): boolean => {
    if (!isAuthenticated) return false
    return hasPermission(role, permission)
  }
  
  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!isAuthenticated) return false
    return hasAnyPermission(role, permissions)
  }
  
  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!isAuthenticated) return false
    return hasAllPermissions(role, permissions)
  }
  
  /**
   * Check if user has a specific role
   */
  const hasRole = (requiredRole: Role): boolean => {
    if (!isAuthenticated) return false
    return role === requiredRole
  }
  
  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: Role[]): boolean => {
    if (!isAuthenticated) return false
    return roles.includes(role)
  }
  
  /**
   * Get all permissions for current user
   */
  const permissions = getRolePermissions(role)
  
  return {
    role,
    permissions,
    isAuthenticated,
    isLoading,
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole,
    // Convenience flags
    isSuperAdmin: role === Role.SUPER_ADMIN,
    isOrgAdmin: role === Role.ORG_ADMIN,
    isOperator: role === Role.OPERATOR,
    isViewer: role === Role.VIEWER,
  }
}
