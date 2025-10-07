# Maritime Intelligence Widget - Comprehensive Improvement Plan

## Current State Analysis

### Strengths
✅ Clean, readable output format  
✅ AI-powered contextual analysis via Perplexity  
✅ Multiple data categories (ports, routes, contacts, guidance)  
✅ Confidence scoring and source count  
✅ Real-time refresh capability  

### Critical Gaps When Multiple Incidents Occur

#### 1. **Single Event Focus**
- Widget only handles ONE earthquake at a time
- No mechanism to compare/prioritize multiple simultaneous events
- Example scenario that breaks current system:
  - M4.8 in Southern Yukon (low maritime risk)
  - M6.2 in Pacific Ocean near Japan (high maritime risk)
  - M7.0 in Philippines with tsunami warning (critical maritime risk)
- **Current behavior**: Shows whichever event was passed to component, ignoring others

#### 2. **No Priority/Severity Ranking**
- All events treated equally regardless of:
  - Magnitude
  - Geographic proximity to shipping lanes
  - Tsunami potential
  - Affected infrastructure density

#### 3. **No Geographic Filtering**
- Displays analysis even for landlocked earthquakes (e.g., Yukon)
- Wastes API credits on low-relevance queries
- No proximity-based filtering to major ports/shipping lanes

#### 4. **Static Data Model**
- Single `MaritimeIntelligence` object
- Can't represent multiple concurrent incidents
- No aggregation or consolidation logic

#### 5. **Poor Information Density**
- Low-impact events get same UI real estate as critical events
- No visual hierarchy based on severity
- Scrolling required even for minor events

#### 6. **Limited Actionability**
- Generic guidance not tailored to user role (ship operator vs port authority)
- No quick action buttons (e.g., "Alert Fleet", "Contact Coast Guard")
- No integration with notification systems

#### 7. **Stale Data Handling**
- Timestamp shown but no visual staleness indicator
- No auto-refresh for active high-severity events
- Users must manually refresh to see updates

#### 8. **Missing Context**
- No map visualization showing affected areas
- No comparison to historical similar events
- No estimated impact duration

---

## Proposed Improvements

### Phase 1: Multi-Incident Support (Critical)

#### 1.1 **Impact Scoring System**
Calculate maritime impact score (0-100) for each event:

```typescript
type MaritimeImpactScore = {
  event: EarthquakeEvent
  score: number  // 0-100
  factors: {
    magnitude: number          // 0-30 points
    proximityToShipping: number // 0-25 points
    tsunamiRisk: number        // 0-25 points
    portDensity: number        // 0-15 points
    historicalImpact: number   // 0-5 points
  }
  priority: 'critical' | 'high' | 'medium' | 'low'
}
```

**Scoring Logic**:
- **Magnitude**: 
  - M7.0+: 30 pts
  - M6.0-6.9: 20 pts
  - M5.0-5.9: 10 pts
  - M4.0-4.9: 5 pts
  - <M4.0: 0 pts

- **Proximity to Shipping Lanes**:
  - Within 100km of major port: 25 pts
  - Within 200km: 15 pts
  - Within 500km: 8 pts
  - Within Pacific/Atlantic shipping lanes: 10 pts
  - Landlocked: 0 pts

- **Tsunami Risk**:
  - Confirmed tsunami: 25 pts
  - Tsunami warning: 20 pts
  - Tsunami watch: 10 pts
  - Ocean event M6+: 15 pts
  - No risk: 0 pts

#### 1.2 **Priority-Based Filtering**
```typescript
// Only show maritime intelligence if:
if (score >= 30 || priority === 'critical') {
  displayMaritimeIntelligence()
}

// Auto-fetch for high-priority events
if (score >= 50) {
  autoFetch = true
}
```

#### 1.3 **Multi-Event Data Structure**
```typescript
type MultiMaritimeIntelligence = {
  events: Array<{
    eventId: string
    score: number
    priority: 'critical' | 'high' | 'medium' | 'low'
    intelligence: MaritimeIntelligence
    lastUpdated: Date
    autoRefresh: boolean
  }>
  aggregatedImpact: {
    totalPortsClosed: number
    totalRoutesAffected: number
    combinedSeverity: 'critical' | 'high' | 'medium' | 'low'
  }
  consolidatedGuidance: string[]
}
```

### Phase 2: Enhanced UX (High Priority)

#### 2.1 **Tabbed Interface for Multiple Events**
```tsx
// Show tabs only when multiple high-priority events exist
<div className="tabs">
  {events.map(event => (
    <Tab 
      key={event.id}
      severity={event.priority}
      badge={event.score}
    >
      M{event.magnitude} - {event.location}
    </Tab>
  ))}
</div>
```

