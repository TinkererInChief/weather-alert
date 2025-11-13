# GNSS Technical Integration Guide
## Detailed Implementation Paths for Tsunami Detection

**Companion Document to:** DATA_AVAILABILITY_RESEARCH.md  
**Focus:** Technical specifications, API details, and implementation guidance

---

## 1. NTRIP Protocol Deep Dive

### 1.1 What is NTRIP?

**NTRIP = Networked Transport of RTCM via Internet Protocol**

NTRIP is an application-level protocol for streaming GNSS data over the Internet in real-time. It's essentially HTTP/1.1 with GNSS-specific extensions.

**Why NTRIP for Tsunami Detection:**
- Real-time GNSS observations from global networks
- Sub-second latency (critical for rapid detection)
- Standard protocol (many open-source clients)
- Station metadata (coordinates, equipment)

### 1.2 NTRIP Architecture

```
┌─────────────────┐
│ GNSS Receiver   │ (at station site)
│ + Antenna       │
└────────┬────────┘
         │ Serial/IP
         ↓
┌─────────────────┐
│ NTRIP Server    │ (converts receiver data to NTRIP)
└────────┬────────┘
         │ HTTP POST
         ↓
┌─────────────────┐
│ NTRIP Caster    │ (central hub, e.g., products.igs-ip.net:2101)
│ (Broadcaster)   │
└────────┬────────┘
         │ HTTP GET (with mountpoint)
         ↓
┌─────────────────┐
│ NTRIP Client    │ ← YOUR APPLICATION
│ (Consumer)      │
└─────────────────┘
```

### 1.3 Connection Example

**Request:**
```http
GET /RTCM3 HTTP/1.1
Host: products.igs-ip.net:2101
User-Agent: NTRIP YourAppName/1.0
Authorization: Basic base64(username:password)
Accept: */*
Connection: close
```

**Response (stream):**
```
HTTP/1.1 200 OK
Content-Type: gnss/data
```
...then continuous binary RTCM 3.x messages...

### 1.4 Open-Source NTRIP Clients

**BKG NTRIP Client (BNC)** - Recommended
```bash
# Download from: https://igs.bkg.bund.de/ntrip/bnc
# Qt-based, cross-platform
# Features:
- Multi-stream support
- RTCM 2.x/3.x decoding
- RINEX output
- Real-time positioning
```

**Python Library:**
```python
# pip install ntripclient
from ntripclient import NtripClient

client = NtripClient(
    host='products.igs-ip.net',
    port=2101,
    mountpoint='RTCM3',
    username='your_username',
    password='your_password'
)

for data in client.stream():
    # Process RTCM messages
    process_gnss_data(data)
```

---

## 2. RTCM Message Format

### 2.1 What is RTCM?

**RTCM = Radio Technical Commission for Maritime Services**

RTCM is a binary protocol for transmitting GNSS corrections and observations. RTCM 3.x is the current standard.

### 2.2 Key Message Types for Tsunami Detection

| Message ID | Description | Use for Tsunami |
|------------|-------------|-----------------|
| **1004** | Extended L1/L2 GPS observations | Station positions |
| **1005** | Stationary RTK reference station | Station coordinates |
| **1006** | Stationary RTK ref + antenna height | Precise position |
| **1012** | Extended L1/L2 GLONASS observations | Multi-GNSS |
| **1019** | GPS ephemerides | Satellite orbits |
| **1020** | GLONASS ephemerides | Satellite orbits |
| **1077** | GPS MSM7 (full observations) | High-rate data |
| **1087** | GLONASS MSM7 | Multi-constellation |

**For Tsunami Detection, You Need:**
- **Message 1005/1006:** Station coordinates (to detect displacement)
- **Message 1004/1077:** Observations (to calculate position)
- **Message 1019:** Ephemerides (satellite positions)

### 2.3 RTCM Decoding Libraries

**C/C++:**
```c
// RTKLIB - Open Source (BSD license)
// https://github.com/tomojitakasu/RTKLIB
#include "rtklib.h"

int decode_rtcm3(rtcm_t *rtcm, unsigned char data) {
    // Decode RTCM message byte-by-byte
    // Returns message type when complete
}
```

