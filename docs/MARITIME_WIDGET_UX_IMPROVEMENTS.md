# Maritime Impact Analysis Widget - UX Improvements

## Problem Statement

The Maritime Impact Analysis widget was pushing critical map visualizations below the fold, creating poor UX when:
1. The widget loaded fully expanded for M6.0+ earthquakes
2. Multiple competing events needed to be displayed
3. Users needed to see maps immediately upon dashboard load

## Solution: 3-Tier Adaptive Display System

### **Tier 1: Critical Alerts (Score ≥ 70)**
**Behavior**: Auto-expanded with visual emphasis
- Red border and subtle background highlight
- Fully expanded by default
- Cannot be collapsed (user needs to see critical information)
- Positioned strategically but won't hide maps

**Visual Indicator**:
```
┌─────────────────────────────────────────────────────┐
│ 🚨 Maritime Impact Analysis          [CRITICAL] 85/100│
│ M7.2 Southern California Coast                      │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ [Full impact breakdown, environmental conditions]    │
│ [Port status, vessel guidance, shipping routes]      │
│ [Emergency contacts and detailed analysis]           │
└─────────────────────────────────────────────────────┘
```

### **Tier 2: Moderate Impact (Score 30-69)**
**Behavior**: Collapsible card, **starts collapsed** by default
- Compact header showing key information
- Chevron indicator showing expand/collapse state
- Click anywhere on header to toggle
- Preserves vertical space until user needs details

**Collapsed State**:
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Maritime Impact Analysis    [HIGH] 56/100  [▼]  │
│ M6.8 Southern California Coast (Click to expand)    │
└─────────────────────────────────────────────────────┘
```

**Expanded State**: Shows full analysis (same as Tier 1 but without red emphasis)

### **Tier 3: Low Impact (Score < 30)**
**Behavior**: Minimal dismissible banner
- Single-line compact display
- Shows basic info with optional details link
- Dismissible with X button
- Once dismissed, stays hidden for that event

**Display**:
```
┌─────────────────────────────────────────────────────┐
│ ℹ️  Negligible maritime impact • M5.2 Location      │
│                              [Details] [✕ Dismiss]  │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### State Management
```typescript
const [isExpanded, setIsExpanded] = useState(false)
const [isDismissed, setIsDismissed] = useState(false)

// Auto-expand only for critical events
useEffect(() => {
  if (impactScore && impactScore.totalScore >= 70) {
    setIsExpanded(true) // Critical alerts auto-expand
  }
}, [impactScore])
```

### Collapsible Logic
- **Critical (≥70)**: Always expanded, no collapse control shown
- **Moderate (30-69)**: Starts collapsed, chevron icon shows expand/collapse
- **Low (<30)**: Compact banner, optional details on demand

### Visual Hierarchy
1. **Critical**: Red border, background tint, full display
2. **Moderate**: Standard card, collapsible header
3. **Low**: Subtle banner, minimal space

## Benefits

### ✅ Maps Stay Above the Fold
- Low and moderate impact events don't push content down
- Critical events still get full visibility when warranted
- User can scroll to expanded content if interested

### ✅ Progressive Disclosure
- Only show full details when impact score justifies it
- User controls moderate events (click to expand)
- Low impact events can be dismissed entirely

### ✅ Better Multi-Event Handling
- Multiple moderate events can coexist as collapsed cards
- User can expand whichever event they want to investigate
- Doesn't create overwhelming vertical space

### ✅ Improved Scan ability
- Quick visual indicators (badges, colors) show severity
- Header provides enough info for initial assessment
- Details available on demand

## Handling Multiple Events

When multiple earthquakes trigger the widget:

### Current Implementation (Single Event)
```typescript
{(recentAlerts.some(a => a.magnitude >= 6.0) || criticalTsunamiAlert) && (
  <MaritimeIntelligenceWidget
    earthquakeData={recentAlerts[0]} // Only shows first event
  />
)}
```

### Recommended Enhancement (Future)
Create a wrapper component that handles multiple events:

```typescript
<MaritimeEventsList>
  {significantEvents.map(event => (
    <MaritimeIntelligenceWidget
      key={event.id}
      earthquakeData={event}
      defaultCollapsed={event.impactScore < 70}
    />
  ))}
</MaritimeEventsList>
```

This would show:
- All critical events expanded
- All moderate events collapsed
- All low events as dismissible banners

## Placement Strategy

### Current Best Practice
Place the widget **after** the welcome banner but **before** the maps:
```
1. Welcome Banner
2. Critical Tsunami Alert (if any)
3. Maritime Intelligence (compact for low/moderate, full for critical)
4. Maps & Timeline (always visible above fold)
5. Other widgets below
```

### Alternative for Critical Events Only
For ultimate map visibility, show maritime widget only when score ≥ 70:
```typescript
{impactScore && impactScore.totalScore >= 70 && (
  <MaritimeIntelligenceWidget ... />
)}
```
Lower priority events accessible via a dedicated maritime dashboard link.

## User Interaction Flows

### Flow 1: Low Impact Event
1. User lands on dashboard
2. Sees compact banner: "Negligible maritime impact • M5.2"
3. Can dismiss or click "Details" if curious
4. Maps immediately visible

### Flow 2: Moderate Impact Event
1. User lands on dashboard
2. Sees collapsed card showing "HIGH - 56/100"
3. Maps immediately visible below
4. User clicks header to expand if interested
5. Full analysis slides into view

### Flow 3: Critical Impact Event
1. User lands on dashboard
2. Sees expanded card with red border
3. Full analysis immediately visible
4. Maps slightly lower but still accessible
5. User scrolls naturally to see both

## Performance Considerations

- **Lazy loading**: Full AI intelligence only fetched for score ≥ 50
- **Environmental data**: Lightweight fetch for all events
- **State persistence**: Collapsed state maintained during dashboard session
- **Smooth transitions**: CSS transitions for expand/collapse animations

## Accessibility

- **Keyboard navigation**: Enter/Space to toggle collapsed state
- **Screen readers**: Proper ARIA labels for expand/collapse controls
- **Focus management**: Focus maintained when expanding/collapsing
- **Color contrast**: All severity indicators meet WCAG AA standards

## Analytics & Monitoring

Track user interactions:
- Expand rate for moderate events
- Dismiss rate for low impact events
- Time spent on expanded maritime analysis
- Correlation between impact score and user engagement

## Future Enhancements

1. **Smart Positioning**: Use viewport detection to adjust placement
2. **Sticky Header**: Keep severity badge visible while scrolling
3. **Quick Actions**: Add "Notify Vessels" button in header for critical events
4. **Historical Comparison**: Show "similar to [past event]" in header
5. **Multi-Event Summary**: Aggregate view when 3+ events active
6. **User Preferences**: Remember user's expand/collapse preferences

## Conclusion

The 3-tier system balances:
- **Urgency**: Critical events get full attention
- **Efficiency**: Moderate events don't dominate viewport
- **Choice**: Users control what they investigate
- **Performance**: Lazy loading and progressive disclosure

This approach ensures maps stay above the fold while surfacing maritime intelligence appropriately based on actual risk level.