#### 2.2 **Compact Cards with Expand/Collapse**
- **Collapsed State** (1-2 lines):
  ```
  🚢 M6.2 Pacific Ocean - HIGH PRIORITY
  3 ports monitoring, 2 routes affected. [Expand Details]
  ```

- **Expanded State**: Full current view

#### 2.3 **Visual Severity Indicators**
```tsx
// Color-coded borders and icons
<div className={`maritime-card ${
  priority === 'critical' ? 'border-red-500 shadow-red-200' :
  priority === 'high' ? 'border-orange-500 shadow-orange-200' :
  priority === 'medium' ? 'border-yellow-500' :
  'border-slate-200'
}`}>
```

#### 2.4 **Quick Action Buttons**
```tsx
<ActionBar>
  <Button icon={Bell}>Alert Active Vessels</Button>
  <Button icon={Phone}>Contact Coast Guard</Button>
  <Button icon={Share}>Share with Fleet</Button>
  <Button icon={Download}>Export PDF Briefing</Button>
</ActionBar>
```

### Phase 3: Real-Time Intelligence (High Priority)

#### 3.1 **Auto-Refresh Strategy**
```typescript
const refreshIntervals = {
  critical: 60_000,   // 1 minute
  high: 300_000,      // 5 minutes
  medium: 900_000,    // 15 minutes
  low: null           // Manual only
}
```

#### 3.2 **Staleness Indicators**
```tsx
<FreshnessIndicator>
  {timeSinceUpdate < 5min ? (
    <Badge color="green">Live</Badge>
  ) : timeSinceUpdate < 30min ? (
    <Badge color="yellow">Updated {timeAgo}</Badge>
  ) : (
    <Badge color="red">Stale - Last update {timeAgo}</Badge>
  )}
</FreshnessIndicator>
```

#### 3.3 **Change Detection**
```typescript
// Highlight what changed since last fetch
type IntelligenceChange = {
  field: 'portStatus' | 'guidance' | 'routes'
  changeType: 'added' | 'removed' | 'modified'
  oldValue: any
  newValue: any
  timestamp: Date
}
```

### Phase 4: Enhanced Context (Medium Priority)

#### 4.1 **Mini Map Visualization**
```tsx
<MaritimeImpactMap
  epicenter={[lat, lon]}
  affectedPorts={portStatus}
  tsunamiPropagation={tsunamiData}
  shippingLanes={affectedRoutes}
  height={200}
/>
```

#### 4.2 **Timeline/Impact Duration**
```typescript
estimatedImpact: {
  immediate: string    // "Next 2-4 hours"
  shortTerm: string    // "Next 24-48 hours"
  longTerm: string     // "3-7 days recovery"
}
```

#### 4.3 **Comparative Historical Data**
```tsx
<HistoricalComparison>
  Similar M{magnitude} events in this region have resulted in:
  - Average port closures: {avgClosures} hrs
  - Typical route disruption: {avgDisruption} days
  - Last similar event: {lastEvent.date} - {lastEvent.outcome}
</HistoricalComparison>
```

### Phase 5: Personalization (Medium Priority)

#### 5.1 **User Context Awareness**
```typescript
type UserContext = {
  role: 'vessel_operator' | 'port_authority' | 'coast_guard' | 'logistics'
  activeVessels?: Array<{
    id: string
    location: [number, number]
    route: string
  }>
  monitoredPorts?: string[]
  preferredContactMethods?: ('vhf' | 'phone' | 'email')[]
}
```

#### 5.2 **Tailored Guidance**
- **Vessel Operators**: Route alternatives, weather windows, fuel considerations
- **Port Authorities**: Berth status, pilot requirements, tug availability
- **Coast Guard**: SAR readiness, patrol boat positioning
- **Logistics**: Container tracking, shipment delays, alternative carriers

#### 5.3 **Custom Alerts & Thresholds**
```typescript
type AlertPreferences = {
  notifyWhen: {
    portClosures: boolean
    routeChanges: boolean
    magnitudeThreshold: number
    proximityToAssets: number  // km
  }
  channels: ('sms' | 'email' | 'whatsapp' | 'push')[]
}
```

### Phase 6: Data Quality & Reliability

#### 6.1 **Source Credibility Weighting**
```typescript
type SourceQuality = {
  official: number     // NOAA, PTWC, JMA = 1.0
  news: number         // Reuters, AP = 0.8
  social: number       // Twitter, forums = 0.3
  unverified: number   // 0.1
}

confidenceScore = weightedAverage(sources.map(s => s.quality))
```

#### 6.2 **Conflicting Information Handler**
```tsx
{intelligence.conflicts && (
  <Alert type="warning">
    ⚠️ Conflicting reports detected:
    - Source A: {conflictA}
    - Source B: {conflictB}
    Showing most recent official information.
  </Alert>
)}
```