**Python:**
```python
# pyrtcm - Python RTCM decoder
# pip install pyrtcm
from pyrtcm import RTCMReader

with open('rtcm_stream.bin', 'rb') as stream:
    rdr = RTCMReader(stream)
    for (raw_data, parsed_data) in rdr:
        if parsed_data.identity == '1005':
            # Station coordinates
            lat = parsed_data.lat
            lon = parsed_data.lon
            height = parsed_data.height
```

---

## 3. Rapid Magnitude Estimation from GNSS

### 3.1 Concept

When an earthquake occurs, GNSS stations near the epicenter detect:
1. **Static offset:** Permanent displacement (cm to meters)
2. **Dynamic motion:** Seismic waves (high-frequency)
3. **Near-field effects:** Within 200km of rupture

**Key Insight:** Static displacement scales with earthquake magnitude
- M7.0: ~10cm
- M8.0: ~50cm
- M9.0: ~1-5 meters

### 3.2 Algorithm (Simplified)

**Step 1: Detect Earthquake**
```python
def detect_seismic_trigger(gnss_positions, time_window=60):
    """
    Monitor GNSS position time series for sudden changes
    
    Args:
        gnss_positions: List of (time, lat, lon, height) tuples
        time_window: Seconds to analyze
    
    Returns:
        is_earthquake: Boolean
        displacement: Meters (3D)
    """
    recent = gnss_positions[-time_window:]
    
    # Calculate mean before/after potential event
    baseline = mean(recent[:30])
    current = mean(recent[-30:])
    
    displacement = distance_3d(baseline, current)
    
    # Threshold: >3cm suggests M5+
    return displacement > 0.03, displacement
```

**Step 2: Estimate Magnitude**
```python
def estimate_magnitude_from_gnss(stations, displacements):
    """
    Estimate magnitude from multi-station displacements
    
    Based on: Mw = a + b * log10(D) + c * log10(R)
    Where: D = displacement (m), R = distance from epicenter (km)
    """
    max_displacement = max(displacements.values())
    
    # Empirical relationship (Crowell et al., 2016)
    if max_displacement < 0.05:
        return None  # Too small
    elif max_displacement < 0.15:
        return 6.5  # M6.5
    elif max_displacement < 0.5:
        return 7.5  # M7.5
    elif max_displacement < 1.5:
        return 8.5  # M8.5
    else:
        return 9.0  # M9.0+
```

**Step 3: Invert for Finite Fault**
```python
def invert_slip_distribution(stations, displacements):
    """
    Invert GNSS displacements for earthquake slip distribution
    
    This is COMPLEX - requires:
    1. Fault geometry (strike, dip, depth)
    2. Green's functions (elastic half-space)
    3. Regularization (smooth slip)
    
    Recommend using existing tools:
    - Geodetic Bayesian Inversion Software (GBIS)
    - CSI (CalTech Slip Inversion)
    - USGS PAGER finite fault modules
    """
    # This is PhD-level work - partner with university!
    pass
```

### 3.3 Speed Advantage

**Traditional Seismic:**
- P-wave arrival: T+0
- S-wave arrival: T+10-30 sec
- Initial magnitude: T+2 min (uncertain)
- Revised magnitude: T+5-10 min
- **Final magnitude: T+15-30 min** ← Too slow for near-field!

**With GNSS:**
- P-wave arrival: T+0
- GNSS detects displacement: T+30-90 sec (accumulating offset)
- **Magnitude estimate: T+2-4 min** ← 10+ minutes faster!

---

## 4. Ionospheric TEC Detection (GUARDIAN Approach)

### 4.1 Concept

Tsunamis create **atmospheric gravity waves** that propagate upward and disturb the ionosphere. These appear as ripples in Total Electron Content (TEC).

**Detection Timeline:**
- Earthquake: T+0
- Tsunami starts: T+0
- Atmospheric wave reaches ionosphere: T+8-15 min
- **TEC perturbation detected: T+10-20 min** (faster than ocean wave arrival!)

**Key Advantage:** Can detect tsunami BEFORE it reaches coast in near-field scenarios.

### 4.2 TEC Calculation

**TEC = Total Electron Content** (electrons/m² along signal path)

