# 📋 Escalation Matrix Visualization Guide

## Overview
The Escalation Matrix provides a comprehensive visual representation of the multi-step alert escalation process, showing exactly who gets notified, when, and through which channels during a tsunami simulation.

---

## 🎯 Features

### 1. **Escalation Summary Widget** (Bottom-Left Floating)
A collapsible widget that provides quick stats:
- **Alert Count**: Total number of vessels affected
- **Contact Count**: Unique contacts notified
- **Notification Count**: Total notifications sent/simulated
- **Severity Breakdown**: Critical and High priority counts
- **Recent Alerts**: List of up to 5 most recent vessel alerts

**Interaction:**
- Click header to expand/collapse
- Click "View Full Escalation Matrix" to open detailed modal

---

### 2. **Full Escalation Matrix Modal**
Detailed view showing complete escalation flow for all affected vessels.

#### Components:

##### A. Vessel Alert Card
Each affected vessel gets a card displaying:
- **Vessel Info**: Name, MMSI, distance, wave height, ETA
- **Severity Badge**: Color-coded (Critical/High/Moderate/Low)
- **Policy Info**: Name of escalation policy used
- **Notification Summary**: Total notifications sent/simulated

##### B. Escalation Steps
For each policy step:
- **Step Number**: Visual indicator (1, 2, 3...)
- **Timing**: "Immediate" or "After X minutes"
- **Channels**: Color-coded badges for each channel:
  - 🔵 **SMS** - Blue
  - 🟢 **WhatsApp** - Green
  - 🟣 **Voice Call** - Purple
  - 🟠 **Email** - Amber
- **Roles**: Which contact roles are notified (Captain, Chief Officer, Owner, etc.)

##### C. Contact Cards
For each contact in the step:
- **Name & Role**: Contact identification
- **Priority**: Notification priority order
- **Contact Info**: Phone/Email (relevant to channels)
- **Status**: ✅ Simulated/Sent indicator
- **Channel Count**: Number of channels used

---

## 📊 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Escalation Matrix                                      ✕   │
│  Detailed view of all alerts and notification escalation    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🚢 Pacific Voyager (MMSI: 123456789)     [CRITICAL]  │   │
│  │ Distance: 312 km | Wave: 4.12 m | ETA: 26 min       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Policy: Emergency Response Policy | Simulated: 24    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │ ① Step 1  ⏱ Immediate  [SMS] [WHATSAPP]    │     │   │
│  │  ├─────────────────────────────────────────────┤     │   │
│  │  │ Notifying: CAPTAIN, CHIEF_OFFICER           │     │   │
│  │  │ ┌──────────────┐  ┌──────────────┐         │     │   │
│  │  │ │ John Smith   │  │ Jane Doe     │         │     │   │
│  │  │ │ CAPTAIN      │  │ CHIEF_OFFICER│         │     │   │
│  │  │ │ ✓ 2 channels │  │ ✓ 2 channels │         │     │   │
│  │  │ └──────────────┘  └──────────────┘         │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  │  ┌─────────────────────────────────────────────┐     │   │
│  │  │ ② Step 2  ⏱ After 15 min  [VOICE] [EMAIL]  │     │   │
│  │  ├─────────────────────────────────────────────┤     │   │
│  │  │ Notifying: OWNER, FLEET_MANAGER             │     │   │
│  │  │ ┌──────────────┐  ┌──────────────┐         │     │   │
│  │  │ │ Bob Johnson  │  │ Sarah Lee    │         │     │   │
│  │  │ │ OWNER        │  │ FLEET_MGR    │         │     │   │
│  │  │ │ ✓ 2 channels │  │ ✓ 2 channels │         │     │   │
│  │  │ └──────────────┘  └──────────────┘         │     │   │
│  │  └─────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ... (more vessels)                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Coding

### Severity Levels
- **Critical**: 🔴 Red (`#ef4444`)
- **High**: 🟠 Orange (`#f59e0b`)
- **Moderate**: 🟡 Yellow (`#eab308`)
- **Low**: 🟢 Green (`#10b981`)

### Notification Channels
- **SMS**: 🔵 Blue (`#3b82f6`)
- **WhatsApp**: 🟢 Green (`#10b981`)
- **Voice Call**: 🟣 Purple (`#a855f7`)
- **Email**: 🟠 Amber (`#f59e0b`)

### Status Indicators
- **Simulated** (Dry Run): 🟢 Green checkmark
- **Sent** (Live): 🔵 Cyan checkmark
- **Warning**: 🟠 Amber alert icon

---

## 🔄 Escalation Flow Example

### Scenario: Critical Tsunami Alert

**Vessel:** Pacific Voyager  
**Severity:** CRITICAL  
**Policy:** Emergency Response Policy

