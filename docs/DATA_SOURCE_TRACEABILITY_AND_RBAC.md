# Data Source Traceability & RBAC Implementation

## 📊 Part 1: Data Source Traceability

### Overview
The system now tracks which data sources contributed to each alert, providing full traceability for audit and analysis purposes.

### Database Schema Changes

```sql
-- AlertLog model now includes:
dataSources      String[]  -- Array of sources: ["USGS", "EMSC", "JMA", "NOAA", "PTWC"]
primarySource    String    -- Primary/authoritative source
sourceMetadata   Json      -- Additional source-specific data
```

### Data Sources

| Source | Type | Description |
|--------|------|-------------|
| **USGS** | Earthquake | United States Geological Survey |
| **EMSC** | Earthquake | European-Mediterranean Seismological Centre |
| **JMA** | Earthquake | Japan Meteorological Agency |
| **NOAA** | Tsunami | National Oceanic and Atmospheric Administration |
| **PTWC** | Tsunami | Pacific Tsunami Warning Center |

### Implementation

#### 1. When Creating Alerts

```typescript
// Example: Creating an alert with source tracking
await prisma.alertLog.create({
  data: {
    earthquakeId: 'us7000abcd',
    magnitude: 6.5,
    location: 'Off the coast of Japan',
    latitude: 35.5,
    longitude: 139.7,
    
    // Data source traceability
    dataSources: ['USGS', 'JMA', 'EMSC'],  // All sources that reported this event
    primarySource: 'USGS',                  // Most authoritative source
    sourceMetadata: {
      usgs: {
        eventId: 'us7000abcd',
        updated: '2025-10-01T10:30:00Z',
        significance: 850
      },
      jma: {
        eventId: 'jma2025abcd',
        intensity: 5
      },
      emsc: {
        eventId: 'emsc-20251001-abcd'
      }
    },
    
    timestamp: new Date(),
    contactsNotified: 150,
    success: true
  }
})
```

#### 2. Querying by Data Source

```typescript
// Find all alerts from a specific source
const usgsAlerts = await prisma.alertLog.findMany({
  where: {
    primarySource: 'USGS'
  }
})

// Find alerts that include NOAA data
const noaaAlerts = await prisma.alertLog.findMany({
  where: {
    dataSources: {
      has: 'NOAA'
    }
  }
})

// Find multi-source alerts (cross-validated)
const crossValidated = await prisma.alertLog.findMany({
  where: {
    dataSources: {
      hasEvery: ['USGS', 'EMSC']
    }
  }
})
```

#### 3. Display in UI

```typescript
// Alert card showing sources
<div className="alert-card">
  <h3>M6.5 Earthquake - Off the coast of Japan</h3>
  
  <div className="sources">
    <span className="label">Data Sources:</span>
    {alert.dataSources.map(source => (
      <span key={source} className="source-badge">
        {source}
      </span>
    ))}
  </div>
  
  <div className="primary-source">
    <span className="label">Primary Source:</span>
    <strong>{alert.primarySource}</strong>
  </div>
</div>
```

### Benefits

1. **Audit Trail**: Know exactly where each alert came from
2. **Data Quality**: Identify which sources are most reliable
3. **Cross-Validation**: See when multiple sources confirm an event
4. **Compliance**: Meet regulatory requirements for data provenance
5. **Debugging**: Troubleshoot data source issues
6. **Analytics**: Analyze source performance and reliability

---

## 🔐 Part 2: RBAC (Role-Based Access Control)

### Overview
The system implements a comprehensive RBAC system with 4 user roles and granular permissions.

### User Roles

#### 1. **SUPER_ADMIN** 👑
- **Full system access**
- Can do everything
- Manage users, data sources, system settings
- View all audit logs

**Use Case**: System administrators, DevOps team

#### 2. **ORG_ADMIN** 🏢
- **Organization-level admin**
- Manage contacts, groups, alerts
- View audit logs
- Manage organization settings
- **Can view and manage users within their organization**
- **Can assign OPERATOR and VIEWER roles** (not SUPER_ADMIN or ORG_ADMIN)
- Cannot manage data sources
- **Organization-scoped**: Can only access users in their own organization

**Use Case**: Emergency management directors, organization administrators

**Restrictions**:
- Can only assign OPERATOR and VIEWER roles (not admin roles)
- Can only manage users in their own organization
- Cannot access system-wide settings or data sources

