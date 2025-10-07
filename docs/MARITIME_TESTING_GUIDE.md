# Maritime Intelligence Testing Guide

## Testing Environmental Data (All 4 Panels)

The **Real-Time Environmental Conditions** panel shows 4 data sources:
1. 🌊 **Sea State** (NOAA NDBC buoys)
2. 🌀 **Tidal** (NOAA CO-OPS tide stations)
3. ⚡ **Aftershocks** (USGS calculations)
4. 🚁 **SAR Resources** (Emergency response database)

### Why Some Panels Don't Show

- **Sea State** requires ocean buoys within **500km**
- **Tidal** requires tide stations within **500km**
- **Aftershocks** works anywhere (math-based)
- **SAR** works anywhere (local database)

**Inland earthquakes** (like Yukon Territory, Colorado, etc.) will only show **Aftershocks + SAR**.

---

## Test Locations for All 4 Panels

### 1. **San Francisco Bay Area** (Best Test)
```
Magnitude: 6.5
Location: San Francisco Bay, California
Latitude: 37.81
Longitude: -122.47
```
✅ Sea State: Buoy 46026 (nearby)  
✅ Tidal: San Francisco tide station  
✅ Aftershocks: Calculated  
✅ SAR: US Coast Guard District 11  

### 2. **Seattle / Puget Sound**
```
Magnitude: 6.2
Location: Puget Sound, Washington
Latitude: 47.60
Longitude: -122.34
```
✅ All 4 panels available

### 3. **Southern California Coast**
```
Magnitude: 6.8
Location: Southern California Coast
Latitude: 34.27
Longitude: -120.47
```
✅ All 4 panels available

### 4. **Hawaii**
```
Magnitude: 7.0
Location: Hawaiian Islands
Latitude: 21.31
Longitude: -157.87
```
✅ All 4 panels available

### 5. **Alaska Coast**
```
Magnitude: 6.5
Location: Gulf of Alaska
Latitude: 56.30
Longitude: -148.07
```
✅ All 4 panels available

---

## How to Trigger the Widget

The **Maritime Intelligence Widget** appears automatically for:
- Earthquakes with **M6.0+**
- Any tsunami warning

### Easy Testing with UI (Recommended)

1. **Go to Dashboard** (`/dashboard`)
2. **Scroll to "Maritime Intelligence Testing" widget** (near bottom)
3. **Click any test location** (e.g., "San Francisco Bay")
4. **Page auto-reloads** in 2 seconds with test data
5. **Maritime Intelligence Widget appears** with all 4 environmental panels

### Manual API Testing

1. **Using cURL**:
   ```bash
   curl -X POST http://localhost:3000/api/test/maritime \
     -H "Content-Type: application/json" \
     -d '{"location": "san-francisco"}'
   ```

2. **Available locations**: `san-francisco`, `seattle`, `socal`, `hawaii`, `alaska`

3. **Check Browser Console**:
   ```
   [Environmental API] Data availability: {
     location: "37.81, -122.47",
     seaState: "Available (Santa Maria)",
     tidal: "Available (San Francisco)",
     aftershock: "Available",
     sar: "Available (US Coast Guard District 11)"
   }
   ```

---

## Expected Data Examples

### Sea State Panel (NOAA NDBC)
```
Wave Height: 2.3m
Wind Speed: 12.5 m/s
Water Temp: 18.2°C
Pressure: 1013 mb
Distance: 45km from event
```

### Tidal Panel (NOAA CO-OPS)
```
Current: ↗️ Rising
Level: 1.8m
Next High: 3:45 PM (2.4m)
Tsunami Risk: MEDIUM ⚠️
Potential combined height: 4.2m
```

### Aftershocks Panel (USGS)
```
Next 24h: 85% M5.0+
Next 7 days: 95%
Peak Risk: 6-12 hours from event
```

### SAR Panel
```
Nearest Resource: US Coast Guard District 11 - San Francisco
Distance: 12km
ETA: 15 min
Type: Coast Guard
```

---

## Troubleshooting

### "Only seeing 2 panels"
- ✅ Check if earthquake is **coastal** (not inland)
- ✅ Verify magnitude is **M6.0+**
- ✅ Check browser console for API errors
- ✅ NOAA APIs may be rate-limited or down

### "No environmental data at all"
- Check network tab for `/api/maritime/environmental` call
- Verify NOAA services are operational
- Try a different coastal location

### "Widget doesn't appear"
- Magnitude must be ≥ 6.0
- Check `MaritimeImpactScore.shouldAutoFetch` calculation
- Verify `recentAlerts` contains M6.0+ events

---

## API Endpoint Testing

### Direct API Call
```bash
curl -X POST http://localhost:3000/api/maritime/environmental \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.81,
    "longitude": -122.47,
    "magnitude": 6.5,
    "tsunamiWarning": false
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "seaState": { "buoyName": "Santa Maria", "waveHeight": 2.3, ... },
    "tidal": { "stationName": "San Francisco", "currentLevel": 1.8, ... },
    "aftershock": { "probability24h": 85, ... },
    "sar": { "nearestResource": "US Coast Guard...", ... }
  }
}
```
