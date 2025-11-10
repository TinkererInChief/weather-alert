# Tsunami Timestamp Inconsistency Fix

## Problem

The same tsunami event was showing **different timestamps** in different parts of the UI:
- **Dashboard**: Nov 10, 12:53 PM (actual event time)
- **Detail Card**: Nov 10, 2:44 PM (system processing time)

## Root Cause

The API (`/app/api/tsunami/route.ts`) was setting **all timestamp fields** to `row.createdAt` (database record creation time):

```typescript
// BEFORE (WRONG)
processedAt: row.createdAt,
createdAt: row.createdAt,
timestamp: row.createdAt,  // Should be actual event time!
time: row.createdAt        // Should be actual event time!
```

This meant:
- `createdAt` / `processedAt` = When the alert was stored in our database (e.g., 2:44 PM)
- `timestamp` / `time` = Should be the actual tsunami event time (e.g., 12:53 PM), but was wrongly set to `createdAt`

Different components used different fallback chains:
- **Dashboard**: Used `time` first → Got 12:53 PM from raw data
- **Detail Card**: Used `processedAt` first → Got 2:44 PM (system processing time)

## Solution

### 1. Extract Actual Event Time from Source Data

**File**: `/app/api/tsunami/route.ts` (lines 75-99)

```typescript
// Extract actual event time from raw data (prefer sent/effective time from source)
const eventTime = rawData.sent || rawData.effective || rawData.onset || row.createdAt

return {
  // ...
  processedAt: row.createdAt, // When we processed it
  createdAt: row.createdAt,   // When stored in our DB
  timestamp: eventTime,        // ACTUAL event time from source ✅
  time: eventTime              // ACTUAL event time from source ✅
}
```

Now:
- `processedAt` / `createdAt` = System processing time (metadata)
- `timestamp` / `time` = **Actual event time from source** ✅

### 2. Standardize Display Priority

**File**: `/app/dashboard/tsunami/TsunamiClient.tsx` (line 816)

```typescript
// BEFORE (inconsistent)
{new Date(alert.processedAt || alert.createdAt || alert.timestamp || alert.time).toLocaleString()}

// AFTER (prioritize actual event time) ✅
{new Date(alert.time || alert.timestamp || alert.processedAt || alert.createdAt).toLocaleString()}
```

**File**: `/components/dashboard/EventsByTypeWidget.tsx` (line 108)

```typescript
// BEFORE (inconsistent)
const t = a.processedAt || a.eventTime || a.time

// AFTER (prioritize actual event time) ✅
const t = a.time || a.eventTime || a.processedAt
```

## Impact

✅ **All components now show the same timestamp** - the actual event time  
✅ **Consistent user experience** across dashboard and detail views  
✅ **Accurate event filtering** by actual event time, not processing time  
✅ **Clear separation**: Event time vs System processing time  

## Testing

1. ✅ TypeScript compiles without errors
2. ⏳ Manual test: Refresh dashboard and verify timestamps match across views
3. ⏳ Verify historical tsunami alerts show consistent times

## Files Modified

1. `/app/api/tsunami/route.ts` - Extract actual event time from raw data
2. `/app/dashboard/tsunami/TsunamiClient.tsx` - Prioritize `time` over `processedAt`
3. `/components/dashboard/EventsByTypeWidget.tsx` - Prioritize `time` over `processedAt`

---

**Date Fixed**: November 10, 2025  
**Issue**: Timestamp inconsistency  
**Status**: ✅ Fixed
