# 🚢 Production Readiness Plan - Maritime Alert System

## Executive Summary

**Goal**: Auto-trigger multi-channel alerts (SMS, Email, WhatsApp, Voice) when vessels in your fleet enter geo-fenced perimeters around earthquake/tsunami events, with escalation based on criticality.

---

## Current State Analysis

### ✅ What Exists (Strong Foundation)
1. **Alert Infrastructure**
   - Multi-channel notification system (SMS, WhatsApp, Email, Voice)
   - Alert queue with BullMQ (priority-based, retry logic)
   - Earthquake & tsunami monitoring services
   - Delivery logging and tracking

2. **Vessel Tracking**
   - AIS data ingestion (real-time vessel positions)
   - 30k+ vessels in database
   - Position history with timestamps
   - Vessel metadata (name, MMSI, type, operator, owner)

3. **Proximity Detection**
   - `VesselProximityService` (calculates distance, risk levels)
   - Creates `VesselAlert` records
   - Basic geo-fencing logic

4. **Contact Management**
   - Contact database with channels (SMS, email, WhatsApp)
   - Contact groups functionality
   - Notification preferences per contact

### ❌ What's Missing (Gaps to Fill)
1. **Fleet Management** ⚠️ CRITICAL
   - No "fleet" concept (can't designate owned vessels)
   - No fleet-to-vessel associations
   - No way to distinguish fleet vessels from others

2. **Vessel-Contact Linking** ⚠️ CRITICAL
   - `VesselContact` table exists but not used
   - No contact assignment to specific vessels
   - No role-based contact hierarchy (captain, operator, owner)

3. **Escalation Matrix** ⚠️ CRITICAL
   - Severity-based channels exist (low/medium/high/critical)
   - But no time-based escalation rules
   - No escalation to secondary contacts if primary fails

4. **Geo-Fence Configuration** 🔧 IMPORTANT
   - Hardcoded radii (500km, 300km, etc.)
   - No custom geo-fence zones per vessel/region
   - No polygon-based zones (only circular)

5. **Auto-Trigger Integration** 🔧 IMPORTANT
   - Proximity detection exists but not auto-triggered
   - Manual call in `alert-manager.ts` (line 93-106)
   - Need automated pipeline

---

## Production Implementation Plan

### 📋 Phase 1: Fleet & Contact Management (Week 1)
**Priority**: 🔴 CRITICAL | **Effort**: 3-4 days

#### 1.1 Fleet Management System
**Schema Changes**:
```prisma
model Fleet {
  id          String   @id @default(cuid())
  name        String   // "Pacific Fleet", "Atlantic Operations"
  description String?
  ownerId     String   // Organization/user who owns fleet
  metadata    Json     @default("{}")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  vessels     FleetVessel[]
  
  @@map("fleets")
}

model FleetVessel {
  id        String   @id @default(cuid())
  fleetId   String
  vesselId  String
  role      String   // "primary", "backup"
  metadata  Json     @default("{}")
  addedAt   DateTime @default(now())
  fleet     Fleet    @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  vessel    Vessel   @relation(fields: [vesselId], references: [id], onDelete: Cascade)
  
  @@unique([fleetId, vesselId])
  @@index([fleetId])
  @@index([vesselId])
  @@map("fleet_vessels")
}
```

**API Endpoints**:
- `POST /api/fleets` - Create fleet
- `GET /api/fleets` - List fleets
- `POST /api/fleets/[id]/vessels` - Add vessel to fleet
- `DELETE /api/fleets/[id]/vessels/[vesselId]` - Remove vessel
- `GET /api/fleets/[id]/vessels` - List fleet vessels

**UI Components**:
- `/dashboard/fleets` - Fleet management page
- Fleet selector dropdown
- Vessel assignment interface

#### 1.2 Vessel-Contact Assignment
**Enhance Existing**:
```typescript
// Already exists: VesselContact table
// Need to implement:
- UI for assigning contacts to vessels
- Role hierarchy: Captain > Operations Manager > Fleet Manager > Owner
- Primary/secondary contact designation
- Contact type: vessel-specific vs global
```

**API Endpoints**:
- `POST /api/vessels/[id]/contacts` - Assign contact
- `GET /api/vessels/[id]/contacts` - List vessel contacts
- `PUT /api/vessels/[id]/contacts/[contactId]` - Update role/priority
- `DELETE /api/vessels/[id]/contacts/[contactId]` - Remove contact

**UI Components**:
- `/dashboard/vessels/[id]/contacts` - Vessel contact management
- Contact assignment modal
- Drag-to-reorder priority

---

### 📋 Phase 2: Escalation Matrix (Week 2)
**Priority**: 🔴 CRITICAL | **Effort**: 2-3 days

#### 2.1 Escalation Rules Engine
**Schema**:
```prisma
model EscalationPolicy {
  id          String                @id @default(cuid())
  name        String                // "Critical Event Escalation"
  description String?
  fleetId     String?               // null = global policy
  eventTypes  String[]              // ["earthquake", "tsunami"]
  active      Boolean               @default(true)
  metadata    Json                  @default("{}")
  createdAt   DateTime              @default(now())
  rules       EscalationRule[]
  fleet       Fleet?                @relation(fields: [fleetId], references: [id])
  
  @@map("escalation_policies")
}

model EscalationRule {
  id                String            @id @default(cuid())
  policyId          String
  step              Int               // 1, 2, 3 (escalation levels)
  severityMin       Int               // 1-5
  delayMinutes      Int               // Wait time before escalating
  channels          String[]          // ["sms", "whatsapp", "voice"]
  contactRoles      String[]          // ["captain", "operations"]
  requireAck        Boolean           @default(false)
  metadata          Json              @default("{}")
  policy            EscalationPolicy  @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@unique([policyId, step])
  @@map("escalation_rules")
}
```

#### 2.2 Escalation Logic
**Service**: `/lib/services/escalation-service.ts`
```typescript
class EscalationService {
  // Start escalation timer for alert
  async initiateEscalation(alert: VesselAlert): Promise<void>
  
  // Check if escalation needed (no ack after X minutes)
  async checkEscalations(): Promise<void>
  
  // Execute next escalation step
  async escalateAlert(alert: VesselAlert, step: number): Promise<void>
  
  // Record acknowledgment (stop escalation)
  async acknowledgeAlert(alertId: string, userId: string): Promise<void>
}
```

**Background Job**: `scripts/escalation-monitor.ts`
- Runs every 1 minute
- Checks unacknowledged critical alerts
- Triggers escalation steps based on policy

---

### 📋 Phase 3: Auto-Trigger Pipeline (Week 2-3)
**Priority**: 🟠 HIGH | **Effort**: 3-4 days

#### 3.1 Automated Geo-Fence Monitoring
**Current**: Proximity check happens in `alert-manager.ts` but relies on manual trigger

**New**: Real-time auto-trigger system

**Implementation**:
```typescript
// lib/services/geo-fence-monitor.ts
class GeoFenceMonitor {
  // Check all active fleet vessels against recent events
  async monitorFleetProximity(): Promise<void> {
    // 1. Get active fleets
    // 2. Get vessels with recent positions (last 30 min)
    // 3. Get recent earthquakes/tsunamis (last 6 hours)
    // 4. Calculate proximity for each vessel-event pair
    // 5. Trigger alerts for vessels at risk
  }
  
  // Process single event for all fleet vessels
  async processEventForFleets(event: EarthquakeEvent): Promise<void>
  
  // Get fleet vessels within radius
  async getFleetVesselsInRadius(
    lat: number, lon: number, radiusKm: number
  ): Promise<FleetVesselWithPosition[]>
}
```

**Background Job**: `scripts/geo-fence-monitor.ts`
- Runs every 2 minutes
- Monitors fleet vessels only
- Auto-creates VesselAlert records
- Auto-triggers notification pipeline

#### 3.2 Enhanced Alert Dispatch
**Modify**: `lib/services/vessel-proximity-service.ts`
```typescript
async dispatchFleetVesselAlerts(
  event: EarthquakeFeature,
  config: ProximityConfig
) {
  const fleetVessels = await this.getFleetVesselsAtRisk(event, config)
  
  for (const { vessel, position, distance, riskLevel } of fleetVessels) {
    // Create vessel alert
    const alert = await this.createVesselAlert(...)
    
    // Get escalation policy for vessel's fleet
    const policy = await this.getEscalationPolicy(vessel.fleetId)
    
    // Get contacts based on policy + vessel assignments
    const contacts = await this.getAlertContacts(vessel.id, policy, riskLevel)
    
    // Dispatch notifications via queue
    await this.dispatchNotifications(alert, contacts, policy)
    
    // Start escalation timer if required
    if (policy.requireAck) {
      await escalationService.initiateEscalation(alert)
    }
  }
}
```

---

### 📋 Phase 4: Geo-Fence Configuration (Week 3)
**Priority**: 🟡 MEDIUM | **Effort**: 2-3 days

#### 4.1 Custom Geo-Fence Zones
**Schema**:
```prisma
model GeoFence {
  id          String   @id @default(cuid())
  name        String   // "Panama Canal Zone", "Suez Canal"
  type        String   // "circle", "polygon"
  geometry    Json     // { type: "circle", center: [lat,lon], radius: 50 }
  fleetId     String?  // null = applies to all fleets
  priority    Int      @default(1)
  alertRadius Json     // { critical: 100, high: 250, medium: 500 }
  active      Boolean  @default(true)
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
  
  @@index([fleetId])
  @@map("geo_fences")
}
```

**Features**:
- Draw custom zones on map (polygon/circle)
- Per-zone alert radii
- Critical zones (ports, canals, straits)
- Automatic zone detection from vessel routes

---

### 📋 Phase 5: Insurance Cost Reduction Features (Week 4)
**Priority**: 🟢 NICE-TO-HAVE | **Effort**: 3-5 days

#### 5.1 Safety Compliance Tracking
```prisma
model SafetyIncident {
  id          String   @id @default(cuid())
  vesselId    String
  type        String   // "near_miss", "evasive_action", "damage"
  severity    String
  eventId     String?  // Linked earthquake/tsunami
  latitude    Float
  longitude   Float
  description String
  response    String   // Actions taken
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  vessel      Vessel   @relation(fields: [vesselId], references: [id])
  
  @@map("safety_incidents")
}
```

**Features for Insurance**:
1. **Incident Tracking**
   - Log near-misses and successful evasive actions
   - Document emergency response effectiveness
   - Track time-to-action metrics

2. **Route Safety Score**
   - Historical risk assessment per route
   - Avoidance of high-risk zones
   - Proactive route alterations

3. **Response Time Analytics**
   - Alert acknowledgment times
   - Evasive action speed
   - Communication reliability

4. **Predictive Maintenance Alerts**
   - Equipment health monitoring
   - Pre-failure warnings
   - Maintenance schedule compliance

5. **Crew Training & Readiness**
   - Emergency drill logs
   - Certification tracking
   - Response protocol adherence

6. **Real-Time Risk Mitigation**
   - Automatic course correction recommendations
   - Safe harbor identification
   - Weather avoidance routing

#### 5.2 Insurance Reporting Dashboard
**UI**: `/dashboard/insurance-reports`
- Safety incident history
- Response time analytics
- Risk avoidance statistics
- Compliance score
- Downloadable reports (PDF/CSV)

**API Endpoints**:
- `GET /api/insurance/safety-score` - Overall fleet safety score
- `GET /api/insurance/incidents` - Incident history
- `GET /api/insurance/response-analytics` - Response time metrics
- `POST /api/insurance/generate-report` - Generate insurance report

---

## Technical Architecture

### System Flow

```
[Earthquake/Tsunami Event Detected]
           ↓
[GeoFenceMonitor checks fleet vessels]
           ↓
[Calculate distance & risk for each vessel]
           ↓
[Vessels within radius] → [Create VesselAlert]
           ↓
[Get EscalationPolicy for vessel's fleet]
           ↓
[Get vessel contacts + global contacts]
           ↓
[Sort contacts by role hierarchy & priority]
           ↓
[Dispatch to AlertQueue (BullMQ)]
           ↓
[NotificationService processes queue]
           ↓
  ┌─────────┬─────────┬──────────┬────────┐
  ↓         ↓         ↓          ↓        ↓
[SMS]  [WhatsApp]  [Email]  [Voice]  [Satellite]
  ↓         ↓         ↓          ↓        ↓
[DeliveryLog tracking]
  ↓
[Contact receives notification with unique ACK link/code]
  ↓
┌─────────────────────────────────────────────┐
│ ACK Methods:                                │
│ 1. Click link in SMS/Email/WhatsApp         │
│    → GET /api/vessel-alerts/[id]/ack?token │
│ 2. Reply "ACK [code]" via SMS               │
│    → Webhook from Twilio parses response    │
│ 3. Press digit during voice call            │
│    → IVR captures DTMF input                │
│ 4. Manual ACK in dashboard                  │
│    → POST /api/vessel-alerts/[id]/acknowledge│
└─────────────────────────────────────────────┘
  ↓
[VesselAlert.acknowledgedAt updated, escalation timer cancelled]
  ↓
[If NO ACK after X minutes]
  ↓
[EscalationService escalates to next level]
  ↓
[Repeat until acknowledged or max escalations reached]
```

---

## Database Migrations

### Priority Order
1. ✅ **P0**: `fleets`, `fleet_vessels` tables
2. ✅ **P0**: `escalation_policies`, `escalation_rules` tables
3. ✅ **P0**: Populate `vessel_contacts` table (currently empty)
4. 🔧 **P1**: `geo_fences` table
5. 🔧 **P1**: `safety_incidents` table

---

## API Endpoints Summary

### Fleet Management
- `POST /api/fleets` - Create fleet
- `GET /api/fleets` - List fleets
- `GET /api/fleets/[id]` - Get fleet details
- `PUT /api/fleets/[id]` - Update fleet
- `DELETE /api/fleets/[id]` - Delete fleet
- `POST /api/fleets/[id]/vessels` - Add vessel
- `DELETE /api/fleets/[id]/vessels/[vesselId]` - Remove vessel

### Vessel-Contact Assignment
- `GET /api/vessels/[id]/contacts` - List vessel contacts
- `POST /api/vessels/[id]/contacts` - Assign contact
- `PUT /api/vessels/[id]/contacts/[contactId]` - Update priority/role
- `DELETE /api/vessels/[id]/contacts/[contactId]` - Remove contact

### Escalation Policies
- `GET /api/escalation-policies` - List policies
- `POST /api/escalation-policies` - Create policy
- `PUT /api/escalation-policies/[id]` - Update policy
- `DELETE /api/escalation-policies/[id]` - Delete policy

### Alerts & Acknowledgment
- `POST /api/vessel-alerts/[id]/acknowledge` - Acknowledge alert
- `GET /api/vessel-alerts` - List active alerts
- `GET /api/vessel-alerts/[id]` - Get alert details
- `GET /api/vessel-alerts/history` - Alert history

### Geo-Fences
- `GET /api/geo-fences` - List geo-fences
- `POST /api/geo-fences` - Create geo-fence
- `PUT /api/geo-fences/[id]` - Update geo-fence
- `DELETE /api/geo-fences/[id]` - Delete geo-fence

### Insurance & Analytics
- `GET /api/insurance/safety-score` - Fleet safety score
- `GET /api/insurance/incidents` - Incident history
- `GET /api/insurance/reports` - Generate reports
- `POST /api/insurance/incidents` - Log incident

---

## Background Services

### New Services Needed
1. **GeoFenceMonitor** (`scripts/geo-fence-monitor.ts`)
   - Frequency: Every 2 minutes
   - Function: Monitor fleet vessels, auto-trigger alerts

2. **EscalationMonitor** (`scripts/escalation-monitor.ts`)
   - Frequency: Every 1 minute
   - Function: Check unacknowledged alerts, trigger escalations

3. **SafetyScoreCalculator** (`scripts/calculate-safety-scores.ts`)
   - Frequency: Daily
   - Function: Calculate fleet/vessel safety scores

### PM2 Configuration Update
```javascript
// ecosystem.config.js
{
  name: 'geo-fence-monitor',
  script: 'pnpm',
  args: 'monitor:geo-fence',
  instances: 1,
  max_memory_restart: '256M'
},
{
  name: 'escalation-monitor',
  script: 'pnpm',
  args: 'monitor:escalation',
  instances: 1,
  max_memory_restart: '128M'
}
```

---

## Timeline & Effort Estimate

### Week 1: Foundation (15-20 hours)
- ✅ Fleet management schema & API
- ✅ Vessel-contact assignment UI
- ✅ Fleet CRUD dashboard

### Week 2: Core Alert Logic (15-20 hours)
- ✅ Escalation policy schema & engine
- ✅ Auto-trigger geo-fence monitoring
- ✅ Enhanced alert dispatch logic

### Week 3: Polish & Testing (10-15 hours)
- ✅ Custom geo-fence configuration
- ✅ Integration testing
- ✅ Performance optimization

### Week 4: Insurance Features (15-20 hours)
- ✅ Safety incident tracking
- ✅ Analytics dashboard
- ✅ Insurance reporting

**Total Estimated Effort**: 55-75 hours (2-3 weeks with 1-2 developers)

---

## Success Metrics

### Critical Metrics
1. **Alert Delivery Time**: < 60 seconds from event to first notification
2. **Escalation Accuracy**: 95%+ correct escalations
3. **Acknowledgment Rate**: > 90% of critical alerts acknowledged
4. **False Positive Rate**: < 5%

### Insurance Metrics
1. **Incident Response Time**: Average < 5 minutes
2. **Near-Miss Documentation**: 100% of near-misses logged
3. **Safety Score**: Fleet average > 85/100
4. **Compliance Rate**: 100% for critical procedures

---

## Risk Mitigation

### Technical Risks
1. **Performance**: 30k vessels × N events = high load
   - **Mitigation**: Async processing, Redis caching, database indexing

2. **Notification Failures**: Network/provider issues
   - **Mitigation**: Retry logic, multiple channels, fallback providers

3. **False Positives**: Alert fatigue
   - **Mitigation**: Smart thresholds, ML-based scoring, user feedback loop

### Operational Risks
1. **Contact Data Quality**: Missing/outdated contacts
   - **Mitigation**: Mandatory contact validation, regular audits

2. **Escalation Loops**: Infinite escalations
   - **Mitigation**: Max escalation levels (3-5), timeout limits

---

## Next Steps for Implementation

### Immediate Actions (This Week)
1. ✅ Review and approve this plan
2. ✅ Prioritize features (MVP vs Nice-to-Have)
3. ✅ Set up development environment
4. ✅ Create database migrations for Phase 1

### Start with MVP
**Minimum Viable Product**:
- Fleet management (basic)
- Vessel-contact assignment
- Auto-trigger alerts for fleet vessels
- Simple escalation (2 levels max)
- SMS + Email only (defer WhatsApp/Voice)

**Defer to V2**:
- Custom geo-fences (use fixed radii)
- Insurance features (focus on core alerts first)
- Advanced analytics
- Polygon-based zones

---

## Questions for You

1. **Fleet Size**: How many fleets? How many vessels per fleet?
2. **Contact Hierarchy**: What roles are critical? (Captain, Ops Manager, Owner?)
3. **Escalation Time**: How long to wait before escalating? (5 min? 15 min?)
4. **Geo-Fence Radii**: What distances are critical/high/medium risk?
5. **Insurance Priority**: How important are insurance features vs core alerts?
6. **Budget**: Timeline constraints? MVP vs full feature set?

---

Ready to implement! Please review and let me know:
- ✅ Approve plan as-is
- 🔧 Modify priorities/features
- ❓ Need clarification on specific areas
