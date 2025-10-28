# 🎯 Master Implementation Roadmap

## Timeline: 6 Weeks | Effort: 100-130 hours

**Priority Order**: Core Alerts > Performance > Insurance Features (Lower Priority)

---

# Week 1: Foundation + Performance (Days 1-5)

## Day 1-2: Fleet Management ✅ CRITICAL
**Effort**: 12-16h | **Details**: `WEEK1_FLEET.md`

- Create `Fleet` and `FleetVessel` tables
- API: POST/GET/PUT/DELETE `/api/fleets`, `/api/fleets/[id]/vessels`
- UI: `/dashboard/fleets` with vessel assignment
- **Data**: Your 30k+ vessels table

## Day 2-3: Vessel-Contact Assignment ✅ CRITICAL
**Effort**: 10-12h | **Details**: `WEEK1_CONTACTS.md`

- Enhance `VesselContact` with `priority`, `notifyOn` fields
- Contact hierarchy service (captain > chief_officer > ops_manager)
- API: CRUD `/api/vessels/[id]/contacts`
- UI: Contact assignment with drag-and-drop priority
- **Data**: Your `vessel_contacts` + `contacts` tables

## Day 3-4: Dashboard Performance Optimization ✅ HIGH
**Effort**: 6-8h | **Details**: `WEEK1_PERFORMANCE.md`

### Parallel Fetching
- Change sequential awaits to `Promise.allSettled()`
- Group real-time (30s) vs static data (5min refresh)
- **Result**: 30s → 2-3s load time (10x faster)

### Timeout Protection
- Wrap all fetches with 10s timeout
- Graceful fallback (keep old data on failure)

### Missing Data
- Add `positions_today`, `vessels_new_today`, `db_size_bytes` to `realtime_stats`
- Update background job `scripts/update-realtime-stats.ts`

**Data**: Your `/dashboard/database` + `realtime_stats`

## Day 4-5: Vessel Activity Cache Table ✅ HIGH
**Effort**: 6-8h | **Details**: `WEEK1_CACHE.md`

- Create `vessel_activity_realtime` table (singleton pattern)
- Background job: `scripts/update-vessel-stats.ts` (every 30s)
- API: `GET /api/database/vessel-stats-cached`
- Update `/dashboard/vessels` to use cache
- **Result**: 10-15s → <2s load time
- **Data**: Your `vessel_positions` (TimescaleDB) + `vessels`

---

# Week 2: Escalation System (Days 1-5)

## Day 1-3: Escalation Policy Engine ✅ CRITICAL
**Effort**: 16-20h | **Details**: `WEEK2_ESCALATION.md`

- Create `EscalationPolicy`, `EscalationRule`, `EscalationLog` tables
- Service: `lib/services/escalation-service.ts`
  - `getPolicy()`, `initiateEscalation()`, `processEscalations()`, `acknowledgeAlert()`
- Background job: `scripts/escalation-monitor.ts` (runs every 1 min)
- API: CRUD `/api/escalation-policies`, POST `/api/vessel-alerts/[id]/acknowledge`
- UI: `/dashboard/escalation-policies`
- Add to PM2 ecosystem

**Example Policy**:
```json
{
  "rules": [
    {"step": 1, "delayMinutes": 0, "channels": ["sms", "whatsapp"], "contactRoles": ["captain"]},
    {"step": 2, "delayMinutes": 5, "channels": ["sms", "whatsapp", "voice"], "contactRoles": ["captain", "chief_officer"]},
    {"step": 3, "delayMinutes": 15, "channels": ["voice"], "contactRoles": ["operations_manager", "owner"]}
  ]
}
```

**Data**: Your `vessel_alerts` + new escalation tables

## Day 4-5: Alert Activity Cache ⚠️ MEDIUM
**Effort**: 4-6h | **Details**: `WEEK2_CACHE_ALERTS.md`

- Create `alert_activity_realtime` table
- Background job: `scripts/update-alert-stats.ts`
- Track active alerts by severity, resolution metrics
- **Data**: Your `vessel_alerts`

---

# Week 3-4: Auto-Trigger System (Days 1-10)

## Week 3 Day 1-3: Geo-Fence Monitor ✅ CRITICAL
**Effort**: 18-22h | **Details**: `WEEK3_GEOFENCE.md`

