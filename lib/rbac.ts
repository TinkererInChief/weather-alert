import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

/**
 * User Roles in the Emergency Alert System
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Full system access
  ORG_ADMIN = 'ORG_ADMIN',         // Organization-level admin
  OPERATOR = 'OPERATOR',            // Can manage alerts and contacts
  VIEWER = 'VIEWER',                // Read-only access
}

/**
 * Permissions for different actions
 */
export enum Permission {
  // Contact Management
  VIEW_CONTACTS = 'VIEW_CONTACTS',
  CREATE_CONTACTS = 'CREATE_CONTACTS',
  UPDATE_CONTACTS = 'UPDATE_CONTACTS',
  DELETE_CONTACTS = 'DELETE_CONTACTS',
  
  // Contact Group Management
  VIEW_GROUPS = 'VIEW_GROUPS',
  MANAGE_GROUPS = 'MANAGE_GROUPS',
  
  // Alert Management
  VIEW_ALERTS = 'VIEW_ALERTS',
  CREATE_ALERTS = 'CREATE_ALERTS',
  MANAGE_MONITORING = 'MANAGE_MONITORING',
  
  // Notification Management
  VIEW_NOTIFICATIONS = 'VIEW_NOTIFICATIONS',
  MANAGE_NOTIFICATIONS = 'MANAGE_NOTIFICATIONS',
  
  // System Management
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  VIEW_USERS = 'VIEW_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_DATA_SOURCES = 'MANAGE_DATA_SOURCES',
}

/**
 * Role-Permission Matrix
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // All permissions
    Permission.VIEW_CONTACTS,
    Permission.CREATE_CONTACTS,
    Permission.UPDATE_CONTACTS,
    Permission.DELETE_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERTS,
    Permission.MANAGE_MONITORING,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MANAGE_NOTIFICATIONS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_DATA_SOURCES,
  ],
  [Role.ORG_ADMIN]: [
    // Organization-level permissions
    Permission.VIEW_CONTACTS,
    Permission.CREATE_CONTACTS,
    Permission.UPDATE_CONTACTS,
    Permission.DELETE_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERTS,
    Permission.MANAGE_MONITORING,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MANAGE_NOTIFICATIONS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_USERS,        // Can view users in their org
    Permission.MANAGE_USERS,      // Can manage users in their org
    Permission.ASSIGN_ROLES,      // Can assign roles to org users
    Permission.MANAGE_SETTINGS,
  ],
  [Role.OPERATOR]: [
    // Operational permissions
    Permission.VIEW_CONTACTS,
    Permission.CREATE_CONTACTS,
    Permission.UPDATE_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_ALERTS,
    Permission.CREATE_ALERTS,
    Permission.MANAGE_MONITORING,
    Permission.VIEW_NOTIFICATIONS,
  ],
  [Role.VIEWER]: [
    // Read-only permissions
    Permission.VIEW_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_NOTIFICATIONS,
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const roleEnum = role as Role
  const permissions = ROLE_PERMISSIONS[roleEnum] || []
  return permissions.includes(permission)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  const roleEnum = role as Role
  return ROLE_PERMISSIONS[roleEnum] || []
}

/**
 * Higher-order function to wrap API routes with permission checking
 */
export function withPermission(
  requiredPermission: Permission,
  handler: (req: NextRequest, session: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      
      if (!session || !session.user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Ensure user ID is present
      if (!session.user?.id) {
        console.error('[RBAC] Session user ID missing', { session })
        return NextResponse.json(
          { success: false, error: 'Invalid session: user ID not found' },
          { status: 401 }
        )
      }

      // Get user from database to check role
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, isActive: true, name: true, email: true, phone: true }
      })
      
      if (!user) {
        console.error('[RBAC] User not found in database', { userId: session.user.id })
        return NextResponse.json(
          { success: false, error: `User not found in database. Please log out and log in again.` },
          { status: 403 }
        )
      }
      
      if (!user.isActive) {
        console.error('[RBAC] User is inactive', { userId: session.user.id })
        return NextResponse.json(
          { success: false, error: 'Your account is currently inactive. Please contact an administrator.' },
          { status: 403 }
        )
      }
      
      // Check permission
      if (!hasPermission(user.role, requiredPermission)) {
        const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
        const ua = req.headers.get('user-agent') || undefined
        await logAudit({
          userId: user.id,
          action: 'PERMISSION_DENIED',
          resource: requiredPermission,
          metadata: { path: req.url },
          ipAddress: ip,
          userAgent: ua,
        })
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions',
            required: requiredPermission,
            userRole: user.role
          },
          { status: 403 }
        )
      }
      
      // Call the actual handler
      return await handler(req, { ...session, user: { ...session.user, role: user.role } })
      
    } catch (error) {
      console.error('RBAC middleware error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Log audit events
 */
export async function logAudit(params: {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    const session = await getServerSession(authOptions)
    const userId = params.userId || session?.user?.id
    
    if (!userId) return
    const hdrs = headers()
    const reqId = hdrs.get('x-request-id') || undefined
    const ip = params.ipAddress || (hdrs.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = params.userAgent || hdrs.get('user-agent') || undefined
    const method = hdrs.get('x-method') || undefined
    const path = hdrs.get('x-path') || undefined
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata || {},
        ipAddress: ip,
        userAgent: ua,
        requestId: reqId,
        method,
        path,
      }
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Check if user can access a specific resource
 * Implements organization-scoped access control
 */
export async function canAccessResource(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true }
    })
    
    if (!user) return false
    
    // Super admins can access everything
    if (user.role === Role.SUPER_ADMIN) return true
    
    // Organization-scoped access for ORG_ADMIN
    if (user.role === Role.ORG_ADMIN && user.organizationId) {
      // Check if the target resource belongs to the same organization
      switch (resourceType) {
        case 'User': {
          const targetUser = await prisma.user.findUnique({
            where: { id: resourceId },
            select: { organizationId: true }
          })
          return targetUser?.organizationId === user.organizationId
        }
        // TODO: Add organization isolation for Contact and ContactGroup
        // when multi-tenancy is fully implemented
        default:
          return true
      }
    }
    
    return true
  } catch (error) {
    console.error('Error checking resource access:', error)
    return false
  }
}

/**
 * Check if ORG_ADMIN can assign a specific role
 * ORG_ADMINs can only assign OPERATOR and VIEWER roles, not SUPER_ADMIN or ORG_ADMIN
 */
export function canAssignRole(userRole: string, targetRole: string): boolean {
  if (userRole === Role.SUPER_ADMIN) {
    return true // Can assign any role
  }
  
  if (userRole === Role.ORG_ADMIN) {
    // ORG_ADMIN can only assign OPERATOR and VIEWER roles
    return targetRole === Role.OPERATOR || targetRole === Role.VIEWER
  }
  
  return false
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user) return []
    
    return getRolePermissions(user.role)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}
