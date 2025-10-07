# Earthquake Alerts Dashboard Improvements

## Overview
Completely refactored `/dashboard/alerts` (Earthquake Monitoring) to match the design sensibilities of `/dashboard/status` with real-time data feeds, consistent UI patterns, and source health monitoring.

## Key Improvements

### 1. Real-Time Data Feeds ✅
- **Fresh data**: Added `cache: 'no-store'` to all API fetches (`/api/alerts/history`, `/api/monitoring`, `/api/health`)
- **Live monitoring state**: Now reads actual monitoring status from `/api/monitoring` (previously hardcoded to "Active")
- **Fixed stats calculation**: `last24h` now correctly calculates from alert timestamps (was using same value as `total`)
- **Auto-refresh**: Continues to poll every 30 seconds with clear "Auto-refresh every 30s" label
- **Live/Pause control**: Users can pause updates with a toggle button in the header

### 2. WidgetCard Standardization ✅
All sections now use the `WidgetCard` component with consistent:
- **Icons and colors**: Semantic iconography (AlertTriangle=orange, Clock=blue, Activity=green/slate, Globe with various colors)
- **Subtitles**: Descriptive text under each title
- **Header actions**: Controls like Live/Pause and TimeRangeSwitcher in the header
- **Proper spacing**: Consistent padding, gaps, and layout

### 3. Source Health Monitoring ✅
Four new cards display real-time health of earthquake data sources:
- **USGS** (Globe/blue): Primary earthquake source with status, response time
- **EMSC** (Globe/cyan): European-Mediterranean Seismological Centre
- **JMA** (Globe/purple): Japan Meteorological Agency
- **IRIS** (Globe/green): Incorporated Research Institutions for Seismology
- Data fetched from `/api/health?detailed=true&record=true` every 30 seconds

### 4. Time Range Filter ✅
- **Range switcher**: 24h / 7d / 30d buttons to filter alerts by time window
- **Client-side filtering**: Efficient filtering using `useMemo` based on alert timestamps
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

### Modified
- **`app/dashboard/alerts/page.tsx`**: Complete refactor
  - Added imports: `WidgetCard`, `TimeRangeSwitcher`, health icons, `useMemo`
  - State: `timeRange`, `isPaused`, `monitoringActive`, `sourceHealth`
  - Three `useEffect` hooks for alerts, monitoring, and health
  - `filteredAlerts` computed with `useMemo`
  - Helper functions: `getStatusIcon`, `getStatusColor`
  - Fixed stats calculation: `last24h` now accurately counts alerts from last 24h
  - UI: All sections converted to `WidgetCard`

## Technical Details

### Fetch Strategy
```typescript
// All fetches now use cache: 'no-store'
fetch(`/api/alerts/history?limit=200&startDate=${thirtyDaysAgo}`, { cache: 'no-store' })
fetch('/api/monitoring', { cache: 'no-store' })
fetch('/api/health?detailed=true&record=true', { cache: 'no-store' })
```

### Fixed Stats Calculation
**Before:**
```typescript
// Wrong: both used same value
setStats({
  total: data.data?.overview?.totalAlerts || 0,
  last24h: data.data?.overview?.totalAlerts || 0 // Approximate
})
```

**After:**
```typescript
// Correct: calculates from actual timestamps
const now = Date.now()
const dayAgo = now - 24 * 60 * 60 * 1000

setStats({
  total: allAlerts.length,
  last24h: allAlerts.filter((a: any) => {
    const alertTime = new Date(a.timestamp).getTime()
    return alertTime > dayAgo
  }).length
})
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
  return alerts.filter(a => new Date(a.timestamp).getTime() >= since)
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
- Wrong stats: `last24h` used same value as `total`
- No source health visibility
- No time range filtering
- No pause control
- No clear auto-refresh indicator
- Basic fetch without cache control

### After
- Consistent `WidgetCard` throughout
- Live monitoring status from `/api/monitoring`
- Correct stats calculation from timestamps
- USGS/EMSC/JMA/IRIS health cards with response times
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
- Magnitude filters (e.g., 3.0+, 4.0+, 5.0+)
- Region/location filters
- Export to CSV
- Alert detail modal with depth, coordinates, data sources
- Map integration showing alert locations
- Notification sound on new high-magnitude alerts
- Comparison with historical averages

## Verification

### Build Status
✅ `pnpm run build` passes with no errors

### Acceptance Criteria
✅ Monitoring status reflects `/api/monitoring` accurately  
✅ Stats calculation correct: `last24h` counts alerts from last 24h  
✅ Alerts update within 30s when new data arrives  
✅ Range selector filters visible alerts (24h/7d/30d)  
✅ USGS/EMSC/JMA/IRIS statuses mirror `/api/health`  
✅ All blocks use `WidgetCard` with icons, colors, subtitles  
✅ Alerts list scrolls inside the card  
✅ Clear skeletons and empty state  
✅ Page matches visual grammar of `/dashboard/status`  

## Impact
- **User Experience**: Professional, consistent UI with clear status indicators
- **Data Accuracy**: Fixed stats calculation, always-fresh data
- **Transparency**: Users can see source health and monitoring state
- **Flexibility**: Time range filter for focused analysis
- **Control**: Live/Pause toggle for managing updates

## Commit Message
```
feat(alerts): refactor earthquake dashboard with WidgetCard, real-time feeds, source health

- Add cache: 'no-store' to all fetches for fresh data
- Read monitoring state from /api/monitoring (was hardcoded)
- Fix stats calculation: last24h now counts from timestamps
- Add USGS/EMSC/JMA/IRIS source health cards from /api/health
- Add TimeRangeSwitcher (24h/7d/30d) with client-side filtering
- Add Live/Pause toggle and auto-refresh label
- Convert all sections to WidgetCard with semantic icons/colors
- Match design sensibilities of /dashboard/status
- Internal scroll with 600px max height
- Reuse TimeRangeSwitcher component from tsunami improvements
```
