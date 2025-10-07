# Maritime Intelligence Testing - Quick Start

## 🚀 One-Click Testing

### Step 1: Open Dashboard
Navigate to `/dashboard` in your browser.

### Step 2: Find Maritime Testing Widget
Scroll down to the **"Maritime Intelligence Testing"** widget (blue ship icon).

### Step 3: Click a Test Location
Choose any location:
- **San Francisco Bay** - M6.5 (Best for testing)
- **Puget Sound** - M6.2
- **Southern California** - M6.8
- **Hawaiian Islands** - M7.0
- **Gulf of Alaska** - M6.5

### Step 4: Auto-Reload
Page automatically reloads in 2 seconds.

### Step 5: View Results
The **Maritime Intelligence Widget** appears at the top showing:

#### ✅ Expected Output (4 Panels)
1. **🌊 Sea State (NOAA NDBC)**
   - Wave Height, Wind Speed, Water Temperature, Pressure
   
2. **🌀 Tidal (NOAA CO-OPS)**
   - Current Level, Tide Trend, Next High Tide
   - Tsunami Amplification Risk Assessment
   
3. **⚡ Aftershocks (USGS)**
   - 24-hour probability, Weekly probability
   - Expected magnitude, Peak risk timing
   
4. **🚁 SAR Resources**
   - Nearest Coast Guard station
   - Distance, ETA, Resource type

---

## 🔍 Troubleshooting

### "Only 2 panels show"
- You're testing with an **inland location** (only Aftershocks + SAR work)
- Use **coastal test locations** from the widget

### "No widget appears"
- Magnitude must be **M6.0+**
- Refresh the page manually
- Check browser console for errors

### "API errors in console"
- NOAA APIs may be rate-limited (normal)
- Some data sources may be temporarily unavailable
- Widget still shows available data

---

## 📊 What Gets Created

Each test creates:
- ✅ Alert log entry with coastal coordinates
- ✅ Test earthquake ID: `test-maritime-{location}-{timestamp}`
- ✅ Simulated contact notifications
- ✅ Source metadata for traceability

---

## 🧹 Cleanup

Test earthquakes are marked with:
- `primarySource: "TEST"`
- `dataSources: ["TEST-MARITIME"]`

To remove test data:
```sql
DELETE FROM alert_logs WHERE primary_source = 'TEST';
```

---

## 💡 Pro Tips

1. **Best Test Location**: Use **San Francisco Bay** - closest to both NOAA buoys and tide stations
2. **Console Logs**: Open browser DevTools to see detailed API responses
3. **Multiple Tests**: You can create multiple test events - they won't conflict
4. **Real Events**: Test widget also appears for real M6.0+ earthquakes automatically

---

## 🎯 Success Criteria

You've successfully tested when you see:
- ✅ Maritime Intelligence Widget appears
- ✅ All 4 environmental panels populate with data
- ✅ Impact Score Breakdown shows Maritime Impact >= 50
- ✅ No console errors (or only non-critical NOAA rate limit warnings)

---

## API Reference

### Create Test Event
```bash
POST /api/test/maritime
{
  "location": "san-francisco"
}
```

### List Available Locations
```bash
GET /api/test/maritime
```

### Response
```json
{
  "success": true,
  "message": "Maritime test earthquake created: San Francisco Bay, California",
  "data": {
    "earthquakeId": "test-maritime-san-francisco-1234567890",
    "magnitude": 6.5,
    "coordinates": { "latitude": 37.81, "longitude": -122.47 },
    "expectedPanels": ["Sea State", "Tidal", "Aftershocks", "SAR"]
  }
}
```
