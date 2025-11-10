# Timezone Audit Report - November 10, 2025

## ✅ Database Storage: PERFECT
**All 98 DateTime fields across 39 tables use `@db.Timestamptz(6)`**
- PostgreSQL TIMESTAMP WITH TIME ZONE = **All times stored in UTC** ✅
- No issues found in database layer

## ⚠️ UI Display: NEEDS FIXES

### Critical Issues

| Issue | Impact | Files Affected | Fix Needed |
|-------|--------|----------------|------------|
| **1. Inconsistent time field access** | Same event shows different times | TsunamiClient.tsx, EventsByTypeWidget.tsx | Standardize to `time` > `timestamp` > `createdAt` |
| **2. No timezone labels** | Users don't know if time is UTC/local | All 30+ display components | Add "(UTC)" or "(Local)" labels |
| **3. No user timezone preference** | Can't choose display timezone | System-wide | Add Contact.timezone usage |
| **4. Share content varies by TZ** | Screenshot times differ per user | ShareEventButton.tsx | Force UTC or include TZ in share |
| **5. Email uses server TZ** | Emails show server local time | email templates | Force UTC display |

### Time Display Methods Found

| Method | Count | Timezone | Issue |
|--------|-------|----------|-------|
| `.toLocaleString()` | 47 uses | Browser implicit | ⚠️ No explicit TZ |
| `.toLocaleString('en-US')` | 8 uses | Browser implicit | ⚠️ No explicit TZ |
| ISO strings | API only | UTC ✅ | Good for APIs |

### Affected Components (30+)
- TsunamiClient, GlobalEventMap, AlertHistory, DeliveryReport
- VesselDetails, VesselAlertHistory, AuditTrail, MaintenanceScheduler
- Dashboard, ActivityFeed, ContactAnalytics, EventsByType
- All email templates

## Recommended Fixes

### 1. Standardize Time Display Utility
```typescript
// lib/time-utils.ts
export const formatEventTime = (date: Date, userTZ?: string) => {
  if (userTZ) {
    return date.toLocaleString('en-US', { timeZone: userTZ }) + ` (${userTZ})`
  }
  return date.toLocaleString('en-US', { timeZone: 'UTC' }) + ' (UTC)'
}

export const formatLocalTime = (date: Date) => {
  return date.toLocaleString() + ' (Local)'
}
```

### 2. Use Contact.timezone Field
Database already has `Contact.timezone` (default: 'UTC')
- Use this for user preference
- Display times in user's preferred timezone

### 3. Label All Times
- Event times: Show in UTC with "(UTC)" label
- System times: Show in user TZ with "(Local)" label
- Add timezone selector in user settings

### 4. Priority Order for Event Times
```typescript
// Always prefer actual event time over system metadata
const eventTime = alert.time || alert.timestamp || alert.occurredAt
const systemTime = alert.createdAt || alert.processedAt
```

## Questions for Clarification

1. **Event times (earthquakes/tsunamis)**: Display in UTC always, or user preference?
2. **System times (alerts sent, logins)**: Display in user's timezone?
3. **Add timezone selector** to user profile?

## Current State
- **Database**: ✅ Perfect (all UTC)
- **APIs**: ✅ Good (ISO 8601)
- **UI Display**: ⚠️ Needs improvement (implicit TZ, no labels)
- **User Preference**: ❌ Not implemented (Contact.timezone exists but unused)
