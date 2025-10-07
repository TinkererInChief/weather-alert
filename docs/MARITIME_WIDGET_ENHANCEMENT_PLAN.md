# Maritime Impact Analysis Widget - Enhancement Plan

## Overview
Transform the Maritime Intelligence Widget from a basic text display into a data-rich, visually engaging intelligence dashboard that integrates all Phase 1 data sources and provides actionable insights.

---

## Phase A: Enhanced Visual Design (Priority 1)

### A1. Multi-tier Severity Display
**Current:** Simple badge with text
**Improved:** 
- Large color-coded severity banner at top
- Impact score gauge (0-100) with color transitions
- Risk level indicator with icon
- Live status badge with timestamp

```tsx
┌─────────────────────────────────────────────────┐
│ MARITIME IMPACT ANALYSIS          [CRITICAL 🔴] │
│ M7.2 Pacific Ocean - 180km E of Tokyo, Japan    │
│                                                  │
│ ┌─ IMPACT SCORE ────────────────────────┐       │
│ │  [████████████████░░] 92/100          │       │
│ │  🔴 CRITICAL RISK                     │       │
│ │  🟢 Live • Updated 2m ago             │       │
│ └───────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

### A2. Environmental Conditions Dashboard (NEW)
**Integration:** Display Phase 1 data sources visually

```tsx
┌─ REAL-TIME CONDITIONS ────────────────────────┐
│ 🌊 Sea State (NOAA Station 46042)             │
│    Wave Height: 4.2m ⚠️  Wind: 12.5 m/s       │
│    Water Temp: 18.3°C  Pressure: 1013 mb     │
│                                               │
│ 🌀 Tidal Conditions (Tokyo Bay)               │
│    Current: Rising (+1.2m/hr)                │
│    High Tide: 30 min (2.8m)                  │
│    ⚠️ TSUNAMI AMPLIFICATION RISK: HIGH       │
│    Combined wave height: 6.5m potential      │
│                                               │
│ ⚡ Aftershock Forecast (USGS)                 │
│    Next 24h: 70% chance M6.5+ aftershock     │
│    Next 7d:  90% chance M5.0+ events         │
│    Peak risk: 6-12 hours from now            │
│                                               │
│ 🚁 SAR Resources (Nearest)                    │
│    Japan Coast Guard: 85km NE (ETA 20 min)   │
│    Salvage Tug: 120km S (ETA 45 min)         │
│    Helicopter: On standby                    │
└───────────────────────────────────────────────┘
```

### A3. Impact Score Breakdown (NEW)
**Show scoring components so users understand the priority**

```tsx
┌─ IMPACT ANALYSIS BREAKDOWN ──────────────────┐
│ Total Score: 92/100                           │
│                                               │
│ Geographic Factors:        35/40              │
│  • Proximity to coast: 20km        [████████] │
│  • Water depth: 180m shallow       [██████░░] │
│  • Ocean location: Pacific         [████████] │
│                                               │
│ Event Severity:            30/30              │
│  • Magnitude: 7.2                  [████████] │
│  • Tsunami warning: Active         [████████] │
│                                               │
│ Asset Impact:              22/25              │
│  • Ports affected: 6               [███████░] │
│  • Shipping lanes: 8               [███████░] │
│  • Traffic density: High           [███████░] │
│                                               │
│ Time Sensitivity:          5/5                │
│  • Recent event (<1h)              [████████] │
│  • Auto-refresh: 60s               [████████] │
└───────────────────────────────────────────────┘
```

### A4. Visual Timeline (NEW)
**Show impact progression and expected resolution**

```tsx
┌─ IMPACT TIMELINE ─────────────────────────────┐
│                                               │
│ IMMEDIATE (0-2 hours)                         │
│ ├─ Port evacuations in progress               │
│ ├─ Vessel dispersal to deep water             │
│ └─ Emergency services on standby              │
│                                               │
│ SHORT-TERM (2-12 hours)                       │
│ ├─ Tsunami all-clear expected (4-6h)          │
│ ├─ Damage assessment begins (6h)              │
│ ├─ Aftershock monitoring (peak 6-12h)         │
│ └─ Port inspection & clearance (8-12h)        │
│                                               │
│ LONG-TERM (1-3 days)                          │
│ ├─ Port reopening (12-24h)                    │
│ ├─ Route normalization (24-48h)               │
│ └─ Full operations restored (48-72h)          │
│                                               │
│ ⏱️ Estimated Total Duration: 2-3 days         │
└───────────────────────────────────────────────┘
```

### A5. Quick Action Bar (NEW)
**Prominent action buttons at the top**

```tsx
┌─ QUICK ACTIONS ───────────────────────────────┐
│ [🔔 Alert Fleet] [📞 Coast Guard] [📍 Map]   │
│ [📤 Share] [📄 Export PDF] [⚙️ Settings]      │
└───────────────────────────────────────────────┘
```

---

## Phase B: Data Integration Enhancements (Priority 2)

### B1. Live Data Indicators
**Show real-time status and data freshness**

```tsx
🟢 LIVE • Updated 2m ago • Auto-refresh: 60s
Sea State: Fresh (5m) • Tidal: Fresh (3m) • SAR: Fresh (1m)
```

### B2. Change Detection (NEW)
**Highlight what's changed since last update**

```tsx
┌─ CHANGES IN LAST 15 MINUTES ──────────────────┐
│ • Port of Yokohama: open → monitoring (5m ago)│
│ • Tokyo Bay route: added to affected (8m ago) │
│ • Wave height increased: 3.8m → 4.2m (3m ago) │
│ • New aftershock M5.2 detected (12m ago)      │
└───────────────────────────────────────────────┘
```

### B3. Risk Matrix Visualization (NEW)
**Visual risk assessment grid**

```tsx
┌─ RISK MATRIX ─────────────────────────────────┐
│           Low    Medium    High    Critical   │
│ Tsunami   │       │        │        [🔴]     │
│ Port      │       │        [🟠]    │         │
│ Route     │       │        [🟠]    │         │
│ Weather   │       [🟡]     │        │         │
│ Aftershk  │       │        │        [🔴]     │
└───────────────────────────────────────────────┘
```

### B4. Comparative Context (NEW)
**Historical comparison for decision-making**

```tsx
┌─ HISTORICAL COMPARISON ───────────────────────┐
│ Similar events in this region:               │
│                                               │
│ 2011 Tōhoku (M9.1)        [████████] Severe  │
│  • 3-day port closure                         │
│  • $billions in losses                        │
│  • 14m tsunami waves                          │
│                                               │
│ 1995 Kobe (M7.3)          [█████░░░] High    │
│  • 2-day closure                              │
│  • 1 week shipping delays                     │
│  • 4m waves                                   │
│                                               │
│ Current Event (M7.2)      [██████░░] High    │
│  • Tracking similar to 1995 pattern           │
│  • 6.5m potential combined wave height        │
│  • Estimated 2-3 day impact                   │
└───────────────────────────────────────────────┘
```

---

## Phase C: Interaction & Usability (Priority 3)

### C1. Collapsible Sections
**Manage widget length for readability**

```tsx
🏭 Port Status (6 affected)          [Collapse ▲]
🚢 Vessel Guidance                   [Expand ▼]
📍 Impact Map                        [Expand ▼]
🌊 Shipping Routes (8 affected)      [Expand ▼]
```

### C2. Tabbed Interface for Multiple Events
**When multiple significant events occur simultaneously**

```tsx
┌─ ACTIVE EVENTS ───────────────────────────────┐
│ [🔴 M7.2 Japan] [🔴 M6.8 Philippines] [🟠 M5.9 Chile] │
│                                               │
│ Currently showing: M7.2 Japan                 │
│ [Switch to Priority View (All Events)]       │
└───────────────────────────────────────────────┘
```

### C3. Export & Share Functions
**Actionable outputs**

```tsx
[📄 Export PDF Report]
[📤 Share via Email]
[📋 Copy Summary]
[🔗 Share Link]
[📊 Export Data (CSV)]
```

### C4. Settings & Preferences
**User customization**

```tsx
⚙️ Widget Settings:
 □ Auto-refresh enabled (60s)
 □ Show environmental data
 □ Show impact score breakdown
 □ Show timeline visualization
 □ Compact mode for low-impact events
 □ Desktop notifications
