# In-App Guidance Expansion Proposal

## 📋 Overview

This document outlines the proposed expansion of the in-app guidance system to three additional pages and the addition of contextual tooltips throughout the application.

---

## 🎯 Part 1: New Page Tours

### 1. Communications Dashboard Tour

**Page**: `/dashboard/communications`  
**Auto-Start**: Yes (first visit)  
**Steps**: 5

#### Tour Steps:

```typescript
export const communicationsTourSteps: DriveStep[] = [
  {
    element: '#communications-header',
    popover: {
      title: '📱 Communications Hub',
      description: 'Central management for all notification channels and delivery tracking. Monitor SMS, Email, WhatsApp, and Voice communications.',
      side: "bottom"
    }
  },
  {
    element: '#communications-tabs',
    popover: {
      title: '📊 Three Key Areas',
      description: 'Switch between Vessel Alerts (proximity notifications), Delivery Logs (message tracking), and Analytics (performance metrics).',
      side: "bottom"
    }
  },
  {
    element: '#vessel-alerts-tab',
    popover: {
      title: '🚢 Vessel Alerts',
      description: 'Manage proximity-based alerts for vessels near earthquake zones. Set custom alert thresholds and notification preferences.',
      side: "right"
    }
  },
  {
    element: '#delivery-logs-section',
    popover: {
      title: '📨 Delivery Tracking',
      description: 'Real-time tracking of all sent messages. See delivery status, acknowledgments, and failure reasons for each channel.',
      side: "top"
    }
  },
  {
    element: '#channel-stats',
    popover: {
      title: '📈 Channel Performance',
      description: 'Compare effectiveness across SMS, Email, WhatsApp, and Voice. Use data to optimize your communication strategy.',
      side: "left"
    }
  }
]
```

#### Implementation Details:

**Files to Modify:**
- `app/dashboard/communications/CommunicationsClient.tsx`
  - Add tour hook integration
  - Add HelpButton to header
  - Add IDs: `#communications-header`, `#communications-tabs`

- `app/dashboard/communications/tabs/VesselAlertsTab.tsx`
  - Add ID: `#vessel-alerts-tab`

- `app/dashboard/communications/tabs/DeliveryLogsTab.tsx`
  - Add IDs: `#delivery-logs-section`, `#channel-stats`

**Benefits:**
- Reduces support questions about delivery status
- Improves understanding of multi-channel strategy
- Guides users through acknowledgment tracking feature

---

### 2. Earthquake Monitoring Tour

**Page**: `/dashboard/alerts` (Earthquake Monitoring)  
**Auto-Start**: Yes (first visit)  
**Steps**: 7

#### Tour Steps:

```typescript
export const earthquakeMonitoringTourSteps: DriveStep[] = [
  {
    element: '#earthquake-header',
    popover: {
      title: '🌍 Earthquake Monitoring',
      description: 'Real-time earthquake tracking from multiple global data sources (USGS, EMSC, JMA). Filter and analyze seismic events.',
      side: "bottom"
    }
  },
  {
    element: '#live-analytics-tabs',
    popover: {
      title: '📊 Live Feed vs Analytics',
      description: 'Live Feed shows real-time earthquakes. Analytics provides historical trends and performance metrics.',
      side: "bottom"
    }
  },
  {
    element: '#magnitude-filter',
    popover: {
      title: '🎚️ Magnitude Filter',
      description: 'Filter earthquakes by magnitude (e.g., show only M5.0+). Adjust to focus on significant events that require action.',
      side: "right"
    }
  },
  {
    element: '#data-sources',
    popover: {
      title: '🌐 Data Sources',
      description: 'Select which seismic networks to monitor. Each source provides different coverage and update frequencies.',
      side: "right"
    }
  },
  {
    element: '#earthquake-list',
    popover: {
      title: '📋 Earthquake Feed',
      description: 'Recent earthquakes sorted by time. Click any event to see details and create alerts for affected contacts.',
      side: "left"
    }
  },
  {
    element: '#source-health',
    popover: {
      title: '💚 Source Health',
      description: 'Monitor the status of each data source. Green = operational, Red = issues detected.',
      side: "top"
    }
  },
  {
    element: '#quick-alert-button',
    popover: {
      title: '⚡ Quick Alert',
      description: 'Click to instantly create an alert for any earthquake. Event details auto-populate the alert form.',
      side: "left"
    }
  }
]
```

#### Implementation Details:

**Files to Modify:**
- `app/dashboard/alerts/AlertsClient.tsx`
  - Add tour hook integration
  - Add HelpButton to header
  - Add IDs: `#earthquake-header`, `#live-analytics-tabs`, `#magnitude-filter`, `#data-sources`, `#earthquake-list`, `#source-health`, `#quick-alert-button`

