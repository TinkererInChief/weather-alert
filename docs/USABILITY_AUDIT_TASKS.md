# Usability Audit & Improvement Tasks
**Date:** October 4, 2025, 7:20 PM IST

---

## 🎯 Global Improvements (All Pages)

### Task G-1: Add Favicon
**Priority:** HIGH  
**Effort:** 1 hour  
**Description:** Add custom favicon to improve branding
**Files:**
- Create `/public/favicon.ico`
- Update `/app/layout.tsx` metadata

---

### Task G-2: Fix Duplicate Sidebar Icons
**Priority:** HIGH  
**Effort:** 15 minutes  
**Issue:** User Management and Contact Groups both use `Users` icon
**Solution:** 
- User Management: Change to `ShieldCheck` or `UserCog`
- Contact Groups: Keep `Users`
**Files:** `/components/layout/AppLayout.tsx` line 72

---

## 📊 Dashboard Page (`/dashboard`)

### Task D-1: Unified Incident Timeline - Add Time Filters
**Priority:** HIGH  
**Effort:** 3 hours  
**Description:** Add filter buttons for 24h / 7d / 30d time windows
**Files:** 
- `/app/dashboard/page.tsx` - Add filter state
- `/components/dashboard/UnifiedIncidentTimeline.tsx` - Add UI controls

### Task D-2: Unified Incident Timeline - Add Type Filters
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Description:** Filter by event type (Earthquake / Tsunami / All)
**Files:** `/components/dashboard/UnifiedIncidentTimeline.tsx`

### Task D-3: Match Timeline Height to Map
**Priority:** MEDIUM  
**Effort:** 30 minutes  
**Description:** Make timeline widget same height as GlobalEventMap
**Files:** `/app/dashboard/page.tsx` - Adjust grid/flex layout

### Task D-4: Active Contacts Widget
**Priority:** HIGH  
**Effort:** 4 hours  
**Description:** Show count of active contacts with breakdown by channel availability
**Metrics:**
- Total active contacts
- Contacts with phone (SMS/Voice)
- Contacts with email
- Contacts with WhatsApp
**Files:** Create `/components/dashboard/ActiveContactsWidget.tsx`

### Task D-5: Feed Status Widget
**Priority:** HIGH  
**Effort:** 3 hours  
**Description:** Overall data source health at a glance
**Metrics:**
- USGS status + last check time
- NOAA status + last check time
- PTWC status + last check time
- Overall health indicator
**Files:** Create `/components/dashboard/FeedStatusWidget.tsx`

### Task D-6: Events by Type & Severity Widget
**Priority:** HIGH  
**Effort:** 4 hours  
**Description:** Breakdown of events with time filters (24h/7d/30d)
**Metrics:**
- Earthquakes by magnitude range
- Tsunamis by severity
- Time filter buttons
**Files:** Create `/components/dashboard/EventsByTypeWidget.tsx`

### Task D-7: Last Check Time Widget
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Description:** Show when each monitoring service last checked
**Metrics:**
- Earthquake monitoring: Last check timestamp
- Tsunami monitoring: Last check timestamp
- Next check in: Countdown timer
**Files:** Create `/components/dashboard/LastCheckWidget.tsx`

### Task D-8: Alerts Sent Widget
**Priority:** HIGH  
**Effort:** 4 hours  
**Description:** Alert delivery statistics with time filters
**Metrics:**
- Total alerts sent (24h/7d/30d)
- Breakdown by alert type (Earthquake/Tsunami)
- Success rate percentage
**Files:** Create `/components/dashboard/AlertsSentWidget.tsx`

### Task D-9: Notification Channel Status Widget
**Priority:** HIGH  
**Effort:** 3 hours  
**Description:** Real-time channel health by type
**Metrics:**
- SMS: Status (Configured/Working/Error) + last successful send
- Email: Status + last successful send
- Voice: Status + last successful call
- WhatsApp: Status + last successful message
**Files:** Create `/components/dashboard/ChannelStatusWidget.tsx`

