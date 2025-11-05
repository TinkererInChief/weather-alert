# 🚢 Maritime Platform - Feature Roadmap

**Document Version:** 1.0  
**Created:** November 5, 2025  
**Target Completion:** 4-5 Weeks  
**Implementation Priority:** Ships → RBAC → Testing → Escalation → Parametrization → Documentation

---

## 📋 Executive Summary

| # | Feature | Complexity | Effort | Priority | Dependencies |
|---|---------|-----------|--------|----------|--------------|
| 1 | Global Ships Repository | High | 1.5 weeks | P0 | External APIs |
| 2 | RBAC Management UI | Medium | 1 week | P0 | None |
| 3 | Escalation Rules Engine | High | 1.5 weeks | P1 | Alert System |
| 4 | Parametrization Tool | Medium | 1 week | P1 | Organizations |
| 5 | Documentation Portal | Low | 3 days | P2 | Auth System |
| 6 | Admin Testing Suite | Medium | 1 week | P0 | Existing Widgets |

**Total: 6.5 weeks** (Parallel work: 4-5 weeks)

---

## 1️⃣ Global Ships Repository

### Objective
Comprehensive database of ALL ships worldwide (not just AIS-tracked) for easy fleet creation.

### Current Gap
```typescript
// Only vessels captured via AIS stream
model Vessel {
  mmsi String @unique  // Only from AIS
  // Can't create fleets until vessel appears in stream
}
```

### Solution
```typescript
model GlobalVessel {
  id              String   @id
  imo             String   @unique  // Official IMO number
  mmsi            String?          // May change
  name            String
  vesselType      String
  flag            String
  length          Float?
  grossTonnage    Float?
  owner           String?
  operator        String?
  dataSource      String[]         // ["IHS", "Equasis", "Manual"]
  dataQuality     Int              // 0-100 score
  trackedVesselId String?          // Link to live AIS
  searchText      String?          // For full-text search
}
```

### Data Sources (Recommended: Hybrid Approach)
1. **Equasis** (Free, 100k vessels) - Initial import
2. **Manual CSV import** - Admin UI
3. **Upgrade to IHS Markit** ($500-2k/month, 200k+ vessels) when budget allows

### Implementation (1.5 weeks)
**Week 1:**
- Day 1-2: Schema, migrations
- Day 3-4: Import service (CSV parser, IMO validation, de-duplication)
- Day 5: Admin import UI

**Week 2 (3 days):**
- Day 1-2: Search API with filters (type, flag, size)
- Day 3: Enhanced fleet creation UI with vessel search

### Deliverables
- ✅ GlobalVessel model + migrations
- ✅ CSV import service with IMO validation
- ✅ Admin import UI with template download
- ✅ Search API (<500ms response)
- ✅ Fleet creation with global vessel lookup

### Success Metrics
- 100,000+ vessels in DB
- Fleet creation time reduced by 80%
- 95%+ IMO validation accuracy

---

## 2️⃣ RBAC Management UI

### Objective
Admin interface to manage roles, permissions, and user access without code changes.

### Current State
```typescript
// RBAC logic exists in lib/rbac/roles.ts
// 4 roles: SUPER_ADMIN, ORG_ADMIN, OPERATOR, VIEWER
// 25 permissions
// Changes require code deployment ❌
```

### Solution
Admin UI for:
- View all roles + permissions matrix
- Create custom roles
- Assign/revoke permissions
- Assign roles to users
- Role inheritance
- Permission testing tool

### Implementation (1 week)
**Day 1-2: Backend**
- `POST /api/admin/rbac/roles` - Create custom role
- `PATCH /api/admin/rbac/roles/:id` - Update permissions
- `POST /api/admin/rbac/users/:id/role` - Assign role
- `GET /api/admin/rbac/permissions` - List all permissions

**Day 3-5: Frontend**
- Role management dashboard
- Permission matrix editor (checkboxes)
- User-role assignment interface
- Permission tester ("Can user X do action Y?")

### Database Changes
```prisma
model CustomRole {
  id          String   @id
  name        String   @unique
  description String?
  permissions String[] // Array of Permission enums
  isSystem    Boolean  @default(false)
  createdBy   String
  createdAt   DateTime
}

model User {
  customRoleId String?
  customRole   CustomRole?
}
```

### Deliverables
- ✅ Custom role creation
- ✅ Permission matrix UI
- ✅ Role assignment interface
- ✅ Audit logging for all RBAC changes

---

## 3️⃣ Escalation Rules Engine

