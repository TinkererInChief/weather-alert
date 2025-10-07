# Maritime Intelligence Widget - Visual Mockups

## Current vs. Improved Comparison

### Current State (Single Event)
```
┌─────────────────────────────────────────────────────────┐
│ 🚢 Maritime Impact Analysis          [high confidence] │
│ M4.8 SOUTHERN YUKON TERRITORY, CANADA      7 sources   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ No current reports found of port closures, tsunami     │
│ warnings, or Coast Guard maritime safety bulletins...  │
│                                                         │
│ 🚢 Vessel Guidance                                      │
│ General guidance                                        │
│ Monitor official channels (VHF 16), avoid affected     │
│ coastal areas, maintain safe depth if tsunami...       │
│                                                         │
│ ☎️ Emergency Contacts                                   │
│ US Coast Guard                          Channel 16      │
│                                                         │
│ 🕐 Historical Context                                   │
│ events of similar magnitude have not caused shipping   │
│ delays in this region[1]                               │
│                                                         │
│ Powered by Perplexity AI          Generated 02:37:02   │
└─────────────────────────────────────────────────────────┘
```

**Problems**:
- ❌ Shows analysis for landlocked earthquake (low relevance)
- ❌ Takes up full widget space for low-impact event
- ❌ Generic, non-actionable guidance
- ❌ No indication this is low-priority

---

## Improved State: Scenario 1 (Low Impact Event)