#### Step 1 - Immediate Action
```
⏱ Timing: Immediate (0 minutes)
👥 Roles: CAPTAIN, CHIEF_OFFICER
📱 Channels: SMS, WhatsApp

Contacts Notified:
1. John Smith (Captain) - Priority 1
   - SMS: +1-555-0101
   - WhatsApp: +1-555-0101
   
2. Jane Doe (Chief Officer) - Priority 2
   - SMS: +1-555-0102
   - WhatsApp: +1-555-0102

Notifications: 4 sent (2 contacts × 2 channels)
```

#### Step 2 - Management Escalation
```
⏱ Timing: After 15 minutes
👥 Roles: OWNER, FLEET_MANAGER
📞 Channels: Voice Call, Email

Contacts Notified:
1. Bob Johnson (Owner) - Priority 1
   - Voice: +1-555-0201
   - Email: bob@fleet.com
   
2. Sarah Lee (Fleet Manager) - Priority 2
   - Voice: +1-555-0202
   - Email: sarah@fleet.com

Notifications: 4 sent (2 contacts × 2 channels)
```

#### Step 3 - External Authorities (if applicable)
```
⏱ Timing: After 30 minutes
👥 Roles: EMERGENCY_CONTACT
📧 Channels: Email, SMS

Notifications: 2 sent
```

**Total for Vessel:** 10 notifications across 6 unique contacts

---

## 📈 Statistics Calculation

### Global Summary (All Vessels)
```typescript
Total Alerts = Number of affected vessels
Total Contacts = Unique contacts across all alerts
Total Notifications = Sum of all notifications sent/simulated

Calculation:
- Each contact can receive multiple channels
- Each step multiplies: contacts × channels
- Example: 2 contacts × 2 channels = 4 notifications/step
```

### Per-Vessel Breakdown
```
For Pacific Voyager (3 steps):
- Step 1: 2 contacts × 2 channels = 4 notifications
- Step 2: 2 contacts × 2 channels = 4 notifications  
- Step 3: 1 contact  × 2 channels = 2 notifications
Total: 10 notifications
```

---

## 🎓 Understanding Escalation Policies

### Policy Structure
```json
{
  "name": "Emergency Response Policy",
  "eventTypes": ["tsunami", "storm"],
  "severityLevels": ["critical", "high"],
  "steps": [
    {
      "waitMinutes": 0,
      "notifyRoles": ["CAPTAIN", "CHIEF_OFFICER"],
      "channels": ["SMS", "WHATSAPP"]
    },
    {
      "waitMinutes": 15,
      "notifyRoles": ["OWNER", "FLEET_MANAGER"],
      "channels": ["VOICE_CALL", "EMAIL"]
    }
  ]
}
```

### Key Concepts

#### 1. **Role-Based Notification**
- Contacts are assigned roles (CAPTAIN, OWNER, etc.)
- Steps specify which roles to notify
- System automatically finds contacts with matching roles
- Contacts can have multiple roles

#### 2. **Multi-Channel Delivery**
- Each step can use multiple channels
- Same contact may receive via SMS + WhatsApp simultaneously
- Increases reliability (if one channel fails, others may succeed)
- Different channels for different urgency levels

#### 3. **Timing & Escalation**
- `waitMinutes: 0` = Immediate notification
- `waitMinutes: 15` = Wait 15 min before this step
- Escalates to higher management over time
- Prevents alert fatigue for non-urgent contacts

#### 4. **Priority Ordering**
- Contacts have priority numbers (1, 2, 3...)
- Lower number = higher priority
- Within same step, higher priority contacts notified first
- Helps ensure critical contacts aren't missed

---

## 🔍 Dry Run vs Live Mode

### Dry Run Mode (Default)
- **Behavior**: Simulates notifications without actually sending
- **Display**: "Simulated" label, green checkmarks
- **Purpose**: Testing and validation
- **Cost**: $0 (no real SMS/calls/emails sent)

**Use Cases:**
- Testing new policies
- Training exercises
- Scenario planning
- System validation

### Live Mode
- **Behavior**: Actually sends SMS, WhatsApp, calls, emails
- **Display**: "Sent" label, cyan checkmarks
- **Purpose**: Real emergency response
- **Cost**: Provider charges apply (Twilio, SendGrid, etc.)

**Use Cases:**
- Real tsunami events
- Actual emergencies
- Official drills (with participant consent)

---

## 🛠️ Technical Implementation

### Data Flow
```
1. Simulation API creates VesselAlert
   ↓
2. API finds matching EscalationPolicy
   ↓
3. For each policy step:
   - Filter contacts by roles
   - For each contact:
     - For each channel:
       - Send notification (or simulate)
       - Log result
   ↓
4. Return escalation results to frontend
   ↓
5. EscalationMatrix visualizes the data
```

### Components