### Task D-10: Audit Trail Events Widget
**Priority:** MEDIUM  
**Effort:** 4 hours  
**Description:** Live audit log with infinite scroll (reverse chronological)
**Features:**
- Show last 20 events
- Infinite scroll to load more
- Filter by action type
- User avatar + timestamp
**Files:** Create `/components/dashboard/AuditTrailWidget.tsx`

### Task D-11: Remove/Rework Earthquake Alert Delivery Log
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Question:** Is this widget still needed or redundant with DeliveryStatusWidget?
**Action:** User decision needed - remove or enhance
**Files:** `/components/dashboard/EarthquakeAlertDeliveryLog.tsx`

### Task D-12: Rework Event Timeline Playback
**Priority:** LOW  
**Effort:** 6 hours  
**Question:** Current implementation unclear - needs redesign
**Suggestion:** Make it show event progression over time with play/pause controls
**Files:** `/components/dashboard/EventTimelinePlayback.tsx`

---

## 🌍 Earthquake Monitoring (`/dashboard/alerts`)

### Task EM-1: Add Admin Toggle for Monitoring
**Priority:** HIGH  
**Effort:** 3 hours  
**Description:** Only admins can start/stop earthquake monitoring
**UI:** Toggle switch in page header (Admin only)
**Files:**
- `/app/dashboard/alerts/page.tsx`
- `/app/api/monitoring/route.ts` (already protected)

### Task EM-2: Real-time Event Counter
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Description:** Show count of events in last 24h/7d with trend indicator
**Files:** `/app/dashboard/alerts/page.tsx`

---

## 🌊 Tsunami Monitoring (`/dashboard/tsunami`)

### Task TM-1: Add Admin Toggle for Monitoring
**Priority:** HIGH  
**Effort:** 3 hours  
**Description:** Only admins can start/stop tsunami monitoring
**UI:** Toggle switch in page header (Admin only)
**Files:**
- `/app/dashboard/tsunami/page.tsx`
- `/app/api/tsunami/monitor/route.ts`

### Task TM-2: Last Check Timestamp
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Description:** Show when tsunami sources were last checked
**Files:** `/app/dashboard/tsunami/page.tsx`

---

## 👥 Contacts (`/dashboard/contacts`)

### Task C-1: Bulk Actions
**Priority:** MEDIUM  
**Effort:** 4 hours  
**Description:** Select multiple contacts for batch operations
**Features:**
- Select all / Select none
- Bulk delete
- Bulk add to group
**Files:** `/app/dashboard/contacts/page.tsx`

### Task C-2: Advanced Filters
**Priority:** LOW  
**Effort:** 3 hours  
**Description:** Filter contacts by channel availability
**Filters:**
- Has email
- Has phone
- Has WhatsApp
- Is active/inactive
**Files:** `/app/dashboard/contacts/page.tsx`

---

## 👥 Contact Groups (`/dashboard/groups`)

### Task CG-1: Member Count Badge
**Priority:** LOW  
**Effort:** 1 hour  
**Description:** Show member count on each group card
**Files:** `/app/dashboard/groups/page.tsx`

---

## 📜 Alert History (`/dashboard/alerts/history`)

### Task AH-1: Export to CSV
**Priority:** MEDIUM  
**Effort:** 3 hours  
**Description:** Export filtered alert history to CSV
**Files:** `/app/dashboard/alerts/history/page.tsx`

---

## 🔔 Notifications (`/dashboard/notifications`)

### Task N-1: Filter by Channel Type
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Description:** Filter notifications by SMS/Email/Voice/WhatsApp
**Files:** `/app/dashboard/notifications/page.tsx`

---

## 🛡️ Audit Trail (`/dashboard/audit`)

### Task AT-1: Export Audit Logs
**Priority:** MEDIUM  
**Effort:** 3 hours  
**Description:** Export audit logs to CSV for compliance
**Files:** `/app/dashboard/audit/page.tsx`

---

