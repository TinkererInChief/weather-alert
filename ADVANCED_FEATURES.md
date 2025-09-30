# Advanced Status Page Features

## 🎯 Overview
This document covers the three advanced features implemented to make your status page production-grade:

1. **MTTR excluding deploy events**
2. **Service Dependency Map**
3. **Maintenance Window Scheduler**

---

## 1. MTTR Calculation (Deploy-Aware)

### What Changed
The MTTR (Mean Time To Recovery) metric now **excludes incidents that occur during deployments**, preventing false positives from planned downtime.

### How It Works

#### Deploy Window Detection
- Fetches all `deploy` events from `health_events` table
- Creates ±2 minute windows around each deploy
- Marks any incident within these windows as deployment-related

#### Incident Filtering
```typescript
// Only count incidents that:
// 1. Have a start and end time (resolved)
// 2. Did NOT occur during a deploy window
const resolvedIncidents = incidents.filter(i => i.endTime && !i.isDeploy)
```

### Result
- **Before**: MTTR included deployment downtime (~1-2 min per deploy)
- **After**: MTTR only counts real incidents
- **Your current events**: Correctly flagged as deployment-related

### API Endpoint
`GET /api/health/metrics?period=30d`

Response now accurately reflects only non-deployment incidents.

---

## 2. Service Dependency Map

### What It Is
A **visual topology diagram** showing:
- How services depend on each other
- Which services are critical path
- Cascade impact when a service fails

### Your Service Architecture

```
Layer 0 (External)     Layer 1 (Core)        Layer 2 (Infrastructure)    Layer 3 (Channels)
─────────────────────────────────────────────────────────────────────────────────────────────

┌─────────┐
│  USGS   │──┐
└─────────┘  │                                ┌──────────┐
             ├──────────┐                     │ Database │
┌─────────┐  │          │                     └────┬─────┘
│  NOAA   │──┘          ▼                          │
└─────────┘      ┌─────────────┐                  │         ┌─────────┐
                 │ Alert Engine│──────────────────┴────────▶│   SMS   │
                 └─────────────┘                  │         ├─────────┤
                        │                         │         │  Email  │
                        │                    ┌────▼─────┐   ├─────────┤
                        └────────────────────│  Redis   │   │WhatsApp │
                                             └──────────┘   ├─────────┤
                                                            │  Voice  │
                                                            └─────────┘
```

### Features

#### Visual Status
- **Green border**: Service healthy
- **Yellow border**: Service degraded
- **Red border**: Service critical
- **Gray border**: Status unknown

#### Impact Analysis
Shows which services will be affected if a service goes down:
- **Database down** → Alert Engine, all channels affected
- **Redis down** → Alert Engine affected
- **USGS down** → Alert Engine can't fetch earthquake data
- **Twilio down** → SMS, WhatsApp, Voice affected

#### Interactive Tooltips
Hover over any service to see:
- Service name
- Current status
- Dependencies

### Component
```tsx
<ServiceDependencyMap services={systemStatus?.services || {}} />
```

### Customization
Edit `/components/status/ServiceDependencyMap.tsx`:
- Modify `nodes` array to add/remove services
- Change `layer` numbers to reorganize layout
- Update `dependencies` array to reflect your architecture

---

## 3. Maintenance Window Scheduler

### What It Does
Schedule planned maintenance to:
- **Exclude from MTTR** calculations
- **Mark on timeline** with blue "deploy" badges
- **Prevent false alerts** during planned downtime
- **Document maintenance** history

### Features

#### Schedule Maintenance
```typescript
{
  title: "Database Migration",
  description: "Upgrading PostgreSQL to v15",
  startTime: "2025-01-15T02:00:00Z",
  endTime: "2025-01-15T03:00:00Z",
  affectedServices: ["database", "redis"]
}
```

#### Active Window Display
- Shows **"Active Now"** badge during maintenance
- Timeline integration (blue event markers)
- Countdown to start/end

#### Automatic Event Creation
When you schedule maintenance, it automatically:
1. Creates a `MaintenanceWindow` record
2. Creates a `deploy` event in timeline
3. MTTR calculation excludes this window

### API Endpoints

#### GET /api/maintenance
List all maintenance windows
```bash
curl https://your-domain.com/api/maintenance
```

#### GET /api/maintenance?active=true
Get only currently active windows
```bash
curl https://your-domain.com/api/maintenance?active=true
```

#### POST /api/maintenance
Schedule new maintenance
```bash
curl -X POST https://your-domain.com/api/maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database Migration",
    "description": "Upgrading to v15",
    "startTime": "2025-01-15T02:00:00Z",
    "endTime": "2025-01-15T03:00:00Z",
    "affectedServices": ["database"]
  }'
```

#### DELETE /api/maintenance?id=xxx
Cancel scheduled maintenance
```bash
curl -X DELETE https://your-domain.com/api/maintenance?id=clxxx
```

### UI Component
Location: `/dashboard/status` → "Maintenance Windows" section

Features:
- ➕ Schedule new maintenance
- 📅 View upcoming/past windows
- 🗑️ Cancel scheduled windows
- 🔔 "Active Now" indicator
- 📋 Service selection

---

## 🗄️ Database Schema

### New Table: `maintenance_windows`

```sql
CREATE TABLE maintenance_windows (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  affected_services TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_maintenance_time ON maintenance_windows(start_time, end_time);
```

### Integration with `health_events`

Maintenance windows automatically create events:
```json
{
  "eventType": "deploy",
  "severity": "warning",
  "message": "Scheduled maintenance: Database Migration",
  "metadata": {
    "maintenanceWindowId": "clxxx",
    "scheduled": true
  }
}
```

