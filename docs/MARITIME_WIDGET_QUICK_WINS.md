# Maritime Widget - Quick Wins (Ship This Week)

## 🎯 Goal
Transform the Maritime Intelligence Widget from basic text display to a data-rich intelligence dashboard in 3-5 days.

---

## Priority 0: Surface Phase 1 Data (Day 1-2)

### Current Problem
✅ Phase 1 data sources (sea state, tidal, aftershock, SAR) are **already integrated** in the backend
❌ But they're **invisible to users** - only used in the AI prompt
❌ Users can't see WHY an event is prioritized or WHAT conditions are

### Solution: Environmental Dashboard Panel

**New Component:** `components/dashboard/EnvironmentalConditionsPanel.tsx`

Key features:
- 4-card grid showing sea state, tidal, aftershock, SAR
- Color-coded risk indicators
- Live data badges
- Tsunami amplification warnings
- ETA calculations

**Estimated effort:** 4-6 hours
**Impact:** HIGH - Surfaces $0 data sources users paid for

---

## Priority 1: Impact Score Visualization (Day 2)

### Current Problem
- Impact scoring exists but is hidden
- Users don't know why M4.8 Yukon = "negligible" but M7.2 Japan = "critical"
- No transparency into decision-making

### Solution: Score Breakdown Component

**New Component:** `components/dashboard/ImpactScoreBreakdown.tsx`

Show:
```
Total Score: 92/100

Geographic Factors:     35/40  [████████░]
 • Distance to coast: 20km
 • Water depth: 180m (shallow ⚠️)

Event Severity:         30/30  [████████]
 • Magnitude: 7.2
 • Tsunami warning active

Asset Impact:           22/25  [███████░]
 • 6 ports affected
 • 8 shipping lanes disrupted

Time Sensitivity:        5/5   [████████]
```

**Estimated effort:** 3-4 hours
**Impact:** HIGH - Builds user trust and understanding

---

## Priority 2: Quick Action Bar (Day 2)

### Current Problem
- No direct actions from the widget
- Users must navigate elsewhere to respond

### Solution: Action Buttons

Add to widget header:
```tsx
<div className="flex gap-2 mb-4">
  <button className="btn-sm">📞 Call Coast Guard</button>
  <button className="btn-sm">📤 Share Analysis</button>
  <button className="btn-sm">📄 Export PDF</button>
  <button className="btn-sm">🗺️ View on Map</button>
</div>
```

**Estimated effort:** 2-3 hours
**Impact:** MEDIUM - Increases widget utility

---

## Priority 3: Visual Timeline (Day 3)

### Current Problem
- No sense of how long impact will last
- No guidance on when to expect changes

### Solution: Timeline Visualization

```
IMMEDIATE (0-2h)
├─ Port evacuations in progress
├─ Vessel dispersal to deep water
└─ Emergency services on standby

SHORT-TERM (2-12h)
├─ Tsunami all-clear (4-6h)
├─ Damage assessment (6h)
└─ Port clearance (8-12h)

LONG-TERM (1-3d)
├─ Port reopening (12-24h)
└─ Full operations (48-72h)
```

**Estimated effort:** 4-5 hours
**Impact:** MEDIUM - Helps planning

---

## Priority 4: Collapsible Sections (Day 3-4)

### Current Problem
- Widget is very long for high-impact events
- Hard to scan quickly

### Solution: Accordion Sections

```tsx
<CollapsibleSection title="Port Status (6 affected)" defaultOpen={true}>
  {/* port cards */}
</CollapsibleSection>

<CollapsibleSection title="Vessel Guidance" defaultOpen={true}>
  {/* guidance */}
</CollapsibleSection>

<CollapsibleSection title="Environmental Data" defaultOpen={false}>
  {/* environmental panel */}
</CollapsibleSection>
```

**Estimated effort:** 3-4 hours
**Impact:** MEDIUM - Better UX for long content

---

## Priority 5: Enhanced Visual Design (Day 4-5)

### Current Problem
- Bland, text-heavy design
- No visual hierarchy
- Looks like a wall of text

### Solution: Design Improvements

**A. Severity Banner**
```tsx
<div className={`w-full p-4 rounded-t-xl font-bold text-white ${
  priority === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-700' :
  priority === 'high' ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
  'bg-gradient-to-r from-slate-600 to-slate-700'
}`}>
  <div className="flex items-center justify-between">
    <span>MARITIME IMPACT: {priority.toUpperCase()}</span>
    <span className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  </div>
</div>
```

**B. Data Cards**
- Use rounded cards with subtle shadows
- Color-code by severity
- Add icons for visual scanning
- Use gradients for depth

**C. Typography Hierarchy**
- H1: Widget title (text-lg font-bold)
- H2: Section headers (text-sm font-semibold)
- H3: Subsections (text-xs font-medium)
- Body: text-sm
- Metadata: text-xs text-slate-500

**Estimated effort:** 4-6 hours
**Impact:** HIGH - Professional appearance

---

## Implementation Order

### Day 1
- [ ] Create `EnvironmentalConditionsPanel.tsx`
- [ ] Create `/api/maritime/environmental` endpoint
- [ ] Integrate into `MaritimeIntelligenceWidget.tsx`
- [ ] Test with real events