### Objective
Automatic escalation when acknowledgements not received within configurable timeframes.

### Use Case
```
Alert sent → No acknowledgement after 15 min 
→ Escalate to next priority contact
→ Still no ack after 30 min total
→ Escalate to manager/emergency contact
```

### Solution
```typescript
model EscalationPolicy {
  id              String   @id
  name            String
  organizationId  String
  vesselId        String?  // Optional: vessel-specific
  alertTypes      String[] // ["tsunami", "earthquake", "storm"]
  enabled         Boolean
  
  rules           EscalationRule[]
}

model EscalationRule {
  id              String   @id
  policyId        String
  level           Int      // 1, 2, 3...
  waitMinutes     Int      // 15, 30, 60...
  action          String   // "notify_next", "escalate_role", "sms_manager"
  targetContactId String?
  targetRole      String?  // "CAPTAIN", "MANAGER", "EMERGENCY"
  notifyChannels  String[] // ["email", "sms", "whatsapp", "voice"]
}

model EscalationLog {
  id              String   @id
  alertId         String
  policyId        String
  level           Int
  triggeredAt     DateTime
  action          String
  targetContacts  Json
  status          String   // "pending", "completed", "failed"
}
```

### Implementation (1.5 weeks)
**Week 1:**
- Day 1-2: Schema, migrations, escalation engine service
- Day 3-4: Cron job to check unacknowledged alerts
- Day 5: Escalation execution (send notifications)

**Week 2 (3 days):**
- Day 1-2: Admin UI for policy creation
- Day 3: Testing & validation

### Admin UI Features
- Policy builder (drag-drop escalation levels)
- Time interval configurator
- Contact/role selector
- Test escalation simulator
- Escalation history viewer

### Deliverables
- ✅ Escalation policy engine
- ✅ Automated escalation cron job
- ✅ Policy management UI
- ✅ Escalation history & analytics

---

## 4️⃣ Parametrization Management Tool

### Objective
Client-specific configuration without code changes (multi-tenancy parameters).

### Parameters to Identify & Configure
```typescript
type ClientParameters = {
  // Alert Thresholds
  alertThresholds: {
    earthquakeMagnitude: number      // Default: 5.5
    tsunamiWaveHeight: number        // Default: 1.0m
    vesselProximity: number          // Default: 500km
  }
  
  // Notification Preferences
  notifications: {
    channels: string[]               // ["email", "sms", "whatsapp"]
    quietHoursStart: string          // "22:00"
    quietHoursEnd: string            // "06:00"
    maxDailyAlerts: number           // Rate limiting per client
  }
  
  // Data Retention
  dataRetention: {
    alertHistoryDays: number         // Default: 365
    positionHistoryDays: number      // Default: 90
    auditLogDays: number             // Default: 730
  }
  
  // Feature Flags
  features: {
    tsunamiMonitoring: boolean
    aiRiskAssessment: boolean
    voiceAlerts: boolean
    customBranding: boolean
  }
  
  // Branding
  branding: {
    logoUrl: string?
    primaryColor: string?
    companyName: string?
    supportEmail: string?
  }
  
  // API Limits
  apiLimits: {
    requestsPerMinute: number
    maxFleets: number
    maxVessels: number
    maxContacts: number
  }
}
```

### Implementation (1 week)
**Day 1-2: Schema & Service**
```prisma
model OrganizationConfig {
  id              String   @id
  organizationId  String   @unique
  parameters      Json     // ClientParameters type
  version         Int      @default(1)
  updatedBy       String
  updatedAt       DateTime
}

model ConfigHistory {
  id              String   @id
  organizationId  String
  parameters      Json
  version         Int
  changedBy       String
  changedAt       DateTime
}
```

**Day 3-5: Admin UI**
- Parameter editor with validation
- Category tabs (Alerts, Notifications, Data, Features, Branding, API)
- Preview/test mode
- Version history viewer
- Rollback capability

### Deliverables
- ✅ Organization-specific parameter store
- ✅ Parameter editor UI
- ✅ Version control & rollback
- ✅ Parameter validation & defaults

---

## 5️⃣ Documentation Portal (Auth-Protected)

### Objective
Comprehensive docs for admins, operators, and API users - behind authentication.

### Structure
```
/dashboard/docs
├── /getting-started
│   ├── Quick Start Guide
│   ├── System Overview
│   └── Key Concepts
├── /user-guides
│   ├── Fleet Management
│   ├── Alert Configuration
│   ├── Contact Management
│   └── RBAC Setup
├── /admin-guides
│   ├── User Approval Workflow
│   ├── System Configuration
│   ├── Data Import
│   └── Escalation Policies
├── /api-reference
│   ├── Authentication
│   ├── REST Endpoints
│   ├── Webhooks
│   └── Rate Limits
└── /troubleshooting
    ├── Common Issues
    ├── Error Codes
    └── Support Resources
```