```

---

## Phase D: Mobile Optimization (Priority 4)

### D1. Responsive Stacking
**Mobile-first collapsible design**

```tsx
Mobile View:
┌──────────────────────────┐
│ 🚢 Maritime Intel        │
│ M7.2 Japan  🔴 CRITICAL  │
│ Score: 92 • Live         │
├──────────────────────────┤
│ ⚠️ TSUNAMI WARNING       │
│ [🔔 Alert] [📞 Call]     │
├──────────────────────────┤
│ 🏭 Ports [▼]             │
│ 🚢 Guidance [▼]          │
│ 📍 Map [▼]               │
│ 🌊 Routes [▼]            │
└──────────────────────────┘
```

### D2. Touch-Optimized Actions
**Larger tap targets, swipe gestures**

```tsx
[Swipe left/right between events]
[Pull down to refresh]
[Long-press for quick actions]
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Environmental Dashboard (Phase 1 data) | HIGH | MEDIUM | **P0** |
| Impact Score Breakdown | HIGH | LOW | **P0** |
| Visual Timeline | MEDIUM | MEDIUM | **P1** |
| Quick Action Bar | HIGH | LOW | **P1** |
| Change Detection | MEDIUM | MEDIUM | **P2** |
| Risk Matrix | MEDIUM | HIGH | **P2** |
| Historical Comparison | LOW | MEDIUM | **P3** |
| Collapsible Sections | MEDIUM | LOW | **P1** |
| Multi-event Tabs | LOW | HIGH | **P3** |
| Export Functions | LOW | MEDIUM | **P3** |