#### 6.3 **Fallback Data Strategy**
```typescript
// If Perplexity fails, use:
1. Cached last successful fetch
2. Rule-based intelligence (magnitude + location = estimated impact)
3. Historical similar event data
4. Graceful degradation with clear labeling
```

### Phase 7: Performance & Cost Optimization

#### 7.1 **Smart Caching**
```typescript
// Cache key includes:
const cacheKey = `maritime:${location}:${magnitude}:${Math.floor(timestamp / 300000)}`
// 5-minute buckets to allow slight stale data

// Cache invalidation:
- After 30 minutes for critical events
- After 2 hours for high-priority events
- After 24 hours for low-priority events
```

#### 7.2 **Batch API Calls**
```typescript
// Instead of individual calls per event:
fetchMaritimeIntelligence({
  events: [event1, event2, event3],
  priorityThreshold: 'medium'
})

// API returns consolidated analysis
```

#### 7.3 **Lazy Loading for Low Priority**
```tsx
{event.priority === 'low' && (
  <Button onClick={() => fetchIntelligence(event)}>
    Show Maritime Analysis
  </Button>
)}
```

---

## Implementation Roadmap

### Sprint 1 (Week 1-2): Critical Multi-Incident Support
- [ ] Implement impact scoring system
- [ ] Add multi-event data structure
- [ ] Create priority-based filtering
- [ ] Build event comparison logic

### Sprint 2 (Week 3-4): Enhanced UX
- [ ] Tabbed interface for multiple events
- [ ] Compact/expand card states
- [ ] Visual severity indicators
- [ ] Quick action buttons

### Sprint 3 (Week 5-6): Real-Time Intelligence
- [ ] Auto-refresh based on priority
- [ ] Staleness indicators
- [ ] Change detection and highlighting
- [ ] WebSocket support for live updates

### Sprint 4 (Week 7-8): Context & Visualization
- [ ] Mini map integration
- [ ] Impact timeline estimations
- [ ] Historical comparison data
- [ ] Enhanced formatting

### Sprint 5 (Week 9-10): Personalization
- [ ] User context system
- [ ] Role-based guidance
- [ ] Custom alert preferences
- [ ] Asset tracking integration

### Sprint 6 (Week 11-12): Quality & Optimization
- [ ] Source credibility weighting
- [ ] Conflict detection
- [ ] Smart caching layer
- [ ] Batch API optimization
- [ ] Comprehensive testing

---

## Metrics to Track

### User Engagement
- Click-through rate on "Analyze Maritime Impact"
- Average time spent reviewing intelligence
- Refresh button usage frequency
- Quick action button usage

### Data Quality
- Confidence score distribution
- Source diversity
- Conflicting information frequency
- User-reported accuracy

### Performance
- API response times
- Cache hit rate
- Cost per query
- Error rate

### Business Impact
- Time to decision for maritime operations
- Number of incidents proactively mitigated
- User satisfaction scores
- Adoption rate across user roles

---

## Testing Scenarios

### Scenario 1: Multiple Simultaneous Events
```
Event A: M4.2 in Nevada (landlocked) - Score: 5
Event B: M6.8 in Pacific near Japan with tsunami - Score: 85
Event C: M5.5 in Philippines - Score: 42

Expected: Only show B (critical), optionally C (high)
```

### Scenario 2: Escalating Event
```
T0: M6.0 earthquake
T+10min: Tsunami warning issued
T+30min: Port closure confirmed
T+60min: Alternative routes published

Expected: Intelligence updates automatically, changes highlighted
```

### Scenario 3: Data Conflict
```
Source A (NOAA): Tsunami warning
Source B (Social media): All clear
Source C (Local authority): Monitoring

Expected: Weight NOAA highest, show confidence as "medium"
```

### Scenario 4: Stale Data
```
Last fetch: 2 hours ago
Event still active
API temporarily unavailable

Expected: Show cached data with staleness warning, retry button
```

---

## Open Questions

1. **Cost Management**: How many Perplexity API calls per month can we budget?
2. **User Roles**: Do we need authentication to determine user context?
3. **Real-Time Updates**: Should we use WebSockets or polling for live data?
4. **Map Provider**: Leaflet (current), Mapbox, Google Maps for maritime viz?
5. **Mobile Experience**: Should maritime intelligence have a dedicated mobile app?
6. **Multi-Language**: Do we need international language support?
7. **Data Retention**: How long do we keep historical maritime intelligence?
8. **Compliance**: Any regulatory requirements for maritime safety information?

---

**Priority Recommendation**: Start with Sprint 1 (multi-incident support) and Sprint 2 (enhanced UX) as they address the most critical gaps in the current implementation.
