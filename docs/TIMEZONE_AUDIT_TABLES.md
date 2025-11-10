# Detailed Timezone Audit Tables

## Database Tables with DateTime Fields (Complete List)

| Table | Field | Type | Purpose | Event Time? | System Metadata? |
|-------|-------|------|---------|-------------|------------------|
| User | emailVerified | Timestamptz(6) | Email verification timestamp | No | Yes |
| User | lastLoginAt | Timestamptz(6) | Last login | No | Yes |
| User | approvedAt | Timestamptz(6) | Account approval | No | Yes |
| User | createdAt | Timestamptz(6) | Account creation | No | Yes |
| User | updatedAt | Timestamptz(6) | Last update | No | Yes |
| Session | expires | Timestamptz(6) | Session expiration | No | Yes |
| Session | createdAt | Timestamptz(6) | Session start | No | Yes |
| Session | updatedAt | Timestamptz(6) | Last activity | No | Yes |
| SmsOtp | expires | Timestamptz(6) | OTP expiration | No | Yes |
| SmsOtp | createdAt | Timestamptz(6) | OTP sent | No | Yes |
| SmsOtp | consumedAt | Timestamptz(6) | OTP used | No | Yes |
| Contact | createdAt | Timestamptz(6) | Contact added | No | Yes |
| Contact | updatedAt | Timestamptz(6) | Last update | No | Yes |
| **EarthquakeEvent** | **occurredAt** | Timestamptz(6) | **ACTUAL earthquake time** | **YES** ✅ | **No** |
| EarthquakeEvent | createdAt | Timestamptz(6) | DB record created | No | Yes |
| EarthquakeEvent | updatedAt | Timestamptz(6) | Last update | No | Yes |
| **TsunamiAlert** | **estimatedArrivalTime** | Timestamptz(6) | **Wave ETA** | **YES** ✅ | **No** |
| TsunamiAlert | cancellationTime | Timestamptz(6) | Alert cancelled | No | Yes |
| **TsunamiAlert** | **createdAt** | Timestamptz(6) | **Alert stored in DB** | **No** | **Yes** ⚠️ |
| AlertJob | scheduledFor | Timestamptz(6) | Send time | No | Yes |
| AlertJob | startedAt | Timestamptz(6) | Started | No | Yes |
| AlertJob | completedAt | Timestamptz(6) | Completed | No | Yes |
| AlertJob | createdAt | Timestamptz(6) | Job created | No | Yes |
| DeliveryLog | sentAt | Timestamptz(6) | Message sent | No | Yes |
| DeliveryLog | deliveredAt | Timestamptz(6) | Delivered | No | Yes |
| DeliveryLog | readAt | Timestamptz(6) | Read | No | Yes |
| DeliveryLog | lastAttemptAt | Timestamptz(6) | Last attempt | No | Yes |
| DeliveryLog | createdAt | Timestamptz(6) | Log created | No | Yes |
| **AlertLog** | **timestamp** | Timestamptz(6) | **Alert event time** | **YES** ✅ | **No** |
| AlertLog | createdAt | Timestamptz(6) | Log created | No | Yes |
| **EarthquakeCache** | **timestamp** | Timestamptz(6) | **Earthquake time** | **YES** ✅ | **No** |
| EarthquakeCache | createdAt | Timestamptz(6) | Cached at | No | Yes |
| **VesselPosition** | **timestamp** | Timestamptz(6) | **ACTUAL position time** | **YES** ✅ | **No** |
| VesselPosition | eta | Timestamptz(6) | Estimated arrival | Yes | No |
| VesselPosition | createdAt | Timestamptz(6) | Record created | No | Yes |
| Vessel | lastSeen | Timestamptz(6) | Last AIS | No | Yes |
| Vessel | enrichedAt | Timestamptz(6) | Data enriched | No | Yes |
| VesselAlert | sentAt | Timestamptz(6) | Alert sent | No | Yes |
| VesselAlert | expiresAt | Timestamptz(6) | Alert expires | No | Yes |
| VesselAlert | acknowledgedAt | Timestamptz(6) | Acknowledged | No | Yes |
| VesselAlert | resolvedAt | Timestamptz(6) | Resolved | No | Yes |
| VesselAlert | createdAt | Timestamptz(6) | Alert created | No | Yes |
| MaintenanceWindow | startTime | Timestamptz(6) | Maintenance start | Yes | No |
| MaintenanceWindow | endTime | Timestamptz(6) | Maintenance end | Yes | No |
| HealthSnapshot | createdAt | Timestamptz(6) | Health check time | No | Yes |
| EscalationLog | attemptedAt | Timestamptz(6) | Attempted | No | Yes |
| EscalationLog | deliveredAt | Timestamptz(6) | Delivered | No | Yes |
| EscalationLog | acknowledgedAt | Timestamptz(6) | Acknowledged | No | Yes |

**Legend:**
- **Event Time**: The actual time the real-world event occurred (earthquake, position report, etc.)
- **System Metadata**: When our system processed/stored the data

## UI Components Displaying Time (Complete List)

