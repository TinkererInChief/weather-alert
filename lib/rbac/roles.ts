/**
 * RBAC (Role-Based Access Control) System
 * 
 * Defines roles, permissions, and access control for the emergency alert system.
 */

/**
 * System Roles
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Full system access, can manage organizations
  ORG_ADMIN = 'ORG_ADMIN',         // Organization administrator
  OPERATOR = 'OPERATOR',           // Can manage alerts and contacts
  VIEWER = 'VIEWER'                // Read-only access
}

/**
 * Granular Permissions
 */
export enum Permission {
  // System Management
  MANAGE_SYSTEM = 'MANAGE_SYSTEM',                 // System-wide settings
  MANAGE_ORGANIZATIONS = 'MANAGE_ORGANIZATIONS',   // Create/delete organizations
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',            // View system audit logs
  
  // User Management
  MANAGE_USERS = 'MANAGE_USERS',                   // Create/edit/delete users
  ASSIGN_ROLES = 'ASSIGN_ROLES',                   // Assign roles to users
  VIEW_USERS = 'VIEW_USERS',                       // View user list
  
  // Alert Management
  CREATE_ALERTS = 'CREATE_ALERTS',                 // Manually create alerts
  EDIT_ALERTS = 'EDIT_ALERTS',                     // Edit alert content
  DELETE_ALERTS = 'DELETE_ALERTS',                 // Delete/cancel alerts
  VIEW_ALERTS = 'VIEW_ALERTS',                     // View alert history
  SEND_ALERTS = 'SEND_ALERTS',                     // Send alerts to contacts
  
  // Contact Management
  MANAGE_CONTACTS = 'MANAGE_CONTACTS',             // Full CRUD on contacts
  VIEW_CONTACTS = 'VIEW_CONTACTS',                 // View contact list
  IMPORT_CONTACTS = 'IMPORT_CONTACTS',             // Bulk import contacts
  EXPORT_CONTACTS = 'EXPORT_CONTACTS',             // Export contact data
  
  // Contact Group Management
  MANAGE_GROUPS = 'MANAGE_GROUPS',                 // Create/edit/delete groups
  VIEW_GROUPS = 'VIEW_GROUPS',                     // View groups
  
  // Settings Management
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',             // Edit system settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',                 // View settings
  MANAGE_INTEGRATIONS = 'MANAGE_INTEGRATIONS',     // Configure Twilio, SendGrid, etc.
  
  // Monitoring
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',               // Access dashboard
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',               // View analytics/reports
  VIEW_NOTIFICATIONS = 'VIEW_NOTIFICATIONS',       // View notification logs
  
  // Data Sources
  MANAGE_DATA_SOURCES = 'MANAGE_DATA_SOURCES',     // Configure earthquake sources
  VIEW_DATA_SOURCES = 'VIEW_DATA_SOURCES',         // View source health
  
  // Alert Zones
  MANAGE_ALERT_ZONES = 'MANAGE_ALERT_ZONES',       // Define geographic zones
  VIEW_ALERT_ZONES = 'VIEW_ALERT_ZONES',           // View alert zones
}

/**
 * Role-Permission Mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // Full access to everything
    Permission.MANAGE_SYSTEM,
    Permission.MANAGE_ORGANIZATIONS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.VIEW_USERS,
    Permission.CREATE_ALERTS,
    Permission.EDIT_ALERTS,
    Permission.DELETE_ALERTS,
    Permission.VIEW_ALERTS,
    Permission.SEND_ALERTS,
    Permission.MANAGE_CONTACTS,
    Permission.VIEW_CONTACTS,
    Permission.IMPORT_CONTACTS,
    Permission.EXPORT_CONTACTS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_GROUPS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MANAGE_DATA_SOURCES,
    Permission.VIEW_DATA_SOURCES,
    Permission.MANAGE_ALERT_ZONES,
    Permission.VIEW_ALERT_ZONES,
  ],
  
  [Role.ORG_ADMIN]: [
    // Organization-level administration
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.VIEW_USERS,
    Permission.CREATE_ALERTS,
    Permission.EDIT_ALERTS,
    Permission.DELETE_ALERTS,
    Permission.VIEW_ALERTS,
    Permission.SEND_ALERTS,
    Permission.MANAGE_CONTACTS,
    Permission.VIEW_CONTACTS,
    Permission.IMPORT_CONTACTS,
    Permission.EXPORT_CONTACTS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_GROUPS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_DATA_SOURCES,
    Permission.MANAGE_ALERT_ZONES,
    Permission.VIEW_ALERT_ZONES,
  ],
  
  [Role.OPERATOR]: [
    // Day-to-day operations
    Permission.VIEW_USERS,
    Permission.CREATE_ALERTS,
    Permission.EDIT_ALERTS,
    Permission.VIEW_ALERTS,
    Permission.SEND_ALERTS,
    Permission.MANAGE_CONTACTS,
    Permission.VIEW_CONTACTS,
    Permission.IMPORT_CONTACTS,
    Permission.EXPORT_CONTACTS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_GROUPS,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_DATA_SOURCES,
    Permission.VIEW_ALERT_ZONES,
  ],
  
  [Role.VIEWER]: [
    // Read-only access
    Permission.VIEW_USERS,
    Permission.VIEW_ALERTS,
    Permission.VIEW_CONTACTS,
    Permission.VIEW_GROUPS,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_DATA_SOURCES,
    Permission.VIEW_ALERT_ZONES,
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Role hierarchy (for inheritance checks)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.ORG_ADMIN]: 3,
  [Role.OPERATOR]: 2,
  [Role.VIEWER]: 1,
}

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isRoleHigherThan(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: Role): string {
  const names: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Super Administrator',
    [Role.ORG_ADMIN]: 'Organization Administrator',
    [Role.OPERATOR]: 'Operator',
    [Role.VIEWER]: 'Viewer',
  }
  return names[role] || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Full system access with ability to manage organizations and system-wide settings',
    [Role.ORG_ADMIN]: 'Organization administrator with user management and configuration capabilities',
    [Role.OPERATOR]: 'Day-to-day operations including alert management and contact administration',
    [Role.VIEWER]: 'Read-only access to view alerts, contacts, and system status',
  }
  return descriptions[role] || ''
}