- Service: `lib/services/geo-fence-monitor.ts`
  - `checkFleetProximity()` - runs every 2 min
  - `getRecentEvents()` - earthquakes/tsunamis (last 6h)
  - `getActiveFleetVessels()` - vessels with positions (last 30min)
  - `findVesselsInRadius()` - proximity detection
  - `createAndDispatchAlert()` - auto-trigger alerts
- Background job: `scripts/geo-fence-monitor.ts`
- API: POST `/api/geo-fence/trigger-manual` (testing)
- Add to PM2

**Risk Calculation**:
- Tsunami: <100km = critical, <300km = high, <500km = moderate
- Earthquake: Based on magnitude × 50km impact radius

**Data**: Your `earthquake_events`, `tsunami_alerts`, `vessel_positions`, `fleets`

## Week 3 Day 4-5 + Week 4 Day 1: Alert Dispatch ✅ CRITICAL
**Effort**: 10-12h | **Details**: `WEEK3_DISPATCH.md`

- Enhance `lib/services/vessel-proximity-service.ts`
- Integrate with escalation system
- Multi-channel dispatch (SMS, WhatsApp, Email, Voice)
- Contact preference handling
- Alert templates

**Data**: Your BullMQ queue + notification services (Twilio, SendGrid, WhatsApp)

## Week 4 Day 2-3: Alert Acknowledgment UI ✅ HIGH
**Effort**: 8-10h | **Details**: `WEEK4_ACK_UI.md`

- UI: `/dashboard/active-alerts` - unacknowledged alerts list
- UI: `/dashboard/vessel-alerts/[id]` - alert detail + map
- Mobile-responsive design (captains use phones)
- One-click acknowledge + notes
- Real-time updates (polling/WebSocket)

## Week 4 Day 4-5: Testing & Monitoring ⚠️ MEDIUM
**Effort**: 8-10h | **Details**: `WEEK4_TESTING.md`

- Unit tests for services
- Integration tests (event → detection → dispatch → escalation)
- Load tests (100 vessels, 10 events)
- Monitoring dashboard (Winston + Prometheus/Grafana)
- Performance baseline documentation

---

# Week 5: Polish & Geo-Fencing (Days 1-5)

## Day 1-3: Custom Geo-Fence Configuration ⚠️ MEDIUM
**Effort**: 12-16h | **Details**: `WEEK5_CUSTOM_GEOFENCE.md`

- Create `GeoFence` table (circles, polygons, critical zones)
- Map-based editor using Leaflet (your existing mapping lib)
- Draw custom zones on map
- Per-zone alert radii
- API: CRUD `/api/geo-fences`
- UI: `/dashboard/geo-fences` with map editor

**Data**: OpenStreetMap (your mapping solution)

## Day 4-5: Integration Testing & Documentation ⚠️ MEDIUM
**Effort**: 8-10h

- End-to-end testing with real earthquake data
- Performance profiling
- User documentation
- Admin guide for escalation policies

---

# Week 6: Insurance Features (LOWER PRIORITY)

## Feature 1: Incident Tracking (Day 1-2)
**Effort**: 8-10h | **Details**: `WEEK6_FEATURE1_INCIDENTS.md`

- Create `SafetyIncident` table
- Auto-detect evasive action from position changes
- Manual incident reporting UI
- API: POST/GET `/api/safety-incidents`

**Data Sources**:
- Your `vessel_alerts` (risk awareness)
- Your `vessel_positions` (course/speed changes = evasive action)
- Manual reports via API

## Feature 2: Route Safety Score (Day 2-3)
**Effort**: 10-12h | **Details**: `WEEK6_FEATURE2_ROUTES.md`

- Create `RiskZone` and `RouteAnalysis` tables
- Import USGS seismic hazard zones (free data)
- Calculate risk exposure per route
- Service: `lib/services/route-risk-calculator.ts`

**Data Sources**:
- USGS Seismic Hazard Maps: https://earthquake.usgs.gov/hazards/hazmaps/
- Your `vessel_positions` (historical routes)
- Your `earthquake_events` (10 years of data)

## Feature 3: Response Time Analytics (Day 3-4)
**Effort**: 6-8h | **Details**: `WEEK6_FEATURE3_RESPONSE.md`

- Service: `lib/services/response-analytics.ts`
- Calculate: avg response time, acknowledgment rate, by-severity metrics
- Dashboard widget: `/dashboard/insurance/response-analytics`