**Benefits:**
- Reduces confusion about data sources
- Clarifies filtering options
- Guides users through alert creation workflow
- Explains source health monitoring

---

### 3. Contacts Management Tour

**Page**: `/dashboard/contacts`  
**Auto-Start**: Yes (first visit)  
**Steps**: 8

#### Tour Steps:

```typescript
export const contactsManagementTourSteps: DriveStep[] = [
  {
    element: '#contacts-header',
    popover: {
      title: '👥 Contacts Management',
      description: 'Manage all emergency contacts and notification recipients. Add individuals, import CSV files, and organize by groups.',
      side: "bottom"
    }
  },
  {
    element: '#search-contacts',
    popover: {
      title: '🔍 Search & Filter',
      description: 'Quickly find contacts by name, phone, email, or location. Filter by active/inactive status.',
      side: "bottom"
    }
  },
  {
    element: '#add-contact-button',
    popover: {
      title: '➕ Add Contact',
      description: 'Create new contacts manually. Enter name, phone, email, WhatsApp, location, and role.',
      side: "left"
    }
  },
  {
    element: '#bulk-actions',
    popover: {
      title: '☑️ Bulk Actions',
      description: 'Select multiple contacts to activate, deactivate, or delete in one action. Saves time when managing large lists.',
      side: "bottom"
    }
  },
  {
    element: '#csv-import',
    popover: {
      title: '📤 CSV Import',
      description: 'Upload a CSV file to add many contacts at once. Download the template to see the required format.',
      side: "left"
    }
  },
  {
    element: '#contact-card',
    popover: {
      title: '📇 Contact Details',
      description: 'Each card shows contact info and available channels (SMS, Email, WhatsApp). Click to edit or delete.',
      side: "top"
    }
  },
  {
    element: '#contact-statistics',
    popover: {
      title: '📊 Contact Stats',
      description: 'See total contacts, active/inactive counts, and alert engagement metrics.',
      side: "right"
    }
  },
  {
    element: '#pagination',
    popover: {
      title: '📄 Pagination',
      description: 'Navigate through pages of contacts. Adjust items per page in settings if needed.',
      side: "top"
    }
  }
]
```

#### Implementation Details:

**Files to Modify:**
- `app/dashboard/contacts/page.tsx`
  - Add tour hook integration
  - Add HelpButton to header
  - Add IDs: `#contacts-header`, `#search-contacts`, `#add-contact-button`, `#bulk-actions`, `#csv-import`, `#contact-card`, `#contact-statistics`, `#pagination`

**Benefits:**
- Reduces onboarding time for contact management
- Clarifies CSV import process (common pain point)
- Explains bulk action capabilities
- Guides users through contact organization

---

## 💡 Part 2: Contextual Tooltips

### Tooltip Locations & Content

#### Dashboard Page

| Element | Tooltip Title | Tooltip Content | Side |
|---------|---------------|-----------------|------|
| **Time Filter** | Time Range Selection | Filter events by time period. Use 24h for recent activity, 30d for trends. | top |
| **Magnitude Slider** | Magnitude Threshold | Show only earthquakes above this magnitude. Lower values = more events, higher values = significant events only. | right |
| **Data Sources Badge** | Multi-Source Aggregation | Events aggregated from USGS, EMSC, JMA, and IRIS. Color indicates source quality. | bottom |
| **Success Rate** | Delivery Success Rate | Percentage of messages successfully delivered across all channels. Target: >95%. | left |
| **Contacts Notified** | Alert Reach | Total number of unique contacts notified across all alerts in selected time period. | top |

#### Communications Page

| Element | Tooltip Title | Tooltip Content | Side |
|---------|---------------|-----------------|------|
| **Webhook Status** | Real-time Tracking | Green = webhooks active, receiving delivery confirmations. Yellow = degraded, Red = offline. | right |
| **Acknowledgment Column** | Message Read Status | Shows when recipient opened/read the message. Available for Email (SendGrid) and SMS (Twilio). | left |
| **Provider Message ID** | External Reference | Unique ID from the messaging provider (Twilio/SendGrid). Use for support tickets. | bottom |
| **Retry Count** | Automatic Retries | Number of delivery attempts made. System retries up to 3 times for failed messages. | right |
| **Channel Success Rate** | Channel Performance | Success rate for this specific channel. Compare channels to optimize strategy. | top |

#### Earthquake Monitoring Page