### Smart Filtering - Event Below Threshold
```
┌─────────────────────────────────────────────────────────┐
│ 🚢 Maritime Intelligence                        [ ↻ ]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ℹ️  M4.8 Southern Yukon Territory, Canada              │
│                                                         │
│ ✓ No maritime impact expected                          │
│   • Event is landlocked                                │
│   • Below maritime significance threshold              │
│                                                         │
│ [Show Detailed Analysis] (Manual fetch)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Improvements**:
✅ Compact display for low-impact events
✅ Clear "no action needed" message
✅ Option to fetch details if user wants
✅ Saves API credits

---

## Improved State: Scenario 2 (Single High-Impact Event)

```
┌───────────────────────────────────────────────────────────┐
│ 🚢 Maritime Impact Analysis                    CRITICAL  │
│ M7.2 PACIFIC OCEAN - 180km E of Tokyo, Japan             │
│                                                           │
│ Impact Score: 92/100  •  12 sources  •  🟢 Live (1m ago) │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ⚠️ TSUNAMI WARNING ACTIVE - Major maritime disruption    │
│                                                           │
│ ┌─ QUICK ACTIONS ──────────────────────────────────────┐ │
│ │ [🔔 Alert Fleet] [📞 Coast Guard] [📤 Share] [📄 PDF]│ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ 🏭 Port Status (6 affected)          [Expand All ▼]      │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ❌ Port of Tokyo              CLOSED  Updated 3m ago│   │
│ │    Tsunami warning - All vessels evacuated          │   │
│ │    Est. reopening: 6-12 hours pending all-clear     │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ ⚠️  Port of Yokohama        MONITORING  5m ago      │   │
│ │    Operations suspended - Assessing damage          │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ ✓ Port of Osaka                 OPEN  Updated 2m ago│   │
│ │    Operating normally - Monitoring tsunami risk     │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ 🚢 Vessel Guidance - IMMEDIATE ACTION REQUIRED            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ All vessels within 200km:                           │   │
│ │ • Move to water depth >500m immediately             │   │
│ │ • Maintain heading away from shore                  │   │
│ │ • Monitor VHF Channel 16 continuously               │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ 📍 Impact Map                        [View Full Map ↗]   │
│ ┌─────────────────────────────────────────────────────┐  │
│ │         [Mini map showing epicenter, ports,]        │  │
│ │         [tsunami propagation, shipping lanes]       │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ 🌊 Shipping Routes                                        │
│ ❌ Affected: Trans-Pacific Route 1 (Tokyo-LA)             │
│ ❌ Affected: Japan Coastal Route (Tokyo-Osaka)            │
│ ✓ Alternative: Southern Pacific Route (via Taiwan)       │
│                                                           │
│ ⏱️ Estimated Impact Timeline                              │
│ Immediate (0-2h):  Port evacuations, vessel dispersal    │
│ Short-term (2-12h): Tsunami all-clear, damage assessment │
│ Long-term (1-3d):  Port reopening, route normalization   │
│                                                           │
│ 📞 Emergency Contacts                [Call Now] [Copy]   │
│ Japan Coast Guard               +81-3-3591-6361 • VHF 16 │
│ PTWC Tsunami Desk              +1-808-725-6000           │
│ Port of Tokyo Harbor Master     +81-3-5479-3000          │
│                                                           │
│ 📊 Historical Context                                     │
│ Similar M7+ events in this region:                       │
│ • 2011 Tōhoku (M9.1): 3-day port closure, $billions loss │
│ • 1995 Kobe (M7.3): 2-day closure, 1 week delays         │
│ Current event tracking similar to 1995 pattern.          │
│                                                           │
│ ⚠️ CHANGES IN LAST 15 MINUTES:                            │
│ • Port of Yokohama: open → monitoring (5m ago)           │
│ • Tokyo Bay route: added to affected list (8m ago)       │
│                                                           │
│ [⟳ Auto-refresh every 60s]  Last updated: 14:37:23 JST  │
│ Powered by Perplexity AI  •  Confidence: HIGH (12 sources)│
└───────────────────────────────────────────────────────────┘
```

**Major Improvements**:
✅ Prominent CRITICAL severity indicator
✅ Impact score visible (92/100)
✅ Real-time status with timestamp
✅ Quick action buttons at top
✅ Collapsible sections to manage length
✅ Mini map visualization
✅ Timeline of expected impacts
✅ Change detection and highlighting
✅ Auto-refresh for critical events
✅ Direct contact methods with "Call Now" buttons

---

## Improved State: Scenario 3 (Multiple Competing Events)

```
┌───────────────────────────────────────────────────────────┐
│ 🚢 Maritime Intelligence          [Sort: Priority ▼] [ ↻ ]│
│                                                           │
│ 3 Active Events • 2 Critical • 1 High                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─ TABS ─────────────────────────────────────────────┐   │
│ │ [🔴 M7.2 Japan] [🔴 M6.8 Philippines] [🟠 M5.9 Chile] │  │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─ PRIORITY VIEW (All Events) ───────────────────────┐   │
│ │                                                     │   │
│ │ 🔴 CRITICAL - M7.2 Pacific Ocean (Japan)            │   │
│ │ Score: 92  •  Live  •  3 ports closed               │   │
│ │ ⚠️ TSUNAMI WARNING - 6 routes affected              │   │
│ │ [View Full Analysis] [Alert Fleet] [📞 JCG]         │   │
│ │                                                     │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │                                                     │   │
│ │ 🔴 CRITICAL - M6.8 Mindanao, Philippines            │   │
│ │ Score: 78  •  4m ago  •  2 ports monitoring         │   │
│ │ ⚠️ TSUNAMI WATCH - Manila Bay routes on standby     │   │
│ │ [View Full Analysis] [Alert Fleet] [📞 PCG]         │   │
│ │                                                     │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │                                                     │   │
│ │ 🟠 HIGH - M5.9 Off Coast of Chile                   │   │
│ │ Score: 51  •  18m ago  •  1 port affected           │   │
│ │ Valparaiso monitoring, no tsunami threat            │   │
│ │ [View Full Analysis]                                │   │
│ │                                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─ CONSOLIDATED IMPACT ──────────────────────────────┐   │
│ │ Total Ports: 6 affected (3 closed, 3 monitoring)    │   │
│ │ Total Routes: 8 shipping lanes disrupted            │   │
│ │ Combined Severity: CRITICAL                         │   │
│ │ Recommendation: Activate emergency protocols        │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
│ [Show Map of All Events]  [Export Combined Briefing]     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Multi-Event Features**:
✅ Tabbed interface to switch between events
✅ Priority view showing all events ranked by severity
✅ Color-coded severity (🔴 Critical, 🟠 High, 🟡 Medium)
✅ Compact cards with key metrics
✅ Individual and consolidated impact summaries
✅ Quick actions per event
✅ Combined briefing export

---

## Improved State: Scenario 4 (Personalized for Ship Operator)