#### EscalationMatrixModal
- **Purpose**: Full-screen detailed view
- **Trigger**: Click "View Detailed Report" button
- **Features**: 
  - Scrollable vessel list
  - Expandable steps
  - Contact grid layout
  - Status indicators

#### EscalationSummaryWidget
- **Purpose**: Quick overview widget
- **Position**: Bottom-left floating
- **Features**:
  - Collapsible design
  - Top 5 alerts preview
  - Quick stats display
  - Link to full modal

---

## 🎯 User Interaction Guide

### Opening the Matrix
1. Run a tsunami simulation
2. Wait for completion
3. **Option A**: Click "View Detailed Report" in footer bar
4. **Option B**: Click "View Full Escalation Matrix" in summary widget

### Navigating the Modal
- **Scroll** to view all affected vessels
- Each vessel card shows complete escalation flow
- **Colored badges** indicate severity and channels
- **Green checkmarks** confirm notification status
- **Contact cards** show who was reached

### Understanding the Display
- **Top section**: Vessel identification and threat data
- **Middle section**: Policy name and notification count
- **Bottom section**: Step-by-step escalation breakdown
- **Each step**: Timing, roles, channels, and contacts

### Closing the Modal
- Click **✕** button in top-right
- Click outside modal (on backdrop)
- Press **Escape** key (if implemented)

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Full 6-column modal width
- Multi-column contact grid (2 columns)
- Expanded widget sidebar

### Tablet (768px - 1024px)
- Modal takes 90% width
- 2-column contact grid maintained
- Compact widget

### Mobile (< 768px)
- Full-screen modal
- Single-column contact grid
- Minimized widget (collapsed by default)

---

## 🔐 Security & Privacy

### Contact Information Display
- Phone numbers: Partially masked in production
- Emails: Full display (team members only)
- Roles: Public within organization
- Priority: Internal metadata

### Notification Logs
- All notifications logged with timestamps
- Dry run status clearly indicated
- Audit trail for compliance
- No sensitive message content stored

---

## 🚀 Performance Optimization

### Lazy Loading
- Modal only renders when opened
- Contact cards virtualized for large lists (future)
- Images/icons cached

### Memory Management
- Widget collapses to save resources
- Modal unmounts on close
- Large datasets paginated (future)

---

## 🎨 Customization Options (Future)

### Theme Support
- Dark mode (default)
- Light mode
- High contrast mode
- Custom brand colors

### Display Options
- Compact vs Expanded view
- Grid vs List layout
- Step numbering style
- Channel icon sets

---

## 📊 Analytics & Metrics

### Tracked Data
- Escalation completion rate
- Average notifications per vessel
- Channel success rates
- Time to notify all contacts
- Policy effectiveness scores

### Reports (Future)
- Executive summary
- Per-vessel report
- Per-contact report
- Channel performance report

---

## 🧪 Testing Scenarios

### Test 1: Single Vessel, Simple Policy
```
Vessel: Test Ship 1
Policy: 1 step, 2 roles, 2 channels
Expected: 4 notifications (2×2)
```

### Test 2: Multiple Vessels, Complex Policy
```
Vessels: 5 vessels
Policy: 3 steps, varying roles/channels
Expected: ~60 notifications total
```

### Test 3: Missing Contacts
```
Scenario: Policy requires ENGINEER role
Issue: No contacts have ENGINEER role
Expected: Warning displayed in matrix
```

### Test 4: Dry Run Toggle
```
Action: Switch between dry run and live
Expected: Labels update, colors change
```

---

## 🐛 Troubleshooting

### Issue: No contacts displayed in step
**Cause**: No contacts with specified roles  
**Solution**: Assign contacts to vessels with correct roles

### Issue: Notification count is 0
**Cause**: All contacts missing phone/email  
**Solution**: Add contact information to database

### Issue: Modal doesn't open
**Cause**: No alerts in simulation result  
**Solution**: Ensure vessels are within danger zone

### Issue: Widget shows wrong count
**Cause**: Type mismatch in API response  
**Solution**: Check `alerts` array in response

---

## 📚 Related Documentation

- **SIMULATION_DATA_FLOW.md** - How simulation works
- **TSUNAMI_PHYSICS_UPGRADE.md** - Scientific accuracy
- **API_ESCALATION.md** - Backend escalation service
- **CONTACT_MANAGEMENT.md** - Contact & role setup

---

## ✅ Summary

The Escalation Matrix provides:
✅ **Transparency**: See exactly who gets notified  
✅ **Accountability**: Track all notifications  
✅ **Education**: Understand escalation policies  
✅ **Debugging**: Identify missing contacts/roles  
✅ **Compliance**: Audit trail for regulations  
✅ **Testing**: Validate policies before deployment  

**Location:** `/dashboard/simulate-tsunami-map`  
**Trigger:** Run simulation → Click "View Detailed Report"  
**Components:** Modal + Summary Widget  
**Status:** ✅ Production Ready
