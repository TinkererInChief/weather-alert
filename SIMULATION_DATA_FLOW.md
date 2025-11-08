# 🌊 Tsunami Simulation: Complete Data Flow & Architecture

## Overview
This document explains in detail how the tsunami simulation works, what data is used, and how it flows through the system.

---

## 1. 🎯 What "Scenarios" Are (NOT Historical Data)

### Misconception: "Pre-loaded Historical Tsunami Data"
**FALSE!** The scenarios are NOT replaying historical events.

### Reality: Hard-Coded Simulation Parameters
The scenarios are simply **preset epicenter coordinates and magnitudes**:

```typescript
// File: app/dashboard/simulate-tsunami/scenarios.ts
{
  id: 'tohoku',
  name: 'Tohoku 9.0',
  epicenter: { lat: 38.3, lon: 142.4 },  // Just coordinates
  magnitude: 9.0,                          // Just a number
  description: '2011 Tohoku-like event'
}
```

### Why "Tohoku 9.0" is Named That Way
- **NOT** because it replays the actual 2011 event
- **YES** because it uses similar coordinates for testing
- The simulation is 100% synthetic physics calculations

---

## 2. 🔄 Complete Data Flow

### Phase 1: Page Load (Component Mount)
```
User Opens Map Page
       ↓
useEffect() runs
       ↓
fetch('/api/test/vessels')  ← Fetches YOUR LIVE vessels from DB
       ↓
Filter: vessels WITH positions
       ↓
Map: Display all vessels as gray markers
```

**Data Retrieved:**
```json
[
  {
    "id": "vessel-1",
    "name": "Pacific Voyager",
    "mmsi": "123456789",
    "position": {
      "latitude": 35.5,
      "longitude": 139.8
    }
  }
]
```

**Source**: Database → `VesselPosition` table (most recent record per vessel)

---

### Phase 2: Scenario Selection
```
User Clicks "Tohoku 9.0"
       ↓
setSelectedScenario({ lat: 38.3, lon: 142.4, magnitude: 9.0 })
       ↓
Map: Pan/zoom to epicenter
Map: Display epicenter star marker
```

**No API call!** Just React state update.

---

### Phase 3: Simulation Execution (The Magic)

```
User Clicks "Run Simulation"
       ↓
POST /api/test/simulate-tsunami
  Body: { 
    epicenterLat: 38.3, 
    epicenterLon: 142.4,
    magnitude: 9.0,
    sendNotifications: false  // Dry run mode
  }
       ↓
[API Backend Processing - See Section 3]
       ↓
Response: {
  simulation: {
    affectedVessels: [...],
    summary: {
      alertsCreated: 14,
      notificationsSent: 56
    },
    logs: [...]
  }
}
       ↓
Frontend:
  1. Stream logs to terminal (50ms delay per line)
  2. Animate wave circles (expanding radius)
  3. Update vessel markers with severity colors
  4. Display results summary bar
```

---

## 3. 🧮 Backend Simulation Logic

### Step-by-Step Processing

#### Step 1: Session & Fleet Lookup
```typescript
// Get logged-in user
const session = await getServerSession(authOptions)
const currentUser = session.user

// Find user's Contact record (fleets are owned by Contacts, not Users)
const contact = await prisma.contact.findFirst({
  where: {
    OR: [
      { email: currentUser.email },
      { phone: currentUser.phone }
    ]
  }
})

// Find all fleets owned by this contact
const fleets = await prisma.fleet.findMany({
  where: { ownerId: contact.id }
})
```

**Key Point**: Fleets belong to `Contact` records, not `User` records. This was the source of the "0 vessels at risk" bug in earlier sessions.

---

#### Step 2: Vessel Position Retrieval
```typescript
// Get all vessels in user's fleets with their latest positions
const fleetVessels = await prisma.fleetVessel.findMany({
  where: {
    fleetId: { in: fleetIds }
  },
  include: {
    vessel: {
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1  // Only latest position
        },
        contacts: {
          include: { contact: true }
        }
      }
    }
  }
})
```

**Data Retrieved**: Live vessel positions from DB (whatever was seeded/updated)

---

#### Step 3: Physics Calculations (THE CORE SIMULATION)

##### 3a. Distance Calculation (Haversine Formula)
```typescript
function calculateDistance(
  lat1: number, lon1: number,  // Epicenter
  lat2: number, lon2: number   // Vessel position
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c  // Distance in km
}
```

##### 3b. Wave Height Calculation
```typescript
function calculateWaveHeight(magnitude: number, distance: number): number {
  // Simplified tsunami model (not scientifically accurate)
  const baseHeight = Math.pow(10, magnitude - 5)  // M9.0 → ~10,000m initial
  const attenuation = 1 / Math.sqrt(distance + 1)  // Decay with distance
  return baseHeight * attenuation
}
```

