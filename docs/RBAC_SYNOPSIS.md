# RBAC (Role-Based Access Control) - Synopsis

## 🎭 Role Hierarchy

| Rank | Role | Display Name | Hierarchy Level | Description |
|------|------|--------------|-----------------|-------------|
| 1 | `SUPER_ADMIN` | Super Administrator | 4 (Highest) | Full system access with ability to manage organizations and system-wide settings |
| 2 | `ORG_ADMIN` | Organization Administrator | 3 | Organization administrator with user management and configuration capabilities |
| 3 | `OPERATOR` | Operator | 2 | Day-to-day operations including alert management and contact administration |
| 4 | `VIEWER` | Viewer | 1 (Lowest) | Read-only access to view alerts, contacts, and system status |

---

## 🔑 Permissions Matrix

### System Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_SYSTEM` | ✅ | ❌ | ❌ | ❌ | System-wide settings configuration |
| `MANAGE_ORGANIZATIONS` | ✅ | ❌ | ❌ | ❌ | Create/delete organizations |
| `VIEW_AUDIT_LOGS` | ✅ | ❌ | ❌ | ❌ | View system audit logs |

### User Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_USERS` | ✅ | ✅ | ❌ | ❌ | Create/edit/delete users |
| `ASSIGN_ROLES` | ✅ | ✅ | ❌ | ❌ | Assign roles to users |
| `VIEW_USERS` | ✅ | ✅ | ✅ | ✅ | View user list |

### Alert Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `CREATE_ALERTS` | ✅ | ✅ | ✅ | ❌ | Manually create alerts |
| `EDIT_ALERTS` | ✅ | ✅ | ✅ | ❌ | Edit alert content |
| `DELETE_ALERTS` | ✅ | ✅ | ❌ | ❌ | Delete/cancel alerts |
| `VIEW_ALERTS` | ✅ | ✅ | ✅ | ✅ | View alert history |
| `SEND_ALERTS` | ✅ | ✅ | ✅ | ❌ | Send alerts to contacts |

### Contact Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_CONTACTS` | ✅ | ✅ | ✅ | ❌ | Full CRUD on contacts |
| `VIEW_CONTACTS` | ✅ | ✅ | ✅ | ✅ | View contact list |
| `IMPORT_CONTACTS` | ✅ | ✅ | ✅ | ❌ | Bulk import contacts |
| `EXPORT_CONTACTS` | ✅ | ✅ | ✅ | ❌ | Export contact data |

### Contact Group Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_GROUPS` | ✅ | ✅ | ✅ | ❌ | Create/edit/delete groups |
| `VIEW_GROUPS` | ✅ | ✅ | ✅ | ✅ | View groups |

### Settings Management

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_SETTINGS` | ✅ | ✅ | ❌ | ❌ | Edit system settings |
| `VIEW_SETTINGS` | ✅ | ✅ | ✅ | ✅ | View settings |
| `MANAGE_INTEGRATIONS` | ✅ | ✅ | ❌ | ❌ | Configure Twilio, SendGrid, etc. |

### Monitoring & Analytics

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `VIEW_DASHBOARD` | ✅ | ✅ | ✅ | ✅ | Access dashboard |
| `VIEW_ANALYTICS` | ✅ | ✅ | ✅ | ✅ | View analytics/reports |
| `VIEW_NOTIFICATIONS` | ✅ | ✅ | ✅ | ✅ | View notification logs |

### Data Sources

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_DATA_SOURCES` | ✅ | ❌ | ❌ | ❌ | Configure earthquake sources |
| `VIEW_DATA_SOURCES` | ✅ | ✅ | ✅ | ✅ | View source health |

### Alert Zones

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Description |
|------------|-------------|-----------|----------|--------|-------------|
| `MANAGE_ALERT_ZONES` | ✅ | ✅ | ❌ | ❌ | Define geographic zones |
| `VIEW_ALERT_ZONES` | ✅ | ✅ | ✅ | ✅ | View alert zones |

---

## 🎯 Sidebar Navigation Access

| Navigation Item | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER | Required Permission |
|-----------------|-------------|-----------|----------|--------|---------------------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | `VIEW_DASHBOARD` |
| **Earthquake Monitoring** | ✅ | ✅ | ✅ | ✅ | `VIEW_ALERTS` |
| **Tsunami Monitoring** | ✅ | ✅ | ✅ | ✅ | `VIEW_ALERTS` |
| **Contacts** | ✅ | ✅ | ✅ | ✅ | `VIEW_CONTACTS` |
| **Contact Groups** | ✅ | ✅ | ✅ | ✅ | `VIEW_GROUPS` |
| **Alert History** | ✅ | ✅ | ✅ | ✅ | `VIEW_ALERTS` |
| **Notifications** | ✅ | ✅ | ✅ | ✅ | `VIEW_NOTIFICATIONS` |
| **Audit Trail** | ✅ | ✅ | ✅ | ✅ | `VIEW_AUDIT_LOGS` or any role |
| **System Status** | ✅ | ✅ | ✅ | ✅ | `VIEW_DASHBOARD` |
| **━━━ ADMIN SECTION ━━━** | | | | | |
| **Admin Panel / Organization Panel** | ✅ | ✅ | ❌ | ❌ | `MANAGE_USERS` *(SUPER_ADMIN sees all orgs, ORG_ADMIN sees their org only)* |
| **Settings** | ✅ | ✅ | ❌ | ❌ | `MANAGE_SETTINGS` |

