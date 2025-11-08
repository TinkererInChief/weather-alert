# 🌊 End-to-End Tsunami Simulation Guide

## Overview

This is a **realistic, production-ready tsunami simulation** that demonstrates the complete emergency alert pipeline from detection to escalation.

## What It Simulates

### 1. **Tsunami Event Detection**
- Epicenter location (latitude/longitude)
- Earthquake magnitude (Richter scale)
- Wave propagation at 800 km/h (realistic tsunami speed)

### 2. **Vessel Threat Assessment**
- Calculates distance from epicenter to each vessel
- Estimates wave height based on magnitude and distance
- Calculates ETA (when tsunami will reach vessel)
- Determines severity: Critical, High, Moderate, Low

### 3. **Automatic Alert Creation**
- Creates `VesselAlert` records for affected vessels
- Links appropriate escalation policy based on severity
- Stores event metadata (distance, wave height, ETA)

### 4. **Multi-Channel Escalation**
- Triggers escalation policies automatically
- Sends notifications via SMS, Email, WhatsApp, Voice
- Logs all escalation events to database
- Supports dry run mode for safe testing

## How to Use

### Access the Interface
```
http://localhost:3000/dashboard/simulate-tsunami
```

### Quick Start
1. **Use a preset scenario** (e.g., Tokyo Bay Mag 7.5)
2. **Leave "dry run" mode ON** for first test
3. **Click "Run Tsunami Simulation"**
4. **Watch the visual progress** through 6 stages
5. **Review results**: affected vessels, alerts, notifications

### Parameters

#### Epicenter Location
- **Latitude**: -90 to 90 (North/South)
- **Longitude**: -180 to 180 (East/West)

#### Magnitude
- **Range**: 5.0 - 9.0 (Richter scale)
- **5.0-5.9**: Minor - localized damage
- **6.0-6.9**: Moderate - regional impact
- **7.0-7.9**: Strong - significant tsunami risk
- **8.0+**: Major - catastrophic potential

### Preset Scenarios

#### 1. 🗾 Tokyo Bay (Mag 7.5)
- **Location**: 35.5°N, 139.8°E
- **Expected**: 3-5 vessels affected
- **Severity**: High to Critical
- **ETA**: 5-15 minutes

#### 2. 🌊 Tohoku (Mag 9.0)
- **Location**: 38.3°N, 142.4°E
- **Expected**: 8-12 vessels affected
- **Severity**: Critical
- **ETA**: 10-30 minutes
- **Note**: Based on 2011 real event

#### 3. 🏝️ Indonesia (Mag 7.0)
- **Location**: -8.5°N, 119.5°E
- **Expected**: 2-4 vessels affected
- **Severity**: Moderate to High
- **ETA**: 15-45 minutes

#### 4. 🌉 California (Mag 6.5)
- **Location**: 36.1°N, -121.9°E
- **Expected**: 1-2 vessels affected
- **Severity**: Low to Moderate
- **ETA**: 20-60 minutes

## Simulation Flow

### Stage 1: Detecting Event
- Receives earthquake parameters
- Validates epicenter and magnitude
- Initializes simulation log

### Stage 2: Wave Propagation
- Calculates tsunami wave speed (800 km/h)
- Models wave height attenuation
- Determines danger zones (0-1000km)

### Stage 3: Scanning Vessels
- Queries all vessels in your fleets
- Retrieves latest AIS positions
- Filters vessels within 1000km radius

### Stage 4: Threat Assessment
- Calculates distance for each vessel
- Estimates wave height at vessel location
- Computes ETA based on speed and distance
- Assigns severity level

### Stage 5: Creating Alerts
- Creates `VesselAlert` for each affected vessel
- Selects appropriate escalation policy
- Stores threat data (distance, wave, ETA)
- Links to vessel and policy

### Stage 6: Triggering Escalation
- Initiates escalation service
- Executes Step 1 immediately
- Sends notifications via all configured channels
- Logs delivery status

## Results Dashboard

### Summary Cards
- **Magnitude**: Earthquake strength
- **Vessels at Risk**: Count within danger zone
- **Alerts Created**: Number of alerts generated
- **Notifications**: Sent (or simulated)

### Affected Vessels Display
For each vessel:
- **Name & MMSI**: Vessel identification
- **Severity Badge**: Color-coded threat level
- **Distance**: Kilometers from epicenter
- **Wave Height**: Expected meters
- **ETA**: Minutes until arrival
- **Position**: Lat/Lon coordinates