```
┌───────────────────────────────────────────────────────────┐
│ 🚢 Maritime Intelligence - Vessel Operator View           │
│ M6.5 PACIFIC - Impact on Your Fleet                      │
│                                                           │
│ Score: 68  •  Live  •  Your vessels: 2 affected           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ⚠️ YOUR ACTIVE VESSELS IN AFFECTED AREA:                  │
│ ┌────────────────────────────────────────────────────┐   │
│ │ MV Ocean Star (Container Ship)           🔴 ALERT  │   │
│ │ Current: 35.2°N, 140.8°E (85km from epicenter)     │   │
│ │ Route: Tokyo → Los Angeles                         │   │
│ │                                                     │   │
│ │ IMMEDIATE ACTIONS:                                  │   │
│ │ ✓ Auto-alert sent to captain (5m ago)              │   │
│ │ ⚠️ Vessel in tsunami risk zone - depth 180m        │   │
│ │ → RECOMMEND: Proceed to deep water (500m+) SE      │   │
│ │ → ETA safe zone: 2h 15m at current speed           │   │
│ │ → Alternative port: Yokohama (135km S)             │   │
│ │                                                     │   │
│ │ [📞 Contact Captain] [📍 Track Live] [🚨 Emergency]│   │
│ ├────────────────────────────────────────────────────┤   │
│ │ MV Pacific Trader (Bulk Carrier)      🟡 MONITOR   │   │
│ │ Current: 32.1°N, 135.6°E (Safe - 420km from event)│   │
│ │ Route: Osaka → Singapore                           │   │
│ │                                                     │   │
│ │ STATUS: Safe distance, continue current route      │   │
│ │ Monitoring port conditions at destination          │   │
│ │                                                     │   │
│ │ [📞 Contact Captain] [📍 Track Live]               │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ 📍 FLEET MAP                         [View Full Screen]  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │  [Map showing epicenter, vessels, safe zones,]      │  │
│ │  [tsunami propagation, recommended routes]          │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ 🚢 ROUTE RECOMMENDATIONS:                                 │
│ Ocean Star: Divert to deep water holding pattern         │
│ Pacific Trader: Continue as planned, monitor Osaka port  │
│                                                           │
│ ⏱️ VESSEL-SPECIFIC TIMELINE:                              │
│ Now:          Alert sent, awaiting captain confirmation  │
│ +30min:       Ocean Star should reach safe depth         │
│ +2-4h:        Tsunami all-clear expected                 │
│ +4-6h:        Resume normal operations if ports clear    │
│                                                           │
│ 📞 EMERGENCY CONTACTS (Pre-configured)                    │
│ [📞 One-Click: Alert All Captains in Region]             │
│ [📞 One-Click: Japan Coast Guard]                        │
│ [📞 One-Click: Company Emergency Line]                   │
│                                                           │
│ ⚙️ [Settings: Fleet Tracking] [Notification Preferences]  │
└───────────────────────────────────────────────────────────┘
```

**Personalization Features**:
✅ User role detected (Vessel Operator)
✅ Shows user's specific assets in danger
✅ Vessel-specific recommendations
✅ One-click emergency actions
✅ Live vessel tracking integration
✅ Pre-configured emergency contacts
✅ Timeline tailored to fleet operations

---

## Mobile-Optimized View

```
┌──────────────────────────┐
│ 🚢 Maritime Intel        │
│ M7.2 Japan  🔴 CRITICAL  │
│                          │
│ Score: 92 • Live • 12src │
├──────────────────────────┤
│                          │
│ ⚠️ TSUNAMI WARNING       │
│                          │
│ [🔔 Alert] [📞 Call]     │
│                          │
│ 🏭 Ports                 │
│ 3 closed • 2 monitoring  │
│ [▼ Details]              │
│                          │
│ 🚢 Your Vessels          │
│ 2 in affected area       │
│ [▼ View Fleet]           │
│                          │
│ 📍 [Show Map]            │
│                          │
│ Updated 2m ago • Auto ↻  │
└──────────────────────────┘
```

---

## Widget States Summary

| State | Display | Auto-Fetch | Refresh Rate |
|-------|---------|------------|--------------|
| No Events | Placeholder | No | - |
| Low Impact (Score <30) | Compact notice | No | Manual |
| Medium Impact (30-50) | Summary card | Optional | 15 min |
| High Impact (50-75) | Full analysis | Yes | 5 min |
| Critical (75+) | Full + alerts | Yes | 1 min |
| Multiple Events | Tabbed view | Yes (critical) | Mixed |
| Personalized | Asset-focused | Yes | 1-5 min |

---

## Design Tokens

### Colors
```css
--maritime-critical: #DC2626;   /* Red-600 */
--maritime-high: #EA580C;       /* Orange-600 */
--maritime-medium: #D97706;     /* Amber-600 */
--maritime-low: #64748B;        /* Slate-600 */
--maritime-live: #10B981;       /* Green-500 */
--maritime-stale: #EF4444;      /* Red-500 */
```

### Icons
- 🔴 Critical alert
- 🟠 High priority
- 🟡 Medium priority
- 🟢 Live/Safe status
- ❌ Closed/Blocked
- ⚠️ Warning/Monitoring
- ✓ Open/Clear

---

**Recommendation**: Implement the improved single high-impact event view first (Scenario 2), then add multi-event support (Scenario 3), and finally personalization (Scenario 4).