| File | Line(s) | Method | Field Accessed | Timezone | Label? |
|------|---------|--------|----------------|----------|--------|
| app/dashboard/tsunami/TsunamiClient.tsx | 816 | toLocaleString() | processedAt ❌ | Browser | No |
| components/dashboard/GlobalEventMap.tsx | 602 | toLocaleString() | timestamp | Browser | No |
| components/dashboard/UnifiedIncidentTimeline.tsx | 226 | toLocaleString() | timestamp | Browser | No |
| components/dashboard/AuditTrailLogger.tsx | 175 | toLocaleString() | timestamp | Browser | No |
| components/dashboard/ContactEngagementAnalytics.tsx | 78 | toLocaleString() | timestamp | Browser | No |
| components/status/MaintenanceScheduler.tsx | 267 | toLocaleString() | startTime, endTime | Browser | No |
| components/shared/ShareEventButton.tsx | 29-30 | toLocaleString() | time | Browser | No ⚠️ |
| components/dashboard/RealTimeActivityFeed.tsx | Multiple | toLocaleString() | timestamp | Browser | No |
| components/dashboard/EventsByTypeWidget.tsx | 108 | Time filter | processedAt ❌ | N/A | N/A |
| app/dashboard/alerts/page.tsx | 165 | toLocaleString() | timestamp | Browser | No |
| app/dashboard/delivery-report/page.tsx | 164 | toLocaleString() | sentAt | Browser | No |
| app/dashboard/page.tsx | 145 | toLocaleString() | timestamp | Browser | No |
| app/dashboard/vessels/[id]/page.tsx | 233 | toLocaleString() | lastSeen | Browser | No |
| components/vessels/VesselAlertHistory.tsx | 212 | toLocaleString() | createdAt | Browser | No |
| app/dashboard/alert-jobs/page.tsx | 165-166 | toLocaleString() | startedAt, completedAt | Browser | No |
| lib/date-utils.ts | 4-26 | toLocaleString() | Generic | Browser | No |
| lib/services/email-service.ts | 213 | toLocaleString() | Current time | Server | No ⚠️ |
| lib/email-templates/tsunami-alert.ts | 112 | toLocaleString('en-US') | estimatedArrival | Server | No ⚠️ |
| lib/email-templates/earthquake-alert.ts | 42 | toLocaleString('en-US') | time | Server | No ⚠️ |
| lib/services/tsunami-service.ts | 394 | toLocaleString() | estimatedArrivalTime | Server | No |
| lib/services/template-service.ts | 341-343 | toLocaleString() | timestamp, eta | Server | No |
| lib/services/whatsapp-service.ts | 202 | toLocaleString() | Current time | Server | No |
| lib/earthquake-service.ts | 106 | toLocaleString() | time | Server | No |
| lib/tsunami-monitor.ts | 298 | toLocaleString() | Current time | Server | No |
| lib/alert-manager.ts | 215, 463 | toLocaleString() | timestamp, time | Server | No |

## Time Field Confusion Analysis

### TsunamiAlert - Multiple Time Fields

**Issue**: Tsunami alerts have multiple time fields with different meanings:

| Field | Meaning | Source | Should Display? |
|-------|---------|--------|-----------------|
| `time` | Actual event time from CAP feed | External source | ✅ YES (primary) |
| `timestamp` | Actual event time from CAP feed | External source | ✅ YES (primary) |
| `processedAt` | When we stored it in DB | Our system | ⚠️ Only for debug |
| `createdAt` | When we created DB record | Our system | ⚠️ Only for debug |
| `estimatedArrivalTime` | Wave ETA | External source | ✅ YES (if present) |

**Current Problem**: Components access these fields in different orders, causing timestamp inconsistencies.

### Earthquake - Multiple Time Fields

| Field | Meaning | Source | Should Display? |
|-------|---------|--------|-----------------|
| `occurredAt` | Actual earthquake time | External source | ✅ YES (primary) |
| `time` | Same as occurredAt | External source | ✅ YES (primary) |
| `timestamp` | Same as occurredAt | External source | ✅ YES (primary) |
| `createdAt` | When we created DB record | Our system | ⚠️ Only for debug |
| `updatedAt` | Last DB update | Our system | ⚠️ Only for debug |

## Browser Timezone Behavior

### `.toLocaleString()` without parameters

```typescript
new Date('2025-11-10T12:53:00Z').toLocaleString()
// User in IST (UTC+5:30): "11/10/2025, 6:23:00 PM"
// User in PST (UTC-8:00): "11/10/2025, 4:53:00 AM"  
// User in UTC: "11/10/2025, 12:53:00 PM"
```

**Problem**: Same timestamp shows differently for each user, with no indication of timezone.

### `.toLocaleString()` with timezone

```typescript
new Date('2025-11-10T12:53:00Z').toLocaleString('en-US', { timeZone: 'UTC' })
// Everyone sees: "11/10/2025, 12:53:00 PM"

new Date('2025-11-10T12:53:00Z').toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
// Everyone sees: "11/10/2025, 6:23:00 PM"
```

**Solution**: Always specify timezone parameter.

## Recommendations

### 1. Standardize Event Time Access

```typescript
// For earthquakes
const eventTime = earthquake.occurredAt || earthquake.time || earthquake.timestamp

// For tsunamis  
const eventTime = tsunami.time || tsunami.timestamp || tsunami.processedAt

// For vessel positions
const eventTime = position.timestamp
```

### 2. Display Format Standards

```typescript
// Event times (earthquakes, tsunamis) - always UTC
const displayTime = eventTime.toLocaleString('en-US', { 
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'long'
}) + ' UTC'

// System times (alerts sent, logins) - user's timezone from Contact.timezone
const displayTime = systemTime.toLocaleString('en-US', {
  timeZone: userTimezone || 'UTC',
  dateStyle: 'medium',
  timeStyle: 'long'
}) + ` (${userTimezone || 'UTC'})`
```

### 3. Contact Timezone Usage

Database already has `Contact.timezone` field (default: 'UTC').
- Use this for user preference
- Allow users to change in profile settings
- Display all system times in user's preferred timezone
- Keep event times in UTC for consistency

### 4. Add Timezone Labels

Every displayed time must have a label:
- `12:53 PM UTC` for event times
- `6:23 PM IST` for user-local times
- `12:53 PM (Local)` when showing browser timezone