### Implementation (3 days)
**Day 1: Setup**
- Next.js MDX for docs
- Auth-protected `/dashboard/docs` route
- Search functionality

**Day 2-3: Content Creation**
- Write documentation (20-30 pages)
- Screenshots and diagrams
- Code examples
- Video tutorials (optional)

### Tech Stack
- **next-mdx-remote** for MDX rendering
- **Algolia DocSearch** for search (or simple fuzzy search)
- **React Syntax Highlighter** for code blocks
- **Mermaid** for diagrams

### Deliverables
- ✅ Documentation portal (20-30 pages)
- ✅ Search functionality
- ✅ Auth-protected access
- ✅ Mobile-responsive

---

## 6️⃣ Admin Testing Suite (Refactor Existing Widgets)

### Objective
Comprehensive testing dashboard for admins to validate system functionality without production impact.

### Current Widgets to Refactor
```typescript
// Existing test endpoints (scattered):
// - /api/alerts/test
// - /api/alerts/test-high-severity
// - /api/alerts/test-multichannel
// - /api/sms/test (if exists)
// - /api/email/test (if exists)

// Problem: No unified UI, manual API calls needed
```

### Solution: Unified Testing Dashboard
```
/dashboard/admin/testing
├── Alert Testing
│   ├── Send Test Alert (magnitude, location)
│   ├── Multi-channel Test (email + SMS + WhatsApp)
│   ├── Escalation Test (simulate no-ack scenario)
│   └── Bulk Alert Test (performance)
├── Notification Testing
│   ├── Email Delivery Test
│   ├── SMS Delivery Test
│   ├── WhatsApp Test
│   └── Voice Call Test
├── Integration Testing
│   ├── USGS Connection
│   ├── PTWC Connection
│   ├── DART Buoys
│   ├── SendGrid Health
│   └── Twilio Health
├── RBAC Testing
│   ├── Permission Checker ("Can user X do Y?")
│   ├── Role Simulator
│   └── Access Matrix Validator
├── Performance Testing
│   ├── Database Query Performance
│   ├── API Response Times
│   └── Alert Processing Speed
└── Data Quality
    ├── Vessel Data Completeness
    ├── Contact Validation
    └── Fleet Integrity Check
```

### Implementation (1 week)
**Day 1-2: Refactor Existing Test APIs**
```typescript
// NEW: /api/admin/testing/alerts/route.ts
export async function POST(req: Request) {
  const { type, severity, contacts, dryRun } = await req.json()
  
  // Unified test alert with options:
  // - type: "earthquake" | "tsunami" | "custom"
  // - dryRun: true (no actual notifications sent)
  // - contacts: specific contact IDs to test
  
  const result = await sendTestAlert({
    type,
    severity,
    contacts,
    dryRun,
    testMode: true  // Flag for audit logs
  })
  
  return NextResponse.json({
    success: true,
    alertId: result.id,
    deliveryLogs: result.logs,
    performance: {
      processingTimeMs: result.processingTime,
      deliveryTimeMs: result.deliveryTime
    }
  })
}
```