### Day 2
- [ ] Create `ImpactScoreBreakdown.tsx`
- [ ] Add Quick Action Bar
- [ ] Test scoring display

### Day 3
- [ ] Create `ImpactTimeline.tsx`
- [ ] Create `CollapsibleSection.tsx`
- [ ] Integrate both components

### Day 4-5
- [ ] Apply design improvements
- [ ] Polish animations and transitions
- [ ] Mobile responsive testing
- [ ] User testing

---

## Code Checklist

### New Files to Create
```
components/dashboard/
├─ EnvironmentalConditionsPanel.tsx (NEW)
├─ ImpactScoreBreakdown.tsx (NEW)
├─ ImpactTimeline.tsx (NEW)
└─ CollapsibleSection.tsx (NEW)

app/api/maritime/
└─ environmental/
   └─ route.ts (NEW)

lib/types/
└─ maritime-environmental.ts (NEW)
```

### Files to Modify
```
components/dashboard/MaritimeIntelligenceWidget.tsx
├─ Add environmental data state
├─ Fetch environmental data in parallel
├─ Render new components
└─ Apply design improvements
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test environmental data formatting
describe('EnvironmentalConditionsPanel', () => {
  it('shows tsunami amplification warning when risk is high', () => {
    // ...
  })
  
  it('color-codes wave height by severity', () => {
    // ...
  })
})

// Test score breakdown
describe('ImpactScoreBreakdown', () => {
  it('calculates percentage correctly', () => {
    // ...
  })
  
  it('shows correct color for score ranges', () => {
    // ...
  })
})
```

### Integration Tests
```typescript
// Test full widget with environmental data
describe('MaritimeIntelligenceWidget integration', () => {
  it('fetches and displays environmental data', async () => {
    // Mock API responses
    // Verify all panels render
  })
  
  it('handles missing environmental data gracefully', async () => {
    // Mock partial failures
    // Verify widget still works
  })
})
```

### Manual Testing Scenarios
1. **Low-impact event** (M4.8 Yukon)
   - Should show compact view
   - Environmental panel optional
   - No tsunami warnings

2. **High-impact event** (M7.2 Japan)
   - Should show all panels
   - Environmental data prominent
   - Tsunami warnings visible
   - Score breakdown shows 90+

3. **Medium-impact event** (M5.5 Chile)
   - Some environmental data
   - Score ~40-60
   - Balanced display

---

## Success Metrics

### Before Enhancement
- Time to understand impact: 3-5 minutes
- Phase 1 data visibility: 0%
- User confidence: Low (based on feedback)
- Widget engagement: Basic

### After Enhancement
- Time to understand impact: <30 seconds
- Phase 1 data visibility: 100%
- User confidence: High (transparent scoring)
- Widget engagement: Interactive (actions, collapsible)

### Measurable KPIs
- [ ] Environmental panel loads in <500ms
- [ ] All 4 data sources visible
- [ ] Score breakdown always shown
- [ ] Mobile responsive (tested on 3 devices)
- [ ] Zero console errors
- [ ] Lighthouse accessibility score >90

---

## Next Steps (Week 2+)

### Phase 2 Enhancements
1. **Change Detection**
   - Highlight what changed since last update
   - Show diff in conditions

2. **Historical Comparison**
   - Compare to similar past events
   - Show typical impact duration

3. **Multi-Event Support**
   - Tabbed interface
   - Priority view of all events
   - Consolidated impact summary

4. **Export Functions**
   - PDF report generation
   - CSV data export
   - Email sharing

5. **Notifications**
   - Desktop push notifications
   - Email alerts for critical events
   - SMS integration

---

## Questions & Decisions Needed

1. **Quick Actions**: Which actions should be in the action bar?
   - Recommended: Call Coast Guard, Share, Export PDF, View Map

2. **Collapsible Defaults**: Which sections open by default?
   - Recommended: Port Status and Environmental (always open)
   - Recommended: Historical Context (collapsed)

3. **Mobile Priority**: What % of users are on mobile?
   - If >30%, prioritize mobile design in Day 4-5

4. **Export Format**: PDF, CSV, or both?
   - Recommended: Start with PDF (easier to share)

5. **Auto-refresh**: Should environmental data auto-refresh?
   - Recommended: Yes for critical events (60s), No for low-impact

---

## Resources & References

### Design Inspiration
- Stripe Dashboard (clean, data-dense)
- Airbnb Analytics (visual hierarchy)
- Bloomberg Terminal (information density)

### Technical Docs
- `docs/MARITIME_INTELLIGENCE_IMPROVEMENTS.md` - Original requirements
- `docs/MARITIME_WIDGET_MOCKUP.md` - Visual mockups
- `lib/maritime-impact-scorer.ts` - Scoring algorithm
- `lib/services/noaa-*.ts` - Phase 1 data sources

### Figma Mockups (if available)
- [Link to Figma designs]

---

## Support & Questions

- **Technical Lead**: Review code before merge
- **Product Manager**: Approve design changes
- **QA Team**: Test on staging before production
- **Users**: Beta testing group for feedback

---

**Ready to Ship**: This plan delivers 10x better UX with the data sources you already have. Start with Day 1 tasks and iterate based on user feedback.