#### 3. **OPERATOR** 👨‍💼
- **Operational access**
- Manage contacts and contact groups
- Create and send alerts
- Manage monitoring settings
- Cannot delete contacts or view audit logs

**Use Case**: Emergency operators, on-call staff

#### 4. **VIEWER** 👁️
- **Read-only access**
- View contacts, groups, and alerts
- Cannot create, update, or delete anything
- Cannot access sensitive settings

**Use Case**: Stakeholders, observers, reporting staff

### Permission Matrix

| Permission | SUPER_ADMIN | ORG_ADMIN | OPERATOR | VIEWER |
|------------|-------------|-----------|----------|--------|
| **Contacts** |
| View Contacts | ✅ | ✅ | ✅ | ✅ |
| Create Contacts | ✅ | ✅ | ✅ | ❌ |
| Update Contacts | ✅ | ✅ | ✅ | ❌ |
| Delete Contacts | ✅ | ✅ | ❌ | ❌ |
| **Contact Groups** |
| View Groups | ✅ | ✅ | ✅ | ✅ |
| Manage Groups | ✅ | ✅ | ✅ | ❌ |
| **Alerts** |
| View Alerts | ✅ | ✅ | ✅ | ✅ |
| Create Alerts | ✅ | ✅ | ✅ | ❌ |
| Manage Monitoring | ✅ | ✅ | ✅ | ❌ |
| **System** |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |
| View Users | ✅ | ✅ (org only) | ❌ | ❌ |
| Manage Users | ✅ | ✅ (org only) | ❌ | ❌ |
| Assign Roles | ✅ (all roles) | ✅ (OPERATOR/VIEWER only) | ❌ | ❌ |
| Manage Settings | ✅ | ✅ | ❌ | ❌ |
| Manage Data Sources | ✅ | ❌ | ❌ | ❌ |

### Implementation

#### 1. Protecting API Routes

```typescript
import { withPermission, Permission } from '@/lib/rbac'

// Example: Protect contact group creation
export const POST = withPermission(
  Permission.MANAGE_GROUPS,
  async (req, session) => {
    // Only users with MANAGE_GROUPS permission can access this
    const body = await req.json()
    
    const group = await prisma.contactGroup.create({
      data: {
        name: body.name,
        description: body.description
      }
    })
    
    return NextResponse.json({ success: true, data: group })
  }
)
```

#### 2. Checking Permissions in Components

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { hasPermission, Permission } from '@/lib/rbac'

export function ContactGroupsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'VIEWER'
  
  const canManageGroups = hasPermission(userRole, Permission.MANAGE_GROUPS)
  
  return (
    <div>
      <h1>Contact Groups</h1>
      
      {canManageGroups && (
        <button onClick={createGroup}>
          Create New Group
        </button>
      )}
      
      {/* List groups */}
    </div>
  )
}
```

#### 3. Audit Logging

```typescript
import { logAudit } from '@/lib/rbac'

// Log important actions
await logAudit({
  action: 'CREATE_GROUP',
  resource: 'ContactGroup',
  resourceId: group.id,
  metadata: { name: group.name }
})