---

## 📊 Permission Count Summary

| Role | Total Permissions | System | Users | Alerts | Contacts | Settings | Monitoring | Zones |
|------|-------------------|--------|-------|--------|----------|----------|------------|-------|
| **SUPER_ADMIN** | 30 | 3 | 3 | 5 | 4 | 3 | 3 | 2 |
| **ORG_ADMIN** | 24 | 0 | 3 | 5 | 4 | 3 | 3 | 2 |
| **OPERATOR** | 17 | 0 | 1 | 4 | 4 | 1 | 3 | 1 |
| **VIEWER** | 10 | 0 | 1 | 1 | 1 | 1 | 3 | 1 |

---

## 🔐 Common Use Cases

### Use Case 1: Creating a New Alert

| Step | Required Permission | Who Can Do It |
|------|---------------------|---------------|
| 1. Access Dashboard | `VIEW_DASHBOARD` | All roles |
| 2. Navigate to Alerts | `VIEW_ALERTS` | All roles |
| 3. Click "Create Alert" | `CREATE_ALERTS` | SUPER_ADMIN, ORG_ADMIN, OPERATOR |
| 4. Fill Alert Details | `CREATE_ALERTS` | SUPER_ADMIN, ORG_ADMIN, OPERATOR |
| 5. Send to Contacts | `SEND_ALERTS` | SUPER_ADMIN, ORG_ADMIN, OPERATOR |

**Result**: VIEWER can only view, cannot create or send

### Use Case 2: Managing Users

| Step | Required Permission | Who Can Do It |
|------|---------------------|---------------|
| 1. Access User Management | `MANAGE_USERS` | SUPER_ADMIN, ORG_ADMIN |
| 2. View User List | `VIEW_USERS` | All roles |
| 3. Create New User | `MANAGE_USERS` | SUPER_ADMIN, ORG_ADMIN |
| 4. Assign Role | `ASSIGN_ROLES` | SUPER_ADMIN, ORG_ADMIN |
| 5. Delete User | `MANAGE_USERS` | SUPER_ADMIN, ORG_ADMIN |

**Result**: OPERATOR and VIEWER can only view users, cannot manage

### Use Case 3: System Configuration

| Step | Required Permission | Who Can Do It |
|------|---------------------|---------------|
| 1. Access Settings | `VIEW_SETTINGS` | All roles |
| 2. Edit General Settings | `MANAGE_SETTINGS` | SUPER_ADMIN, ORG_ADMIN |
| 3. Configure Integrations | `MANAGE_INTEGRATIONS` | SUPER_ADMIN, ORG_ADMIN |
| 4. Manage Data Sources | `MANAGE_DATA_SOURCES` | SUPER_ADMIN only |
| 5. System-Wide Settings | `MANAGE_SYSTEM` | SUPER_ADMIN only |

**Result**: Only SUPER_ADMIN can configure data sources and system-wide settings

### Use Case 4: Maritime Vessel Notification

| Step | Required Permission | Who Can Do It |
|------|---------------------|---------------|
| 1. View Maritime Widget | `VIEW_DASHBOARD` | All roles |
| 2. Click "Notify Vessels" | `SEND_ALERTS` | SUPER_ADMIN, ORG_ADMIN, OPERATOR |
| 3. Dispatch Notification | `SEND_ALERTS` | SUPER_ADMIN, ORG_ADMIN, OPERATOR |

**Result**: VIEWER cannot send vessel notifications

---

## 🛡️ Security Boundaries

### What SUPER_ADMIN Can Do (That Others Cannot)

| Capability | Impact |
|------------|--------|
| **Manage Organizations** | Create/delete entire organizations |
| **System-Wide Settings** | Configure global system parameters |
| **Data Source Management** | Add/remove earthquake data providers |
| **View Audit Logs** | See all system security events |
| **Access Admin Panel** | System-wide administration interface |

### What ORG_ADMIN Cannot Do