**Example**:
- Magnitude 9.0, Distance 100km → ~31.6m wave
- Magnitude 9.0, Distance 500km → ~14.1m wave

##### 3c. ETA Calculation
```typescript
const TSUNAMI_SPEED_KMH = 800  // Open ocean speed

function calculateETA(distance: number): number {
  return Math.round((distance / TSUNAMI_SPEED_KMH) * 60)  // Minutes
}
```

**Example**:
- Distance 400km → 30 minutes ETA

##### 3d. Severity Classification
```typescript
function determineSeverity(distance: number): string {
  if (distance < 100)   return 'critical'  // Red
  if (distance < 300)   return 'high'      // Orange
  if (distance < 500)   return 'moderate'  // Yellow
  if (distance < 1000)  return 'low'       // Green
  return 'minimal'
}
```

---

#### Step 4: Alert Creation & Escalation

For each affected vessel:

```typescript
// 1. Create VesselAlert record in DB
const alert = await prisma.vesselAlert.create({
  data: {
    vesselId: vessel.id,
    type: 'TSUNAMI',
    severity: severity.toUpperCase(),
    riskLevel: 'HIGH',
    message: `TSUNAMI WARNING: ${waveHeight.toFixed(1)}m wave, ETA ${eta}min`,
    metadata: { distance, waveHeight, eta, magnitude }
  }
})

// 2. Find escalation policy
const policy = await prisma.escalationPolicy.findFirst({
  where: { organizationId: vessel.organizationId }
})

// 3. Trigger escalation (multi-step notifications)
const escalationResult = await escalationService.initiateEscalation(
  alert.id,
  isDryRun  // Don't send real SMS/emails in dry run
)
```

---

#### Step 5: Escalation Execution (Multi-Channel Notifications)

The `EscalationService` processes each policy step:

```typescript
// Escalation policy steps example:
{
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

**For each step:**
1. Find contacts with matching roles
2. For each channel (SMS, WhatsApp, Voice, Email):
   ```typescript
   if (channel === 'SMS') {
     await notificationService.sendSMS(contact.phone, message)
   } else if (channel === 'WHATSAPP') {
     await notificationService.sendWhatsApp(contact.phone, message)
   }
   // etc.
   ```
3. Log each notification in DB
4. Return count: `{ notificationsSent: 12 }`

**In Dry Run Mode**: Skips actual Twilio/SendGrid calls, just logs

---

## 4. 📊 API Response Structure

```json
{
  "success": true,
  "dryRun": true,
  "simulation": {
    "epicenter": { "lat": 38.3, "lon": 142.4 },
    "magnitude": 9.0,
    "tsunamiSpeed": 800,
    
    "affectedVessels": [
      {
        "vessel": {
          "id": "vessel-1",
          "name": "Pacific Voyager",
          "mmsi": "123456789",
          "position": { "lat": 35.5, "lon": 139.8 }
        },
        "distance": 312.5,
        "waveHeight": 18.4,
        "eta": 23,
        "severity": "high",
        "position": {
          "latitude": 35.5,
          "longitude": 139.8
        }
      }
    ],
    
    "summary": {
      "totalVessels": 20,
      "affectedVessels": 14,
      "alertsCreated": 14,
      "notificationsSent": 56  // 14 vessels × 4 contacts/vessel
    },
    
    "alerts": [
      {
        "alertId": "alert-uuid",
        "vessel": { ... },
        "escalation": {
          "success": true,
          "notificationsSent": 4,
          "contacts": [...]
        }
      }
    ],
    
    "logs": [
      "🌊 Tsunami simulation started",
      "📍 Epicenter: 38.3°N, 142.4°E",
      "📊 Magnitude: 9.0",
      "🚢 Found 14 vessels within 1000km danger zone",
      "⚠️ Vessel: Pacific Voyager (123456789)",
      "   Distance: 312km | Wave: 18.4m | ETA: 23min | CRITICAL",
      "📝 Alert created: alert-uuid",
      "   Policy: Emergency Response Policy",
      "   Escalation: ✅ Started",
      "   Notifications: 4 sent",
      "✅ Simulation complete!",
      "📊 14 alert(s) created",
      "📤 56 notification(s) simulated"
    ]
  }
}
```

---

## 5. 🎨 Frontend Visualization

### Map Updates
1. **Epicenter**: Pulsing star (⭐) at `(lat, lon)`
2. **Waves**: Two concentric circles:
   - Red inner (500km radius)
   - Cyan outer (1000km radius)
   - Animated expansion over 1.5 seconds
3. **Vessels**: Color-coded markers:
   ```
   🚢 Red    = Critical (< 100km)
   🚢 Orange = High     (100-300km)
   🚢 Yellow = Moderate (300-500km)
   🚢 Green  = Low      (500-1000km)
   ```

### Terminal Log
- **Green lines**: Success (✅, 🌊)
- **Yellow lines**: Warnings (⚠️, 🚢)
- **Red lines**: Critical (❌, CRITICAL)
- **Cyan lines**: Info (📍, 📊)
- Auto-scrolls to bottom
- 50ms delay between lines for cinematic effect

### Results Bar
Displays:
- **Vessels at Risk**: `affectedVessels.length`
- **Alerts Created**: `summary.alertsCreated`
- **Notifications Sent**: `summary.notificationsSent`

---

## 6. 🗂️ Data Sources Summary

| Component | Data Source | When Loaded |
|-----------|-------------|-------------|
| Vessel Positions | `VesselPosition` table | On page mount |
| Fleet Ownership | `Fleet` + `Contact` tables | During simulation |
| Epicenter/Magnitude | Hard-coded scenarios | User selection |
| Distance/Wave/ETA | **Calculated on-the-fly** | During simulation |
| Alert Records | Created in `VesselAlert` table | During simulation |
| Escalation Policies | `EscalationPolicy` table | During simulation |
| Notification Logs | Created in `NotificationLog` table | During simulation |

**NO HISTORICAL TSUNAMI DATA IS USED!**

---

## 7. 🐛 The "0 Alerts" Bug (Now Fixed)

### Problem
The footer showed "0 Alerts Sent" despite logs showing 14 alerts created.

### Root Cause
Type mismatch between API and frontend:

**API Returns:**
```json
{
  "simulation": {
    "summary": {
      "alertsCreated": 14,
      "notificationsSent": 56
    }
  }
}
```

**Frontend Was Reading:**
```typescript
result.simulation.alertsCreated  // undefined ❌
result.simulation.notificationsSent  // undefined ❌
```

### Fix Applied
```typescript
// BEFORE (Wrong)
const { alertsCreated, notificationsSent } = result.simulation