---

## 📊 Integration Flow

### Deployment Scenario

```
Time: 07:24 AM - Deploy started
├─ Railway stops old container
├─ Services go down → status: critical
├─ HealthEvent created: "status_change" (warning → critical)
├─ Deploy event created (if webhook configured)
└─ Deploy window: 07:22 AM - 07:26 AM (±2 min)

Time: 07:25 AM - New container starts
├─ Services recover → status: warning → healthy
├─ HealthEvent created: "status_change" (critical → warning)
└─ Incident duration: ~1 minute

MTTR Calculation:
✅ Incident detected: 1 minute
✅ Deploy window check: Falls within 07:22-07:26
✅ Excluded from MTTR: YES
✅ Result: MTTR unchanged
```

### Maintenance Scenario

```
Time: 02:00 AM - Scheduled maintenance starts
├─ MaintenanceWindow active
├─ Deploy event on timeline
├─ Services may go down
└─ All incidents within window excluded

Time: 03:00 AM - Maintenance completes
├─ Window closes
├─ Services resume
└─ Normal monitoring resumes
```

---

## 🎯 Best Practices

### When to Schedule Maintenance

1. **Database migrations**
   - Service: database
   - Duration: Estimate conservatively
   - Off-peak hours

2. **Infrastructure upgrades**
   - Services: All
   - Duration: Add 30% buffer
   - Notify users beforehand

3. **Dependency updates**
   - Services: Affected services
   - Duration: Brief (5-10 min)
   - Can do during business hours

### Maintenance Window Duration

- **Buffer time**: Add 25-50% to estimate
- **Minimum**: 5 minutes
- **Maximum**: 4 hours (split into multiple if longer)
- **Typical deploy**: 15-30 minutes

### Communication

Before scheduling:
1. Notify users via email/status page
2. Update public status page banner
3. Schedule during low-traffic hours
4. Have rollback plan ready

---

## 🚀 Deploy Event Tracking (Optional)

### Railway Webhook Setup

1. Go to Railway Project Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/deploy/webhook`
3. Select events:
   - `deployment.started`
   - `deployment.success`
   - `deployment.failed`

### Webhook Payload
```json
{
  "type": "deployment.success",
  "deployment": {
    "id": "deploy-123",
    "status": "success",
    "creator": "yash",
    "meta": {
      "commitHash": "abc123",
      "commitMessage": "feat: add status page"
    }
  },
  "timestamp": "2025-01-15T07:24:30Z"
}
```

### Alternative: Manual Marking

Add to your deployment script:
```bash
# Before deploy
pnpm tsx scripts/mark-deploy.ts "Deploy: Feature X"

# After deploy succeeds
git push origin main
```

---

## 📈 Metrics Impact

### Before These Features
- ✗ MTTR inflated by deploy downtime
- ✗ No visibility into service dependencies
- ✗ Deploy incidents counted as real issues
- ✗ Manual tracking of maintenance

### After These Features
- ✅ Accurate MTTR (real incidents only)
- ✅ Visual dependency map
- ✅ Deploy incidents filtered out
- ✅ Scheduled maintenance tracked
- ✅ Better incident attribution

### Example Metrics

**Without deploy filtering:**
- MTTR: 2.5 minutes (includes 5 deploys)
- Incidents: 8 (3 real + 5 deploys)
- Uptime: 99.95%

**With deploy filtering:**
- MTTR: 0.8 minutes (only real incidents)
- Incidents: 3 (real issues only)
- Uptime: 99.98% (excludes maintenance)

---

## 🔧 Customization

### Adjust Deploy Window Size

In `/app/api/health/metrics/route.ts`:
```typescript
// Current: ±2 minutes
const deployWindows = deployEvents.map((d: any) => ({
  start: new Date(d.createdAt.getTime() - 2 * 60000),
  end: new Date(d.createdAt.getTime() + 2 * 60000),
}))

// For longer deploys: ±5 minutes
const deployWindows = deployEvents.map((d: any) => ({
  start: new Date(d.createdAt.getTime() - 5 * 60000),
  end: new Date(d.createdAt.getTime() + 5 * 60000),
}))
```

### Modify Service Dependencies

In `/components/status/ServiceDependencyMap.tsx`:
```typescript
const nodes: ServiceNode[] = [
  // Add your custom service
  { 
    id: 'myservice', 
    name: 'My Service', 
    icon: MyIcon, 
    status: services.myservice?.status as any || 'unknown', 
    layer: 1, 
    dependencies: ['database', 'redis'] 
  },
  // ... existing nodes
]
```

### Add Maintenance Types

Extend the schema:
```prisma
enum MaintenanceType {
  SCHEDULED
  EMERGENCY
  UPGRADE
}

model MaintenanceWindow {
  // ... existing fields
  type MaintenanceType @default(SCHEDULED)
}
```

---

## 🎉 Summary

You now have three production-grade features:

1. **Smart MTTR** - Excludes deploy/maintenance downtime
2. **Dependency Map** - Visual service topology
3. **Maintenance Scheduler** - Plan and track downtime

### What This Means

✅ **More accurate metrics** - MTTR reflects real issues  
✅ **Better debugging** - See service dependencies  
✅ **Planned downtime** - Schedule without false alarms  
✅ **Professional status page** - Enterprise-grade monitoring  

### Next Deploy

Your current deployment events are now:
- Correctly identified as deploy-related
- Excluded from MTTR calculations
- Marked on timeline with blue badges
- Won't inflate incident counts

---

**Status**: ✅ All Three Features Implemented  
**Database**: ✅ Migration Applied  
**Ready for**: Production Use  

Use the maintenance scheduler before your next deploy to prevent similar events!