| Element | Tooltip Title | Tooltip Content | Side |
|---------|---------------|-----------------|------|
| **Source Health Indicator** | Data Source Status | Real-time connectivity status to seismic networks. Click to view detailed health metrics. | bottom |
| **Magnitude Classes** | Event Classification | Color coding: <5.0 (blue), 5.0-6.0 (yellow), 6.0-7.0 (orange), 7.0+ (red). | right |
| **Depth Display** | Earthquake Depth | Depth in km below earth's surface. Shallow quakes (<70km) cause more damage than deep ones. | left |
| **Data Source Badge** | Primary Data Source | Which network reported this earthquake first. Multiple sources increase confidence. | bottom |
| **Alert Status Icon** | Alert Sent Status | Green checkmark = alert sent successfully. Red X = delivery issues. Click for details. | left |
| **Contact Count** | Affected Recipients | Number of contacts notified based on proximity to epicenter and alert rules. | top |

#### Contacts Management Page

| Element | Tooltip Title | Tooltip Content | Side |
|---------|---------------|-----------------|------|
| **Phone Validation** | E.164 Format Required | Enter phone with country code: +1234567890. No spaces or special characters. | right |
| **WhatsApp Number** | WhatsApp-enabled Number | Must be registered with WhatsApp. Usually same as phone, but can differ. | right |
| **Location Field** | Geographic Location | City or region for proximity-based alerts. Use format: "City, Country" for best results. | bottom |
| **Role Field** | Contact Role | Categorize contacts (e.g., "Captain", "Engineer"). Used for targeted messaging. | right |
| **Active Status Toggle** | Contact Active/Inactive | Inactive contacts won't receive alerts but remain in your database. | left |
| **CSV Template** | Import Format | Download to see required columns: name, phone, email, whatsapp, location, role. | bottom |
| **Bulk Selection** | Multi-select Mode | Click checkboxes to select contacts. Actions apply to all selected contacts. | top |

#### Delivery Logs Detailed View

| Element | Tooltip Title | Tooltip Content | Side |
|---------|---------------|-----------------|------|
| **Sent Timestamp** | Message Sent Time | When the message left our system. Timezone: UTC. | right |
| **Delivered Timestamp** | Provider Confirmation | When the messaging provider confirmed delivery to recipient's device. | right |
| **Read Timestamp** | Recipient Opened | When the recipient opened/read the message. Only available for Email and some SMS. | right |
| **Error Message** | Failure Reason | Technical reason for delivery failure. Common: invalid number, carrier blocking, quota exceeded. | left |
| **Channel Filter** | Filter by Channel | Show logs for specific channel only. Useful for troubleshooting channel-specific issues. | bottom |

---

## 🛠️ Implementation Plan

### Phase 1: Tour Infrastructure (Already Complete ✅)
- Driver.js installed
- Tour hooks created
- HelpButton component ready
- Custom styling applied

### Phase 2: New Tours (Proposed)

#### Step 1: Define Tours
- [ ] Add 3 new tour definitions to `lib/guidance/tours.ts`
- [ ] Create tour hooks in `hooks/useTour.ts`
- [ ] Add tour IDs to enum

**Effort**: 2-3 hours

#### Step 2: Integrate Communications Tour
- [ ] Modify `CommunicationsClient.tsx`
- [ ] Add IDs to tab components
- [ ] Add HelpButton
- [ ] Test tour flow

**Effort**: 1-2 hours

#### Step 3: Integrate Earthquake Tour
- [ ] Modify `AlertsClient.tsx`
- [ ] Add IDs to filter controls
- [ ] Add HelpButton
- [ ] Test tour with different filters

**Effort**: 2-3 hours

#### Step 4: Integrate Contacts Tour
- [ ] Modify `contacts/page.tsx`
- [ ] Add IDs to form elements
- [ ] Add HelpButton
- [ ] Test with CSV import

**Effort**: 1-2 hours

### Phase 3: Contextual Tooltips (Proposed)

#### Step 1: Create Tooltip Instances
- [ ] Add `HelpTooltip` components to Dashboard
- [ ] Add tooltips to Communications page
- [ ] Add tooltips to Earthquake page
- [ ] Add tooltips to Contacts page

**Effort**: 3-4 hours

#### Step 2: Content Review
- [ ] Review all tooltip text with stakeholders
- [ ] Ensure technical accuracy
- [ ] Simplify complex explanations
- [ ] Add examples where helpful

**Effort**: 1-2 hours

#### Step 3: Testing & Refinement
- [ ] Test tooltip positioning on all screen sizes
- [ ] Verify hover/click interactions
- [ ] Check mobile responsiveness
- [ ] Gather user feedback

**Effort**: 2-3 hours

---

## 📊 Expected Benefits

