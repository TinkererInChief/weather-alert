# Timezone Migration Guide

## ✅ Phase 1 Complete
- Created `lib/time-display.ts` - Core utilities
- Created `components/shared/DualTimeDisplay.tsx` - React components

## ✅ Phase 2 In Progress - Components Migrated (7/30+)

### Batch 1 (High Priority)
1. ✅ **TsunamiClient.tsx** - Tsunami alert cards (example)
2. ✅ **ShareEventButton.tsx** - CRITICAL: Shared content consistent
3. ✅ **GlobalEventMap.tsx** - Map hover tooltips
4. ✅ **UnifiedIncidentTimeline.tsx** - Timeline tooltips

### Batch 2 (Dashboard Pages)
5. ✅ **DashboardClient.tsx** - Critical tsunami banner
6. ✅ **VesselAlertsClient.tsx** - Vessel alert timestamps
7. ✅ **EventsByTypeWidget.tsx** - Already fixed

## Migration Pattern

### Before
```typescript
{new Date(alert.time).toLocaleString()}
```

### After
```typescript
import { EventTimeDisplay } from '@/components/shared/DualTimeDisplay'
import { getEventTime } from '@/lib/time-display'

<EventTimeDisplay 
  date={getEventTime(alert)} 
  format="inline"
  showIcon={true}
/>
```

## Result
**Before**: `11/10/2025, 6:23:00 PM` (varies by user)
**After**: `12:53 PM UTC • 6:23 PM IST (Your Time)` (consistent + labeled)

## Remaining Components (~23)

### High Priority
- AlertsClient.tsx (multiple timestamps)
- communications/tabs/* (DeliveryLogsTab, VesselAlertsTab)
- tsunami-test/page.tsx

### Medium Priority  
- audit/page.tsx
- notifications/page.tsx
- vessel pages with timestamps

### Low Priority
- Email templates (3 files)
- Analytics pages
- Audit logs

## Next Steps
1. Continue migrating remaining dashboard pages
2. Update email templates to use UTC explicitly
3. Consider adding timezone selector to user profile
4. Test all migrations in browser