---

## Technical Requirements

### New Components Needed
1. `ImpactScoreGauge` - Circular or bar gauge for 0-100 score
2. `EnvironmentalConditionsPanel` - Display Phase 1 data
3. `TimelineVisualization` - Event timeline with phases
4. `RiskMatrix` - Visual grid of risk factors
5. `ChangeDetectionBanner` - Highlight recent changes
6. `QuickActionBar` - Action buttons with icons
7. `CollapsibleSection` - Expandable content areas

### Data Flow Updates
1. Fetch Phase 1 data sources separately from AI analysis
2. Cache environmental data (60s TTL for live conditions)
3. Track previous state for change detection
4. Store impact score components for breakdown display

### API Endpoints Needed
1. `GET /api/maritime/environmental` - Fetch Phase 1 data
2. `GET /api/maritime/history` - Historical comparison data
3. `POST /api/maritime/export` - Generate PDF/CSV exports

### Design Tokens
```css
--maritime-critical: #DC2626;
--maritime-high: #EA580C;
--maritime-medium: #D97706;
--maritime-low: #64748B;
--maritime-live: #10B981;
--maritime-stale: #EF4444;
--maritime-spacing: 1rem;
--maritime-border-radius: 0.75rem;
```

---

## Success Metrics

### User Experience
- [ ] Reduce time to understand impact from 3-5 min to <30 seconds
- [ ] Increase user confidence in decision-making (user survey)
- [ ] Reduce clicks to key actions from 3-4 to 1-2

### Data Visibility
- [ ] 100% of Phase 1 data sources visible in UI
- [ ] Impact score breakdown shown for all events
- [ ] Environmental conditions updated every 60s

### Efficiency
- [ ] Widget renders in <500ms
- [ ] All data sources load in parallel
- [ ] Cache hit rate >80% for environmental data

---

## Next Steps

1. **Review & Approve**: Stakeholder review of enhancement plan
2. **Design Mockups**: Create high-fidelity mockups in Figma
3. **Component Library**: Build reusable UI components
4. **Phase 1 Integration**: Surface sea state, tidal, aftershock, SAR data
5. **Iteration**: User testing and refinement
6. **Production**: Roll out incrementally (P0 → P1 → P2 → P3)

---

## Questions for Stakeholders

1. **Priority**: Which phase should we implement first?
   - Recommendation: Phase A (Visual Design) + B1 (Phase 1 data integration)

2. **Scope**: Should we include multi-event support in V1?
   - Recommendation: Defer to V2 unless critical business need

3. **Personalization**: Do we need vessel operator/fleet views?
   - Recommendation: V2 feature, requires user profile integration

4. **Mobile**: What % of users access on mobile?
   - Will inform mobile optimization priority

5. **Export**: What formats are needed? PDF, CSV, JSON?
   - Recommendation: Start with PDF for sharing, CSV for analysis