| Restriction | Reason |
|-------------|--------|
| ❌ Manage Organizations | Limited to their own org |
| ❌ System-Wide Settings | Could affect other orgs |
| ❌ Configure Data Sources | System-level configuration |
| ❌ View System Audit Logs | Security/privacy boundary |
| ❌ Access Admin Panel | Reserved for SUPER_ADMIN |

### What OPERATOR Cannot Do

| Restriction | Reason |
|-------------|--------|
| ❌ Manage Users | Administrative function |
| ❌ Delete Alerts | Prevents accidental data loss |
| ❌ Manage Settings | Configuration restricted to admins |
| ❌ Manage Alert Zones | Geographic configuration restricted |

### What VIEWER Cannot Do

| Restriction | Reason |
|-------------|--------|
| ❌ Create/Edit Anything | Read-only role |
| ❌ Send Alerts | Cannot perform operations |
| ❌ Manage Contacts | View-only access |
| ❌ Export Data | Data protection |

---

## 📝 Helper Functions

### Permission Checking

```typescript
// Check single permission
hasPermission(role: Role, permission: Permission): boolean

// Check any of multiple permissions
hasAnyPermission(role: Role, permissions: Permission[]): boolean

// Check all of multiple permissions
hasAllPermissions(role: Role, permissions: Permission[]): boolean

// Get all permissions for a role
getRolePermissions(role: Role): Permission[]
```

### Role Hierarchy

```typescript
// Check if one role is higher than another
isRoleHigherThan(role1: Role, role2: Role): boolean

// Get role name
getRoleName(role: Role): string

// Get role description
getRoleDescription(role: Role): string
```

---

## 🔄 Permission Inheritance

Roles do **NOT** inherit permissions from lower roles. Each role has an explicit set of permissions defined in `ROLE_PERMISSIONS`.

### Hierarchy Level Does NOT Mean Inheritance

| Role | Has Permission X | Reason |
|------|------------------|--------|
| SUPER_ADMIN | ✅ | Explicitly granted |
| ORG_ADMIN | ✅ | Explicitly granted |
| OPERATOR | ❌ | Not granted (even though lower in hierarchy) |
| VIEWER | ❌ | Not granted |

**Why?** This allows fine-grained control. For example:
- `DELETE_ALERTS` is granted to SUPER_ADMIN and ORG_ADMIN
- But NOT to OPERATOR (even though OPERATOR can CREATE_ALERTS)
- This prevents accidental data deletion by operators

---

## 🚀 Implementation Examples

### Frontend: Conditional Rendering

```typescript
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'

// In component
const userRole = session.user.role as Role
const canManageUsers = hasPermission(userRole, Permission.MANAGE_USERS)

{canManageUsers && (
  <button onClick={openUserManager}>Manage Users</button>
)}
```

### Backend: API Route Protection

```typescript
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
  if (!hasPermission(user.role as Role, Permission.SEND_ALERTS)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  
  // Process request...
}
```

### Sidebar: Navigation Filtering

```typescript
const userRole = (sessionUser as any)?.role as Role | undefined
const isSuperAdmin = userRole === Role.SUPER_ADMIN
const canManageUsers = userRole && hasPermission(userRole, Permission.MANAGE_USERS)

const adminNavigation = [
  ...(isSuperAdmin ? [adminPanelLink] : []),
  ...(canManageUsers ? [userManagementLink] : []),
]
```

---

## 📈 Migration Path

### Promoting a User

```
VIEWER → OPERATOR → ORG_ADMIN → SUPER_ADMIN
  ↓         ↓          ↓             ↓
 Read    Operations  Admin      Full System
 Only                Powers      Control
```

### Typical User Journey

1. **New User**: Starts as `VIEWER` (read-only)
2. **Trained**: Promoted to `OPERATOR` (can manage alerts/contacts)
3. **Experienced**: Promoted to `ORG_ADMIN` (can manage users/settings)
4. **System Admin**: Promoted to `SUPER_ADMIN` (full system access)

---

## ✅ Summary

| Aspect | Details |
|--------|---------|
| **Roles** | 4 (SUPER_ADMIN, ORG_ADMIN, OPERATOR, VIEWER) |
| **Permissions** | 30 granular permissions |
| **Categories** | System, Users, Alerts, Contacts, Groups, Settings, Monitoring, Data Sources, Zones |
| **Hierarchy** | Explicit (no inheritance) |
| **Enforcement** | Client-side (UI) + Server-side (API) |
| **Security Model** | Defense in depth, principle of least privilege |

---

## 🔗 Related Documentation

- **Security Enhancements**: `/docs/SECURITY_ENHANCEMENTS.md`
- **RBAC Implementation**: `/lib/rbac/roles.ts`
- **AuthGuard Component**: `/components/auth/AuthGuard.tsx`
- **Admin Dashboard**: `/app/dashboard/admin/page.tsx`