**Data Sources**:
- Your `vessel_alerts` (createdAt → acknowledgedAt)
- Your `delivery_logs` (notification delivery times)
- Your `escalation_logs` (escalation metrics)

## Feature 6: Safe Harbor Identification (Day 4-5)
**Effort**: 10-12h | **Details**: `WEEK6_FEATURE6_SAFEHARBOR.md`

- Create `SafeHarbor` and `RouteRecommendation` tables
- Import World Port Index (NGA - free, 3,700+ ports)
- Service: `lib/services/safe-harbor-service.ts`
- Auto-recommend nearest safe ports or deep water zones

**Data Sources**:
- World Port Index: https://msi.nga.mil/Publications/WPI (CSV, free)
- NOAA Coastal Relief Model (water depth data)
- Your `vessel_positions` (current location)
- Your `earthquake_events` + `tsunami_alerts` (threat location)

**Safe Harbor Logic**:
- Tsunami: Recommend deep water (>200m) or move away from coast
- Earthquake: Recommend nearest safe port with adequate depth
- Calculate distance, bearing, ETA to safe harbor

---

# PM2 Ecosystem Configuration

Add to `ecosystem.config.js`:
```javascript
{
  name: 'stats-realtime',
  script: 'pnpm',
  args: 'stats:realtime',
  instances: 1,
  max_memory_restart: '256M'
},
{
  name: 'stats-vessels',
  script: 'pnpm',
  args: 'stats:vessels',
  instances: 1,
  max_memory_restart: '256M'
},
{
  name: 'escalation-monitor',
  script: 'pnpm',
  args: 'monitor:escalation',
  instances: 1,
  max_memory_restart: '128M'
},
{
  name: 'geo-fence-monitor',
  script: 'pnpm',
  args: 'monitor:geo-fence',
  instances: 1,
  max_memory_restart: '256M'
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "stats:realtime": "TZ=UTC tsx scripts/update-realtime-stats.ts",
    "stats:vessels": "TZ=UTC tsx scripts/update-vessel-stats.ts",
    "monitor:escalation": "TZ=UTC tsx scripts/escalation-monitor.ts",
    "monitor:geo-fence": "TZ=UTC tsx scripts/geo-fence-monitor.ts"
  }
}
```

---

# Success Metrics

### Critical Metrics
- **Alert Delivery Time**: < 60 seconds (event → first notification)
- **Escalation Accuracy**: 95%+ correct escalations
- **Acknowledgment Rate**: > 90% for critical alerts
- **False Positive Rate**: < 5%

### Performance Metrics
- **Dashboard Load Time**: < 2s (from 30s)
- **Geo-Fence Check Duration**: < 30s per cycle
- **Alert Dispatch Latency**: < 10s
- **Database Query Time**: < 500ms per query

---

# Questions to Clarify

1. **Fleet Size**: How many fleets? How many vessels per fleet?
2. **Contact Hierarchy**: Confirm roles (captain, ops manager, owner)?
3. **Escalation Timing**: Wait time before escalating? (5min? 15min?)
4. **Geo-Fence Radii**: Critical/High/Moderate distances in km?
5. **Insurance Priority**: Which features are most valuable?

---

# Next Steps

1. ✅ Review this roadmap
2. ✅ Clarify questions above
3. ✅ Read detailed implementation files:
   - `WEEK1_FLEET.md` - Fleet management implementation
   - `WEEK1_CONTACTS.md` - Contact assignment implementation
   - `WEEK1_PERFORMANCE.md` - Dashboard optimization
   - `WEEK1_CACHE.md` - Cache table pattern
   - `WEEK2_ESCALATION.md` - Escalation system
   - `WEEK3_GEOFENCE.md` - Auto-trigger monitoring
   - `WEEK3_DISPATCH.md` - Alert dispatch
   - `WEEK4_ACK_UI.md` - Acknowledgment UI
   - `WEEK5_CUSTOM_GEOFENCE.md` - Custom geo-fencing
   - `WEEK6_FEATURE1_INCIDENTS.md` - Incident tracking
   - `WEEK6_FEATURE2_ROUTES.md` - Route safety scoring
   - `WEEK6_FEATURE3_RESPONSE.md` - Response analytics
   - `WEEK6_FEATURE6_SAFEHARBOR.md` - Safe harbor recommendations
4. ✅ Start implementation Week 1 Day 1

**Ready to proceed!**
