# Timezone Migration Guide

## ✅ Phase 1 Complete
- Created `lib/time-display.ts` - Core utilities
- Created `components/shared/DualTimeDisplay.tsx` - React components
- Migrated `TsunamiClient.tsx` as example

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

## Components to Migrate (30+)
- HIGH: GlobalEventMap, ShareEventButton, EventsByTypeWidget
- MEDIUM: Dashboard, AlertHistory, VesselDetails
- LOW: AuditLogs, Analytics

## Next Steps
1. Migrate high-priority components
2. Update email templates
3. Add timezone selector to user settings