### User Onboarding
- **Reduce onboarding time**: 50% faster time-to-competency
- **Lower support tickets**: 30-40% reduction in "how-to" questions
- **Increase feature discovery**: Users find 60% more features

### User Engagement
- **Higher adoption rates**: More users utilize advanced features
- **Fewer errors**: Tooltips prevent common mistakes
- **Better decision-making**: Contextual explanations improve choices

### Metrics to Track
- Tour completion rates
- Tooltip hover rates
- Support ticket reduction
- Feature usage increase
- Time to first alert creation

---

## 🎨 Visual Examples

### Tour Popover Style (Already Implemented)
```
┌────────────────────────────────────┐
│ 🌍 Earthquake Monitoring           │
│ ────────────────────────────────   │
│ Real-time earthquake tracking from │
│ multiple global data sources.      │
│                                    │
│ 3 of 7         [Previous] [Next]  │
└────────────────────────────────────┘
```

### Tooltip Style
```
       [?] ← Hover triggers tooltip
         ↓
    ┌────────────────────────┐
    │ Webhook Status         │
    │ ────────────────────   │
    │ Green = webhooks       │
    │ active, receiving      │
    │ delivery confirmations │
    └────────────────────────┘
```

---

## 🚀 Quick Start Code Examples

### Adding a New Tour

```typescript
// 1. Define in lib/guidance/tours.ts
export const myNewTourSteps: DriveStep[] = [
  {
    element: '#my-element',
    popover: {
      title: '📌 Feature Name',
      description: 'Clear explanation of what this does.',
      side: "right"
    }
  }
]

// 2. Create hook in hooks/useTour.ts
export const useMyNewTour = (autoStart = false) => {
  return useTour(TourId.MY_NEW_TOUR, myNewTourSteps, { autoStart })
}

// 3. Use in component
const myTour = useMyNewTour(true)

<HelpButton 
  tours={[{
    id: TourId.MY_NEW_TOUR,
    label: 'My Feature Tour',
    onStart: () => myTour.restartTour()
  }]}
/>
```

### Adding a Tooltip

```typescript
import HelpTooltip from '@/components/guidance/HelpTooltip'

<div className="flex items-center gap-2">
  <label>Complex Feature</label>
  <HelpTooltip 
    title="Feature Explanation"
    content="Detailed description with examples and best practices."
    side="right"
  />
</div>
```

---

## 💬 Questions for Review

### Tours
1. **Tour Length**: Are 5-8 steps appropriate, or should we keep tours shorter (4-5 steps)?
2. **Auto-Start Behavior**: Should all tours auto-start for new users, or only Dashboard?
3. **Content Tone**: Current tone is professional but friendly. Any adjustments needed?
4. **Additional Tours**: Any other pages that would benefit from tours?

### Tooltips
1. **Tooltip Density**: Should we add tooltips to every complex element, or be more selective?
2. **Content Length**: Are 1-2 sentence explanations sufficient, or do users need more detail?
3. **Technical Depth**: How technical should explanations be (e.g., "E.164 format" vs "international format")?
4. **Examples**: Should tooltips include specific examples (e.g., "+1234567890")?

### General
1. **Priority**: Which should we implement first - tours or tooltips?
2. **Phasing**: Should we roll out all 3 tours at once, or one at a time?
3. **Analytics**: Do we want to track tour completion and tooltip interaction rates?
4. **Feedback**: Should we add a "Was this helpful?" button to tours?

---

## 📝 Next Steps

**Option A: Implement All**
- All 3 tours + all tooltips
- Effort: ~15-20 hours
- Timeline: 1-2 weeks

**Option B: Phased Approach**
- Week 1: Communications + Earthquake tours
- Week 2: Contacts tour + Dashboard tooltips
- Week 3: Remaining tooltips

**Option C: Priority-Based**
- Start with most-used page (likely Earthquake Monitoring)
- Add tooltips to pain points identified in support tickets
- Roll out remaining tours based on user feedback

---

## 📌 Recommendation

**I recommend Option B: Phased Approach**

**Reasons:**
1. Allows for user feedback between phases
2. Reduces risk of overwhelming users with too much guidance at once
3. Enables iteration based on early metrics
4. Manageable development timeline

**Suggested First Phase:**
- Communications Tour (most complex page)
- Top 10 tooltips from Dashboard and Communications
- Gather metrics and user feedback

**Success Criteria:**
- 60%+ tour completion rate
- 40%+ tooltip interaction rate
- Measurable reduction in support tickets

---

**Ready to proceed?** Please review and provide feedback on:
- Tour content and structure
- Tooltip locations and text
- Implementation approach
- Priority and timeline

I can then implement the approved components.