// AFTER (Correct)
const { summary } = result.simulation
const { alertsCreated, notificationsSent } = summary
```

---

## 8. 🧪 Testing Flow

To verify the simulation works:

1. **Seed vessels** with strategic positions:
   ```bash
   pnpm tsx scripts/add-strategic-vessels.ts
   ```

2. **Assign to your contact**:
   ```bash
   pnpm tsx scripts/assign-strategic-fleet.ts
   ```

3. **Open map**: `/dashboard/simulate-tsunami-map`

4. **Select "Tohoku 9.0"** (will find vessels near Japan)

5. **Run Simulation** (Dry Run mode)

6. **Verify**:
   - Map zooms to epicenter
   - Vessels change color
   - Terminal shows logs
   - Footer shows correct counts

---

## 9. 📐 Physics Formulas Used

### Haversine Distance
```
d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ1)×cos(φ2)×sin²(Δλ/2)))

Where:
  R = Earth's radius (6371 km)
  φ = latitude (radians)
  λ = longitude (radians)
```

### Simplified Tsunami Model
```
H(d) = H₀ × (1 / √(d + 1))

Where:
  H₀ = 10^(M - 5) (initial wave height from magnitude)
  d = distance from epicenter (km)
  M = earthquake magnitude
```

**NOTE**: This is a simplified model for simulation purposes, NOT scientifically accurate!

---

## 10. 🔮 Future Enhancements

### Potential Data Sources to Add:
1. **NOAA Real-Time Tsunami API**
   - Fetch live earthquake data
   - Replace hard-coded scenarios

2. **Historical Tsunami Database**
   - NOAA's NCEI Historical Tsunami Database
   - Replay actual events with real wave heights

3. **Bathymetry Data**
   - Ocean depth affects wave speed
   - Use GEBCO data for realistic propagation

4. **Weather Integration**
   - Combine with storm surge data
   - Factor in ocean currents

### Current Limitation:
The simulation is **purely synthetic** - it uses simplified physics on static vessel positions.

---

## Summary

**"Pre-loading scenarios"** means:
- ✅ Loading hard-coded coordinate presets
- ✅ Fetching your live vessel positions from DB
- ❌ NOT loading historical tsunami data
- ❌ NOT using real-world wave measurements

**The simulation:**
- Takes epicenter coordinates
- Calculates physics (distance, wave height, ETA)
- Creates alerts in your database
- Triggers multi-channel notifications
- Visualizes everything on the map

**All calculations happen in real-time when you click "Run Simulation"!**
