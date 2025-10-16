import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, Permission, hasPermission, hasAnyPermission, hasAllPermissions } from './roles'
import { prisma } from '@/lib/prisma'
import { logAudit as baseLogAudit } from '@/lib/rbac'

/**
 * Extended session type with RBAC fields
 */
export type AuthorizedSession = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    role: Role
    organizationId?: string | null
    isActive: boolean
  }
}

/**
 * Get the current user's session with RBAC information
 */
export async function getAuthorizedSession(): Promise<AuthorizedSession | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email && !session?.user?.phone) {
    return null
  }
  
  // Fetch user with RBAC fields
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: session.user.email || undefined },
        { phone: session.user.phone || undefined },
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      organizationId: true,
      isActive: true,
    }
  })
  
  if (!user || !user.isActive) {
    return null
  }
  
  return {
    user: {
      ...user,
      role: user.role as Role,
    }
  }
}

/**
 * Check if the current user has a specific permission
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const session = await getAuthorizedSession()
  
  if (!session) {
    return false
  }
  
  return hasPermission(session.user.role, permission)
}

/**
 * Check if the current user has any of the specified permissions
 */
export async function checkAnyPermission(permissions: Permission[]): Promise<boolean> {
  const session = await getAuthorizedSession()
  
  if (!session) {
    return false
  }
  
  return hasAnyPermission(session.user.role, permissions)
}

/**
 * Check if the current user has all of the specified permissions
 */
export async function checkAllPermissions(permissions: Permission[]): Promise<boolean> {
  const session = await getAuthorizedSession()
  
  if (!session) {
    return false
  }
  
  return hasAllPermissions(session.user.role, permissions)
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthorizedSession> {
  const session = await getAuthorizedSession()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Require specific permission - throws if not authorized
 */
export async function requirePermission(permission: Permission): Promise<AuthorizedSession> {
  const session = await requireAuth()
  
  if (!hasPermission(session.user.role, permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
  
  return session
}

/**
 * Require any of the specified permissions - throws if not authorized
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthorizedSession> {
  const session = await requireAuth()
  
  if (!hasAnyPermission(session.user.role, permissions)) {
    throw new Error(`Permission denied: requires one of ${permissions.join(', ')}`)
  }
  
  return session
}

/**
 * Require all of the specified permissions - throws if not authorized
 */
export async function requireAllPermissions(permissions: Permission[]): Promise<AuthorizedSession> {
  const session = await requireAuth()
  
  if (!hasAllPermissions(session.user.role, permissions)) {
    throw new Error(`Permission denied: requires all of ${permissions.join(', ')}`)
  }
  
  return session
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(role: Role): Promise<AuthorizedSession> {
  const session = await requireAuth()
  
  if (session.user.role !== role) {
    throw new Error(`Role required: ${role}`)
  }
  
  return session
}

/**
 * Require any of the specified roles - throws if not authorized
 */
export async function requireAnyRole(roles: Role[]): Promise<AuthorizedSession> {
  const session = await requireAuth()
  
  if (!roles.includes(session.user.role)) {
    throw new Error(`Role required: one of ${roles.join(', ')}`)
  }
  
  return session
}

/**
 * API Route authorization wrapper
 */
export function withAuth(
  handler: (req: NextRequest, session: AuthorizedSession) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const session = await requireAuth()
      return await handler(req, session)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unauthorized' },
        { status: 401 }
      )
    }
  }
}

/**
 * API Route permission-based authorization wrapper
 */
export function withPermission(
  permission: Permission,
  handler: (req: NextRequest, session: AuthorizedSession) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const session = await requirePermission(permission)
      return await handler(req, session)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Forbidden' },
        { status: 403 }
      )
    }
  }
}

/**
 * API Route role-based authorization wrapper
 */
export function withRole(
  role: Role,
  handler: (req: NextRequest, session: AuthorizedSession) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const session = await requireRole(role)
      return await handler(req, session)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Forbidden' },
        { status: 403 }
      )
    }
  }
}

/**
 * Log audit event
 */
export async function logAudit(params: {
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  const session = await getAuthorizedSession()
  await baseLogAudit({
    userId: session?.user.id,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}