Calculated from GNSS dual-frequency observations:
```
TEC = (f1² * f2²) / (40.3 * (f1² - f2²)) * (P2 - P1 + constant)

Where:
- f1, f2 = GNSS frequencies (e.g., GPS L1=1575.42 MHz, L2=1227.60 MHz)
- P1, P2 = Pseudorange observations on L1, L2
- constant = Hardware delays (calibrated)

Units: TECU (TEC Units) = 10^16 electrons/m²
```

### 4.3 Algorithm (Simplified)

**Step 1: Compute TEC Time Series**
```python
def calculate_tec(gnss_obs):
    """
    Calculate TEC from dual-frequency GNSS observations
    
    Args:
        gnss_obs: {
            'L1_pseudorange': float,  # meters
            'L2_pseudorange': float,
            'L1_carrier': float,      # cycles
            'L2_carrier': float,
            'timestamp': datetime
        }
    
    Returns:
        tec: float (TECU)
    """
    f1 = 1575.42e6  # GPS L1 frequency (Hz)
    f2 = 1227.60e6  # GPS L2 frequency (Hz)
    
    P1 = gnss_obs['L1_pseudorange']
    P2 = gnss_obs['L2_pseudorange']
    
    # Geometry-free combination
    tec_raw = (f1**2 * f2**2) / (40.3 * (f1**2 - f2**2)) * (P2 - P1)
    
    # Convert to TECU
    tec = tec_raw / 1e16
    
    return tec
```

**Step 2: Detect TEC Perturbations**
```python
def detect_tsunami_tec_signature(tec_series, earthquake_time):
    """
    Look for tsunami-induced TEC perturbations
    
    Tsunami signature:
    - Appears 10-20 min after earthquake
    - Period: 8-15 minutes (gravity wave frequency)
    - Amplitude: 0.1-1.0 TECU (depends on tsunami size)
    - Propagates as wavefront from epicenter
    """
    # Get TEC after earthquake
    post_eq = tec_series[tec_series.time > earthquake_time]
    
    # Bandpass filter: 3-20 minute periods
    filtered = bandpass_filter(post_eq, period_min=180, period_max=1200)
    
    # Detect anomalies
    std = filtered.std()
    anomalies = filtered[abs(filtered) > 3 * std]
    
    if len(anomalies) > 5:  # Multiple cycles
        return True, anomalies.max()
    
    return False, 0
```

**Step 3: Multi-Station Detection**
```python
def confirm_tsunami_via_tec(all_stations_tec, earthquake):
    """
    Confirm tsunami by detecting TEC wavefront across multiple stations
    """
    detections = []
    
    for station in all_stations_tec:
        has_signal, amplitude = detect_tsunami_tec_signature(
            station.tec_series, 
            earthquake.time
        )
        
        if has_signal:
            # Calculate expected arrival time based on distance
            distance_km = haversine(station.pos, earthquake.epicenter)
            expected_delay = distance_km / 0.2  # TEC wave speed ~200 m/s
            
            detections.append({
                'station': station.id,
                'amplitude': amplitude,
                'delay': (station.detection_time - earthquake.time).seconds,
                'expected_delay': expected_delay
            })
    
    # If 3+ stations detect with consistent timing → TSUNAMI
    if len(detections) >= 3:
        return True, detections
    
    return False, []
```

### 4.4 Challenges

**⚠️ This is HARD:**
1. **Ionosphere is noisy:** Solar activity, geomagnetic storms
2. **Co-seismic effects:** Earthquake itself perturbs ionosphere
3. **Requires expertise:** Ionospheric physics, signal processing
4. **Validation is critical:** False positives can cause panic

**Recommendation:** Don't implement from scratch. Wait for GUARDIAN operational access or partner with JPL/university.

---

## 5. GeoNet API Integration (Quick Win)

### 5.1 Why GeoNet?

- ✅ Already licensed (CC BY 3.0)
- ✅ Well-documented JSON API
- ✅ GNSS + tsunami gauges + seismic
- ✅ English documentation
- ✅ Operational reliability

### 5.2 API Endpoints

**Base URL:** `https://api.geonet.org.nz/`

**GNSS Data:**
```http
GET /quake/{quakeID}
Returns earthquake with moment tensor (uses GNSS)

GET /tsunami/gauge/{gaugeID}
Returns coastal sea level observations
```

### 5.3 Integration Example

