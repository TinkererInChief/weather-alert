import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
  
  // System Management
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_USERS = 'MANAGE_USERS',
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
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_USERS,
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
    Permission.VIEW_AUDIT_LOGS,
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
  ],
  [Role.VIEWER]: [
    // Read-only permissions
    Permission.VIEW_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.VIEW_ALERTS,
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
      
      // Get user from database to check role
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, isActive: true }
      })
      
      if (!user || !user.isActive) {
        return NextResponse.json(
          { success: false, error: 'User not found or inactive' },
          { status: 403 }
        )
      }
      
      // Check permission
      if (!hasPermission(user.role, requiredPermission)) {
        await logAudit({
          userId: user.id,
          action: 'PERMISSION_DENIED',
          resource: requiredPermission,
          metadata: { path: req.url }
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
}) {
  try {
    const session = await getServerSession(authOptions)
    const userId = params.userId || session?.user?.id
    
    if (!userId) return
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata || {},
      }
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Check if user can access a specific resource
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
    
    // Add resource-specific access logic here
    // For example, check if resource belongs to user's organization
    
    return true
  } catch (error) {
    console.error('Error checking resource access:', error)
    return false
  }
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
