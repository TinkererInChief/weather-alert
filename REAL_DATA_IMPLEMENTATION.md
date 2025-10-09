# Real Data Implementation Summary

## Overview
All mock/hardcoded data has been **completely removed** and replaced with real API integrations for earthquake impact assessment.

## Changes Made

### 1. **New Services Created**

#### `/lib/services/pager-service.ts`
- **Purpose**: Fetch official earthquake impact data from USGS PAGER
- **Data Source**: https://earthquake.usgs.gov/data/pager/
- **What it provides**:
  - Real population exposure by intensity (MMI levels)
  - Official casualty estimates
  - Real affected city names and populations
  - Professional impact assessments
- **Availability**: Only for significant earthquakes (usually M4.5+) that USGS has processed
- **Cost**: Free (official USGS service)

#### `/lib/services/geonames-service.ts`
- **Purpose**: Fetch real city data as fallback when PAGER unavailable
- **Data Source**: http://api.geonames.org
- **What it provides**:
  - Real city names (not "City A, City B, City C")
  - Actual populations from OpenStreetMap
  - Real coordinates and distances
  - State/province information
- **Availability**: Global coverage, works for any location
- **Cost**: Free tier - 30,000 requests/day
- **Requirement**: Need to register and set `GEONAMES_USERNAME` in `.env.local`

### 2. **Updated API Endpoint**

#### `/app/api/impact/route.ts`
**Strategy (Waterfall Approach)**:
1. **Try USGS PAGER first** (if event ID available)
   - Most accurate
   - Official government data
   - Includes casualty estimates
   
2. **Fallback to GeoNames** (if PAGER unavailable or no event ID)
   - Fetches real cities within impact radius
   - Calculates intensity based on distance/magnitude
   - Conservative estimate using only actual city populations
   
3. **Handle empty states** (remote areas with no cities)
   - Returns friendly message instead of fake data
   - Shows "No populated areas within impact radius"

### 3. **Removed Mock Data**

#### From `/lib/event-calculations.ts`:
- ❌ **Deleted** `estimateAffectedPopulation()` - unrealistic population calculations
- ❌ **Deleted** `generateMockCities()` - hardcoded "City A/B/C" with fake data
- ✅ **Kept** `calculateShakingRadius()` - still needed for radius calculations

#### From `/components/shared/EventHoverCard.tsx`:
- Updated to pass `depth` and `eventId` parameters to API
- Added proper error handling for API failures
- Shows empty state when no data available instead of fake data

#### From `/components/shared/EventDetails.tsx`:
- Added support for empty state message
- Added data source attribution ("Data: USGS PAGER" or "Data: GeoNames")
- Handles cases where cities array is empty

### 4. **Configuration Required**

#### Environment Variables (in `.env.local`):
```bash
# Required for GeoNames API (fallback data source)
GEONAMES_USERNAME="your_username_here"

# Already required (for Mapbox)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your.mapbox.token"
```

#### How to get GeoNames username:
1. Go to http://www.geonames.org/login
2. Create free account
3. Click on your username → Manage Account
4. Enable "Free Web Services"
5. Use your username in `.env.local`

### 5. **Content Security Policy Fixed**

#### In `/next.config.js`:
- Updated CSP to allow Mapbox to load from all required domains
- Changed `connect-src` from specific tile servers to wildcard: `https://*.mapbox.com`
- This fixes the "Map failed to load (auth/CSP)" error

## Data Flow

```
User hovers over earthquake event
         ↓
EventHoverCard fetches from /api/impact
         ↓
API checks: Does event have USGS ID?
         ↓
    YES ─────→ Try USGS PAGER
         │         ↓
         │    Data found? ──YES──→ Return official PAGER data
         │         ↓
         │        NO
         ↓
    Fetch real cities from GeoNames
         ↓
    Calculate intensity for each city
         ↓
    Sum populations by intensity level
         ↓
    Return real city data with conservative estimates
```

## What You'll See Now

### For Significant Earthquakes (M4.5+):
- **Real USGS PAGER data** (if processed)
- Actual population exposure numbers
- Real city names with accurate populations
- Official intensity classifications

### For Small/Recent Earthquakes:
- **Real GeoNames city data**
- Conservative population estimates based only on actual cities
- Real distances to nearby population centers
- Intensity calculated using standard attenuation formulas

### For Remote Ocean Earthquakes:
- **Clean empty state**
- Message: "No populated areas within impact radius"
- No fake data shown

## Testing

### To test with a significant earthquake:
1. Find a recent M5+ earthquake from https://earthquake.usgs.gov/earthquakes/map/
2. Hover over it in your dashboard
3. Should see real city names and populations

### To test GeoNames fallback:
1. Hover over any earthquake (especially M3-5 range)
2. Will use GeoNames if PAGER unavailable
3. Look for attribution: "Data: GeoNames"

### To test empty state:
1. Find a mid-ocean earthquake far from land
2. Should show "No populated areas within impact radius"
3. No fake data displayed

## Known Limitations

1. **PAGER Availability**: Only works for earthquakes USGS has processed (usually takes 30 minutes to several hours after event)
2. **GeoNames Rate Limit**: 30,000 requests/day on free tier (should be sufficient for most use cases)
3. **Conservative Estimates**: GeoNames fallback only counts actual city populations, may underestimate rural population exposure
4. **Demo Account**: If `GEONAMES_USERNAME` not set, uses "demo" account (very limited, not for production)

## Next Steps

### Required for Production:
1. ✅ Register GeoNames account and add `GEONAMES_USERNAME` to `.env.local`
2. ✅ Rebuild and restart dev server: `pnpm run build && pnpm dev`
3. ✅ Verify map loads correctly (CSP fix)
4. ✅ Test with recent earthquakes to see real data

### Optional Enhancements:
- Consider paid GeoNames plan if hitting rate limits (starts at $0.50/1000 requests)
- Add caching layer to reduce API calls for same earthquake
- Integrate WorldPop API for more accurate rural population data
- Add USGS ShakeMap integration for detailed intensity contours

## Conclusion

**All mock data has been eliminated.** The system now shows:
- ✅ Real city names from GeoNames/PAGER
- ✅ Actual population numbers
- ✅ Conservative, realistic impact estimates
- ✅ Proper empty states for remote areas
- ✅ Data source attribution for transparency

No more "Nearby City A" with fake populations or unrealistic billions of affected people!