**Extend Existing GeoNet Source:**
```typescript
// lib/data-sources/geonet-source.ts

async function fetchGNSSInformedMagnitude(quakeID: string) {
  const url = `https://api.geonet.org.nz/quake/${quakeID}`
  const response = await fetch(url)
  const data = await response.json()
  
  if (data.moment_tensor && data.moment_tensor.source === 'GNSS') {
    // This magnitude includes GNSS data!
    return {
      magnitude: data.magnitude,
      source: 'GeoNet (GNSS-informed)',
      confidence: 'high',
      update_time: data.moment_tensor.time
    }
  }
  
  return null
}
```

**Add to Enrichment Service:**
```typescript
// lib/services/earthquake-enrichment.service.ts

if (alert.region === 'New Zealand' || alert.region === 'Southwest Pacific') {
  const gnss_mag = await fetchGNSSInformedMagnitude(alert.id)
  
  if (gnss_mag && gnss_mag.magnitude > alert.magnitude) {
    alert.magnitude = gnss_mag.magnitude
    alert.confidence += 0.15  // Boost confidence
    alert.sources.push('GeoNet-GNSS')
  }
}
```

### 5.4 Coastal Tsunami Gauge Integration

**Already have tsunami gauges, add GNSS-IR when available:**
```typescript
async function fetchCoastalSeaLevel(station: string) {
  const url = `https://tilde.geonet.org.nz/v3/data/${station}`
  
  // Returns time series of sea level
  // Can detect tsunami arrival before harbor impact
}
```

---

## 6. Implementation Roadmap

### Month 1-2: DART UI (Phase 1)
```
Week 1-2: DART-confirmed badges
Week 3-4: Coverage heat map
Week 5-6: Verification timeline
Week 7-8: Network health dashboard
```

### Month 3-4: GeoNet GNSS (Phase 2)
```
Week 9-10: Extend GeoNet API integration
Week 11-12: Add GNSS-informed magnitude ingest
Week 13-14: Test with historical NZ earthquakes
Week 15-16: UI updates for GNSS data source
```

### Month 5-6: Monitor NOAA (Phase 3)
```
Week 17-20: Track NASA-NOAA project
Week 21-22: Contact JPL GUARDIAN team
Week 23-24: Prototype PTWC GNSS integration
```

### Month 7-12: Evaluate Custom vs Wait
```
Months 7-9: If NOAA operational → integrate (easy!)
Months 10-12: If still blocked → evaluate custom IGS/UNAVCO pipeline
```

---

## 7. Cost-Benefit Analysis

### DART Excellence (Phase 1)
- **Cost:** $10K-15K developer time
- **Time:** 6-8 weeks
- **Benefit:** Immediate differentiation, high user value
- **ROI:** 🔥🔥🔥🔥🔥 (highest)

### GeoNet GNSS (Phase 2)
- **Cost:** $8K-12K developer time
- **Time:** 4-6 weeks
- **Benefit:** Regional improvement (NZ/Pacific)
- **ROI:** 🔥🔥🔥🔥 (high)

### Custom GNSS Pipeline (Phase 4, if needed)
- **Cost:** $200K-500K (developers + geodesy consultant + infrastructure)
- **Time:** 12-24 months
- **Benefit:** Full GNSS capabilities globally
- **ROI:** 🔥🔥 (only if NOAA integration fails)

**Recommendation:** Start with Phases 1-2. Only pursue custom pipeline if competitive pressure demands it AND NOAA integration remains blocked beyond 2026.

---

## 8. Technical Resources

### Learning Resources
- **RTKLIB Manual:** https://www.rtklib.com/prog/manual_2.4.2.pdf
- **IGS Products:** https://igs.org/products/
- **GUARDIAN Paper:** https://link.springer.com/article/10.1007/s10291-022-01365-6

### Open-Source Tools
- **RTKLIB:** https://github.com/tomojitakasu/RTKLIB
- **BNC (BKG NTRIP Client):** https://igs.bkg.bund.de/ntrip/bnc
- **PyRTCM:** https://github.com/semuconsulting/pyrtcm

### Contact Information
- **JPL GUARDIAN:** disaster-info@jpl.nasa.gov (inferred)
- **IGS Registration:** https://register.rtcm-ntrip.org/
- **UNAVCO Support:** https://www.unavco.org/help/

---

**Document Status:** Technical guidance for implementation  
**Last Updated:** November 12, 2025