**Day 3-4: Testing Dashboard UI**
```typescript
// NEW: app/dashboard/admin/testing/page.tsx

export default function TestingDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Alert Testing Card */}
      <TestCard
        title="Alert Testing"
        icon={<AlertTriangle />}
        tests={[
          {
            name: "Send Test Earthquake Alert",
            action: () => sendTestAlert("earthquake")
          },
          {
            name: "Test Multi-channel Delivery",
            action: () => testMultiChannel()
          },
          {
            name: "Simulate Escalation",
            action: () => testEscalation()
          }
        ]}
      />
      
      {/* Notification Testing Card */}
      <TestCard
        title="Notification Channels"
        icon={<Bell />}
        tests={[
          {
            name: "Email Delivery",
            action: () => testEmail(),
            showContactSelector: true
          },
          {
            name: "SMS Delivery",
            action: () => testSMS(),
            showContactSelector: true
          }
        ]}
      />
      
      {/* Integration Health */}
      <TestCard
        title="External Integrations"
        icon={<Activity />}
        tests={[
          {
            name: "Check USGS Connection",
            action: () => checkHealth("usgs"),
            showResult: true
          },
          {
            name: "Check SendGrid Status",
            action: () => checkHealth("sendgrid"),
            showResult: true
          }
        ]}
      />
      
      {/* RBAC Testing */}
      <TestCard
        title="RBAC Permissions"
        icon={<Shield />}
        tests={[
          {
            name: "Test Permission",
            component: <PermissionTester />
          }
        ]}
      />
    </div>
  )
}

function PermissionTester() {
  const [userId, setUserId] = useState("")
  const [permission, setPermission] = useState("")
  const [result, setResult] = useState<boolean | null>(null)
  
  const testPermission = async () => {
    const res = await fetch("/api/admin/testing/rbac", {
      method: "POST",
      body: JSON.stringify({ userId, permission })
    })
    const data = await res.json()
    setResult(data.hasPermission)
  }
  
  return (
    <div className="space-y-3">
      <Select onValueChange={setUserId}>
        <SelectTrigger>
          <SelectValue placeholder="Select User" />
        </SelectTrigger>
        <SelectContent>
          {/* User list */}
        </SelectContent>
      </Select>
      
      <Select onValueChange={setPermission}>
        <SelectTrigger>
          <SelectValue placeholder="Select Permission" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MANAGE_ALERTS">Manage Alerts</SelectItem>
          <SelectItem value="VIEW_USERS">View Users</SelectItem>
          {/* All permissions */}
        </SelectContent>
      </Select>
      
      <Button onClick={testPermission} className="w-full">
        Test Permission
      </Button>
      
      {result !== null && (
        <div className={`p-3 rounded ${result ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {result ? '✅ Permission Granted' : '❌ Permission Denied'}
        </div>
      )}
    </div>
  )
}
```

**Day 5: Performance Testing Tools**
- Database query analyzer
- API endpoint latency tester
- Alert processing speed meter
- Concurrent user simulator

### Deliverables
- ✅ Unified testing dashboard
- ✅ Refactored test APIs under `/api/admin/testing/*`
- ✅ Contact selector for targeted tests
- ✅ Dry-run mode (no actual notifications)
- ✅ Performance metrics display
- ✅ Test result history viewer
- ✅ RBAC permission tester
- ✅ Integration health checker

---

## 📅 Implementation Timeline

### Week 1-2: Foundation (P0 Features)
- **Week 1:** Global Ships Repository (schema, import, search)
- **Week 2:** RBAC Management UI + Admin Testing Suite

### Week 3-4: Advanced Features (P1)
- **Week 3:** Escalation Rules Engine
- **Week 4:** Parametrization Tool

### Week 5: Polish (P2)
- **Week 5:** Documentation Portal + Final Testing

### Parallel Work Strategy
- Frontend dev can work on RBAC UI while backend builds escalation engine
- Documentation can be written alongside feature development

---

## 🎯 Success Metrics

### Global Ships Repository
- 100,000+ vessels in database
- <500ms search response time
- Fleet creation time reduced by 80%

### RBAC Management
- Custom roles created without code changes
- Permission changes applied instantly
- 100% audit coverage for RBAC changes

### Escalation Rules
- 95%+ escalation trigger accuracy
- <1 min delay in escalation execution
- Zero missed escalations

### Parametrization
- All client configs centralized
- Zero code deployments for config changes
- Version rollback capability

### Documentation
- 20-30 comprehensive doc pages
- <100ms search response
- 90%+ user satisfaction

### Admin Testing
- All critical paths testable via UI
- <5 min to run full test suite
- Dry-run mode for safe testing

---

## 💰 Cost Estimate

### External Services
| Service | Purpose | Cost |
|---------|---------|------|
| Equasis | Initial ship data | Free |
| IHS Markit (Optional) | Premium ship data | $500-2k/month |
| Algolia (Optional) | Doc search | $0-100/month |

### Development Cost
- 4-5 weeks × 1 senior engineer = $20-30k
- OR 6 weeks × 1 mid-level = $15-20k

---

## 🚀 Next Steps

1. **Prioritize** which features to build first (recommendation: Ships → RBAC → Testing)
2. **Provision** ship data source (Equasis registration or IHS account)
3. **Assign** development resources
4. **Set** milestone dates
5. **Begin** with Global Ships Repository

---

## 📝 Notes

- All features include comprehensive audit logging
- RBAC controls access to admin features
- Testing suite prevents production incidents
- Documentation reduces support load
- Parametrization enables true multi-tenancy

**Ready to begin implementation?** Start with Feature 1 (Global Ships Repository) for maximum impact on fleet creation workflow.
