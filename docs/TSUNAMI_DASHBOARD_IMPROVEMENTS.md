# Tsunami Dashboard Improvements

## Overview
Completely refactored `/dashboard/tsunami` to match the design sensibilities of `/dashboard/status` with real-time data feeds, consistent UI patterns, and source health monitoring.

## Key Improvements

### 1. Real-Time Data Feeds ✅
- **Fresh data**: Added `cache: 'no-store'` to all API fetches to ensure data is always current
- **Live monitoring state**: Now reads actual monitoring status from `/api/tsunami/monitor` (previously hardcoded to "Active")
- **Auto-refresh**: Continues to poll every 30 seconds with clear "Auto-refresh every 30s" label
- **Live/Pause control**: Users can pause updates with a toggle button in the header

### 2. WidgetCard Standardization ✅
All sections now use the `WidgetCard` component with consistent:
- **Icons and colors**: Semantic iconography (Waves=blue, Clock=cyan, Activity=green/slate, Wifi=blue, Globe=cyan)
- **Subtitles**: Descriptive text under each title
- **Header actions**: Controls like Live/Pause and TimeRangeSwitcher in the header
- **Proper spacing**: Consistent padding, gaps, and layout

### 3. Source Health Monitoring ✅
Two new cards display real-time health of tsunami data sources:
- **NOAA Tsunami**: Primary source with status (Operational/Degraded/Down), response time, last check time, and error details
- **PTWC**: Pacific Tsunami Warning Center with same health metrics
- Data fetched from `/api/health?detailed=true&record=true` every 30 seconds

### 4. Time Range Filter ✅
- **Range switcher**: 24h / 7d / 30d buttons to filter alerts by time window
- **Client-side filtering**: Efficient filtering using `useMemo` based on `processedAt|createdAt|timestamp|time` fields
- **Dynamic count**: Subtitle shows filtered count: "X alerts in selected range"

### 5. Design Parity with Status Page ✅
Matched visual patterns from `/dashboard/status`:
- Consistent card layouts with hover effects
- Status badges with semantic colors (green/yellow/red)
- Icons with background circles
- "Auto-refresh every 30s" affordance
- Range switcher in header
- Live/Pause toggle
- Internal scroll within cards (600px max height)
- Skeleton loading states
- Polished empty state with icon and message

## Files Changed

### Created
- **`components/status/TimeRangeSwitcher.tsx`**: New component for 24h/7d/30d range selection (similar to `RangeSwitcher` but with different ranges)

### Modified
- **`app/dashboard/tsunami/page.tsx`**: Complete refactor
  - Added imports: `WidgetCard`, `TimeRangeSwitcher`, health icons
  - State: `timeRange`, `isPaused`, `monitoringActive`, `sourceHealth`
  - Three `useEffect` hooks for alerts, monitoring, and health
  - `filteredAlerts` computed with `useMemo`
  - Helper functions: `getStatusIcon`, `getStatusColor`
  - UI: All sections converted to `WidgetCard`

## Technical Details

### Fetch Strategy
```typescript
// All fetches now use cache: 'no-store'
fetch('/api/tsunami', { cache: 'no-store' })
fetch('/api/tsunami/monitor', { cache: 'no-store' })
fetch('/api/health?detailed=true&record=true', { cache: 'no-store' })
```

### Time Range Filtering
```typescript
const filteredAlerts = useMemo(() => {
  const now = Date.now()
  const timeWindows = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const since = now - timeWindows[timeRange]
  return alerts.filter(a => getAlertTime(a) >= since)
}, [alerts, timeRange])
```

### Status Mapping
- Maps `healthy|ok` → green (Operational)
- Maps `warning|degraded` → yellow (Degraded)
- Maps `critical|error|unhealthy` → red (Down)
- Unknown states → gray

## Before & After

### Before
- Ad hoc card styling with inconsistent padding
- Hardcoded "Active" monitoring status
- No source health visibility
- No time range filtering
- No pause control
- No clear auto-refresh indicator
- Basic fetch without cache control

### After
- Consistent `WidgetCard` throughout
- Live monitoring status from API
- NOAA/PTWC health cards with response times
- 24h/7d/30d time range switcher
- Live/Pause toggle in header
- "Auto-refresh every 30s" label
- `cache: 'no-store'` on all fetches

## Design Sensibilities Matched
- ✅ Semantic iconography
- ✅ Color-coded status badges
- ✅ Consistent card hover effects
- ✅ Internal scroll with fixed heights
- ✅ Header actions (Live/Pause, Range switcher)
- ✅ Descriptive subtitles
- ✅ Auto-refresh labels
- ✅ Empty states with icons
- ✅ Loading skeletons
- ✅ Response time metrics
- ✅ Last checked timestamps
- ✅ Error display with red backgrounds

## Future Enhancements (Optional)
- Server-Sent Events (SSE) for instant push notifications
- Severity filters (Warning/Watch/Advisory)
- Region filters
- Export to CSV
- Alert detail modal with full metadata
- Map integration showing alert locations
- Notification sound on new critical alerts

## Verification

### Build Status
✅ `pnpm run build` passes with no errors

### Acceptance Criteria
✅ Monitoring status reflects `/api/tsunami/monitor` accurately  
✅ Alerts update within 30s when new data arrives  
✅ Range selector filters visible alerts (24h/7d/30d)  
✅ NOAA/PTWC statuses mirror `/api/health`  
✅ All blocks use `WidgetCard` with icons, colors, subtitles  
✅ Alerts list scrolls inside the card  
✅ Clear skeletons and empty state  
✅ Page matches visual grammar of `/dashboard/status`  

## Impact
- **User Experience**: Professional, consistent UI with clear status indicators
- **Data Freshness**: `cache: 'no-store'` ensures always-fresh data
- **Transparency**: Users can see source health and monitoring state
- **Flexibility**: Time range filter for focused analysis
- **Control**: Live/Pause toggle for managing updates

## Commit Message
```
feat(tsunami): refactor dashboard with WidgetCard, real-time feeds, source health

- Add cache: 'no-store' to all fetches for fresh data
- Read monitoring state from /api/tsunami/monitor
- Add NOAA/PTWC source health cards from /api/health
- Add TimeRangeSwitcher (24h/7d/30d) with client-side filtering
- Add Live/Pause toggle and auto-refresh label
- Convert all sections to WidgetCard with semantic icons/colors
- Match design sensibilities of /dashboard/status
- Internal scroll with 600px max height
- Create TimeRangeSwitcher component for tsunami-specific ranges
```