### Simulation Log
Terminal-style output showing:
- Event parameters
- Vessel scanning progress
- Threat calculations
- Alert creation status
- Escalation execution
- Notification delivery

## Safety Features

### Dry Run Mode (Default)
- ✅ Simulates entire pipeline
- ✅ Shows what WOULD happen
- ✅ Creates database records
- ✅ Logs all events
- ❌ Does NOT send real messages
- ❌ Does NOT consume credits

### Live Mode (Checkbox ON)
- ⚠️ Sends REAL notifications
- ⚠️ Uses Twilio/SendGrid credits
- ⚠️ Contacts receive actual alerts
- ✅ Full end-to-end test
- ✅ Production-ready validation

## Technical Details

### Wave Height Calculation
```
baseHeight = 10^(magnitude - 5)  // Meters
attenuation = e^(-distance/1000)
waveHeight = baseHeight × attenuation
```

### Severity Rules
| Wave Height | Distance | Severity |
|------------|----------|----------|
| >10m | <100km | Critical |
| >5m | <300km | High |
| >2m | <500km | Moderate |
| <2m | <1000km | Low |

### Escalation Policies
- **Tsunami Critical**: 3-step, immediate SMS+Email, Voice escalation
- **Tsunami High**: 3-step, email first, SMS+Voice backup
- Policies are auto-selected based on severity

## Vessel Positions

Your 25 test vessels are distributed across:
- 🗾 **Tokyo Bay**: 3 vessels
- 🌊 **Pacific Ocean**: 6 vessels
- 🏝️ **Southeast Asia**: 4 vessels
- 🌉 **US West Coast**: 3 vessels
- 🏖️ **Hawaii**: 2 vessels
- 🦘 **Australia**: 2 vessels
- 🌴 **Indian Ocean**: 3 vessels
- 🇹🇼 **Taiwan/Hong Kong**: 2 vessels

## Use Cases

### 1. Client Demo
- Use Tokyo Bay scenario
- Dry run mode
- Show visual progression
- Highlight multi-channel escalation
- Demonstrate real-time threat assessment

### 2. System Testing
- Test different magnitudes
- Verify severity calculations
- Check escalation policies
- Validate notification routing

### 3. Training
- Show emergency response flow
- Demonstrate ETA calculations
- Explain escalation steps
- Train on acknowledgment (coming soon)

### 4. Integration Test
- Verify end-to-end pipeline
- Test with live notifications
- Validate Twilio/SendGrid
- Check database logging

## What's Next

### Phase 2: Auto-Escalation
- Background jobs for Step 2, 3
- Timeout-based progression
- Acknowledgment checking
- Real-time status updates

### Phase 3: Live Monitoring
- Real DART buoy integration
- Automatic event detection
- No manual trigger needed
- Production alerting

### Phase 4: Response Tracking
- SMS reply handling
- Acknowledgment API
- Status dashboard
- Incident timeline

## FAQ

**Q: Why use dry run mode?**
A: Safe for demos, no costs, tests logic without sending messages.

**Q: How accurate is the simulation?**
A: Wave physics is simplified but realistic. Real systems use complex models.

**Q: Can I add custom vessel positions?**
A: Yes! Run `scripts/update-vessel-positions.ts` with your coordinates.

**Q: What if no vessels are affected?**
A: Simulation completes successfully with zero alerts (vessels too far).

**Q: How long does simulation take?**
A: 4-6 seconds for full pipeline (detection → escalation → logs).

## Architecture

```
User Input (Epicenter, Magnitude)
         ↓
[POST /api/test/simulate-tsunami]
         ↓
Tsunami Physics Calculations
         ↓
Query Vessel Positions (AIS data)
         ↓
Threat Assessment (distance, wave, ETA)
         ↓
Create VesselAlerts (database)
         ↓
Select Escalation Policies
         ↓
Trigger EscalationService
         ↓
Send Notifications (SMS/Email/WhatsApp)
         ↓
Log Results (EscalationLog table)
         ↓
Return Visual Results to UI
```

## Database Records Created

Per affected vessel:
1. **VesselAlert** record
2. **EscalationLog** entries (one per contact/channel)
3. **Notification delivery status** (if live mode)

Query to view:
```sql
SELECT * FROM "VesselAlert" 
WHERE source = 'SIMULATION' 
ORDER BY "createdAt" DESC;
```

---

**Ready to simulate?** Go to `/dashboard/simulate-tsunami` and run your first scenario! 🌊