await logAudit({
  action: 'SEND_ALERT',
  resource: 'Alert',
  resourceId: alert.id,
  metadata: { 
    magnitude: alert.magnitude,
    contactsNotified: alert.contactsNotified 
  }
})
```

### Testing RBAC

#### Step 1: Create Test Users

```bash
# Run the seed script
npx tsx scripts/seed-test-users.ts
```

This creates 4 test users:
- `superadmin@test.com` (+1234567890) - SUPER_ADMIN
- `orgadmin@test.com` (+1234567891) - ORG_ADMIN
- `operator@test.com` (+1234567892) - OPERATOR
- `viewer@test.com` (+1234567893) - VIEWER

#### Step 2: Login with Different Users

1. Go to `/login`
2. Enter the phone number of a test user
3. Complete OTP verification
4. Test different features

#### Step 3: Test Permissions

**As VIEWER (+1234567893):**
- ✅ Can view contacts and groups
- ❌ Cannot create new contact groups
- ❌ Cannot edit contacts
- ❌ Cannot send alerts

**As OPERATOR (+1234567892):**
- ✅ Can view and create contacts
- ✅ Can manage contact groups
- ✅ Can send alerts
- ❌ Cannot delete contacts
- ❌ Cannot view audit logs

**As ORG_ADMIN (+1234567891):**
- ✅ Can do everything OPERATOR can
- ✅ Can delete contacts
- ✅ Can view audit logs
- ✅ Can manage settings
- ❌ Cannot manage users

**As SUPER_ADMIN (+1234567890):**
- ✅ Can do everything
- ✅ Full system access

### API Endpoints with RBAC

| Endpoint | Method | Required Permission |
|----------|--------|-------------------|
| `/api/contacts` | GET | VIEW_CONTACTS |
| `/api/contacts` | POST | CREATE_CONTACTS |
| `/api/contacts/[id]` | PUT | UPDATE_CONTACTS |
| `/api/contacts/[id]` | DELETE | DELETE_CONTACTS |
| `/api/contact-groups` | GET | VIEW_GROUPS |
| `/api/contact-groups` | POST | MANAGE_GROUPS |
| `/api/contact-groups/[id]` | PUT | MANAGE_GROUPS |
| `/api/contact-groups/[id]` | DELETE | MANAGE_GROUPS |
| `/api/alerts` | GET | VIEW_ALERTS |
| `/api/alerts` | POST | CREATE_ALERTS |
| `/api/monitoring` | PUT | MANAGE_MONITORING |
| `/api/audit-logs` | GET | VIEW_AUDIT_LOGS |
| `/api/users` | GET | MANAGE_USERS |
| `/api/settings` | PUT | MANAGE_SETTINGS |

### Security Features

1. **Session-Based**: Uses NextAuth for secure session management
2. **Database-Backed**: Roles stored in database, not JWT
3. **Audit Logging**: All permission-denied attempts are logged
4. **Granular Permissions**: Fine-grained control over actions
5. **Organization Isolation**: Future support for multi-tenancy

### Best Practices

1. **Principle of Least Privilege**: Give users minimum necessary permissions
2. **Regular Audits**: Review audit logs regularly
3. **Role Reviews**: Periodically review user roles
4. **Secure Defaults**: New users default to VIEWER role
5. **Audit Everything**: Log all sensitive operations

---

## 🚀 Deployment Steps

### 1. Run Database Migration

```bash
# Apply the migration
npx prisma migrate deploy

# Or if using Railway
railway run npx prisma migrate deploy
```

### 2. Seed Test Users

```bash
# Create test users
npx tsx scripts/seed-test-users.ts

# Or on Railway
railway run npx tsx scripts/seed-test-users.ts
```

### 3. Update Existing Users

```sql
-- Set role for existing users
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your-email@example.com';
UPDATE users SET role = 'OPERATOR' WHERE email = 'operator@example.com';
```

### 4. Test RBAC

1. Login with different test users
2. Try accessing protected features
3. Verify permission restrictions work
4. Check audit logs

---

## 📊 Monitoring & Analytics

### Data Source Analytics

```sql
-- Most used data sources
SELECT "primarySource", COUNT(*) as count
FROM "alert_logs"
GROUP BY "primarySource"
ORDER BY count DESC;

-- Cross-validated alerts
SELECT COUNT(*) as cross_validated_count
FROM "alert_logs"
WHERE array_length("dataSources", 1) > 1;

-- Source reliability (success rate)
SELECT 
  "primarySource",
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM "alert_logs"
GROUP BY "primarySource";
```

### RBAC Analytics

```sql
-- User distribution by role
SELECT role, COUNT(*) as count
FROM users
WHERE "isActive" = true
GROUP BY role;

-- Most active users (by audit logs)
SELECT 
  u.name,
  u.role,
  COUNT(a.id) as action_count
FROM users u
LEFT JOIN audit_logs a ON u.id = a."userId"
GROUP BY u.id, u.name, u.role
ORDER BY action_count DESC
LIMIT 10;

-- Permission denied attempts
SELECT 
  u.name,
  u.role,
  a.resource,
  COUNT(*) as denied_count
FROM audit_logs a
JOIN users u ON a."userId" = u.id
WHERE a.action = 'PERMISSION_DENIED'
GROUP BY u.name, u.role, a.resource
ORDER BY denied_count DESC;
```

---

## 🎯 Summary

### Data Source Traceability
- ✅ Track all data sources for each alert
- ✅ Identify primary/authoritative source
- ✅ Store source-specific metadata
- ✅ Enable cross-validation analysis
- ✅ Support audit and compliance requirements

### RBAC Implementation
- ✅ 4 user roles (SUPER_ADMIN, ORG_ADMIN, OPERATOR, VIEWER)
- ✅ 13 granular permissions
- ✅ API route protection
- ✅ Audit logging
- ✅ Test users for development

Both features are production-ready and fully integrated with the existing system!