## ⚡ System Status (`/dashboard/status`)

### Task SS-1: Make Service Dependencies Mobile Responsive
**Priority:** HIGH  
**Effort:** 2 hours  
**Issue:** Service dependency cards overflow on mobile
**Solution:** 
- Stack cards vertically on mobile
- Use responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
**Files:** `/app/dashboard/status/page.tsx`

### Task SS-2: Add Real-time Health Checks
**Priority:** MEDIUM  
**Effort:** 4 hours  
**Description:** Auto-refresh health status every 30s
**Files:** `/app/dashboard/status/page.tsx`

---

## 🧪 Dashboard - Testing Widget Consolidation

### Task TW-1: Create Unified Testing Widget
**Priority:** HIGH  
**Effort:** 6 hours  
**Description:** Consolidate Monitoring Controls and Channel Tests into one widget
**Components to merge:**
- Monitoring Controls (Start/Stop monitoring)
- Channel Tests (Test SMS/Email/Voice/WhatsApp)
- Drill Test controls
**Layout:**
```
┌─ Testing & Controls ──────────────┐
│ [Monitoring Status]                │
│ ┌─ Earthquake ─┐ ┌─ Tsunami ──┐   │
│ │ ● Active     │ │ ● Active   │   │
│ │ [Stop]       │ │ [Stop]     │   │
│ └──────────────┘ └────────────┘   │
│                                    │
│ [Channel Tests]                    │
│ [Test SMS] [Test Email]            │
│ [Test Voice] [Test WhatsApp]       │
│                                    │
│ [Run Drill Test]                   │
└────────────────────────────────────┘
```
**Files:** Create `/components/dashboard/TestingControlsWidget.tsx`

---

## 📝 Implementation Priority Matrix

### Critical (Ship This Week):
1. G-1: Favicon
2. G-2: Fix duplicate icons
3. D-1: Timeline time filters
4. D-4: Active Contacts widget
5. D-5: Feed Status widget
6. D-9: Channel Status widget
7. EM-1: Earthquake monitoring toggle
8. TM-1: Tsunami monitoring toggle
9. SS-1: Mobile responsive service dependencies
10. TW-1: Unified Testing widget

### High (Ship Next Week):
11. D-2: Timeline type filters
12. D-6: Events by Type widget
13. D-8: Alerts Sent widget
14. D-7: Last Check widget

### Medium (Ship Month 1):
15. D-3: Match timeline height
16. D-10: Audit Trail widget
17. D-11: Review Earthquake Delivery Log
18. C-1: Bulk contact actions
19. N-1: Notification channel filters
20. AT-1: Export audit logs
21. AH-1: Export alert history
22. SS-2: Real-time health checks

### Low (Backlog):
23. D-12: Rework Event Timeline Playback
24. C-2: Advanced contact filters
25. CG-1: Group member count badges
26. EM-2: Event counter
27. TM-2: Last check timestamp

---

## 📊 Effort Summary

**Total Tasks:** 27  
**Critical (10):** ~28 hours  
**High (4):** ~13 hours  
**Medium (9):** ~27 hours  
**Low (4):** ~12 hours  

**Total Estimated Effort:** ~80 hours (~2 weeks for 1 developer)

---

## 🎯 Sprint Planning Suggestion

### Sprint 1 (Week 1): Foundation & Critical UX
- Favicon, icon fixes
- Time filters for timeline
- Active Contacts, Feed Status, Channel Status widgets
- Monitoring toggles
- Mobile responsive fixes
- Testing widget

### Sprint 2 (Week 2): Enhanced Metrics
- Events by Type widget
- Alerts Sent widget
- Last Check widget
- Audit Trail widget
- Bulk actions for contacts

### Sprint 3 (Month 1): Polish & Exports
- Export functionality (CSV)
- Advanced filters
- Timeline playback redesign
- Real-time updates

---

**Created By:** Cascade AI  
**Review Date:** October 4, 2025  
**Status:** Ready for prioritization
