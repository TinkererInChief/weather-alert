'use client'

import { ReactNode } from 'react'
import { Permission, Role } from '@/lib/rbac/roles'
import { useAuthorization } from '@/hooks/useAuthorization'

type CanProps = {
  /** Single permission to check */
  permission?: Permission
  
  /** Multiple permissions - user must have ANY of these */
  anyPermission?: Permission[]
  
  /** Multiple permissions - user must have ALL of these */
  allPermissions?: Permission[]
  
  /** Single role to check */
  role?: Role
  
  /** Multiple roles - user must have ANY of these */
  anyRole?: Role[]
  
  /** Content to render if authorized */
  children: ReactNode
  
  /** Optional fallback content if not authorized */
  fallback?: ReactNode
}

/**
 * Permission-based rendering component
 * 
 * Usage:
 * ```tsx
 * <Can permission={Permission.MANAGE_USERS}>
 *   <button>Add User</button>
 * </Can>
 * 
 * <Can anyPermission={[Permission.EDIT_ALERTS, Permission.DELETE_ALERTS]}>
 *   <AlertActions />
 * </Can>
 * 
 * <Can role={Role.SUPER_ADMIN} fallback={<div>Access Denied</div>}>
 *   <AdminPanel />
 * </Can>
 * ```
 */
export function Can({
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  children,
  fallback = null
}: CanProps) {
  const auth = useAuthorization()
  
  // Check loading state
  if (auth.isLoading) {
    return null
  }
  
  // Check authentication
  if (!auth.isAuthenticated) {
    return <>{fallback}</>
  }
  
  // Check single permission
  if (permission && !auth.can(permission)) {
    return <>{fallback}</>
  }
  
  // Check any permission
  if (anyPermission && !auth.canAny(anyPermission)) {
    return <>{fallback}</>
  }
  
  // Check all permissions
  if (allPermissions && !auth.canAll(allPermissions)) {
    return <>{fallback}</>
  }
  
  // Check single role
  if (role && !auth.hasRole(role)) {
    return <>{fallback}</>
  }
  
  // Check any role
  if (anyRole && !auth.hasAnyRole(anyRole)) {
    return <>{fallback}</>
  }
  
  // User is authorized
  return <>{children}</>
}

/**
 * Inverse permission check - render only if NOT authorized
 */
export function Cannot({
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  children,
  fallback = null
}: CanProps) {
  const auth = useAuthorization()
  
  if (auth.isLoading) {
    return null
  }
  
  if (!auth.isAuthenticated) {
    return <>{children}</>
  }
  
  let isAuthorized = false
  
  if (permission) {
    isAuthorized = auth.can(permission)
  } else if (anyPermission) {
    isAuthorized = auth.canAny(anyPermission)
  } else if (allPermissions) {
    isAuthorized = auth.canAll(allPermissions)
  } else if (role) {
    isAuthorized = auth.hasRole(role)
  } else if (anyRole) {
    isAuthorized = auth.hasAnyRole(anyRole)
  }
  
  return isAuthorized ? <>{fallback}</> : <>{children}</>
}
