/**
 * RBAC (Role-Based Access Control) System
 * 
 * Centralized exports for authorization and access control
 */

// Roles and Permissions
export {
  Role,
  Permission,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  isRoleHigherThan,
  getRoleName,
  getRoleDescription,
} from './roles'

// Authorization Functions
export type { AuthorizedSession } from './authorization'
export {
  getAuthorizedSession,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  withAuth,
  withPermission,
  withRole,
  logAudit,
} from './authorization'
