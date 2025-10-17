# Vessel Tracking Setup Guide

## ✅ Prerequisites Complete

You've already done:
- ✅ Added `AISSTREAM_API_KEY` to `.env`, `.env.local`, and Railway

## ⚠️ IMPORTANT: You Need a Background Worker!

Vessel tracking involves **thousands of ships** broadcasting positions every few seconds. This requires a **persistent background process** to continuously ingest data.

**See:** `README_VESSEL_WORKER.md` for complete worker documentation.

---

## Quick Start (Development)

### Step 1: Start the Background Worker

**Terminal 1:**
```bash
pnpm worker:vessels
```

This runs **continuously** and ingests vessel data 24/7.

### Step 2: Start Your Web App

**Terminal 2:**
```bash
pnpm dev
```

### Step 3: View Ships

Go to: `http://localhost:3000/test-vessels`

**Wait 1-2 minutes** for data, then click "Refresh"

---

## Alternative: API-Based Approach (NOT Recommended for Production)

If you can't run a separate worker, you have these options:

#### **Option A: API Route (Recommended for Testing)**

**Start tracking via HTTP request:**

```bash
# From your terminal or use a tool like Postman/Insomnia
curl -X POST http://localhost:3000/api/vessel-tracking/start

# Or visit in browser (we'll create a UI button below)
```

**Response:**
```json
{
  "success": true,
  "message": "Vessel tracking started successfully",
  "status": {
    "isRunning": true,
    "services": {
      "aisstream": {
        "name": "AISStream.io",
        "coverage": "Global",
        "method": "WebSocket streaming",
        "status": "active"
      },
      "openshipdata": {
        "name": "OpenShipData",
        "coverage": "Europe/Mediterranean",
        "method": "REST API polling",
        "status": "active"
      }
    }
  }
}
```

#### **Option B: Server Startup (Recommended for Production)**

Create `/app/api/cron/start-vessel-tracking/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { VesselTrackingCoordinator } from '@/lib/services/vessel-tracking-coordinator'

export const dynamic = 'force-dynamic'

// Called on server startup or via cron
export async function GET() {
  try {
    const coordinator = VesselTrackingCoordinator.getInstance()
    
    if (!coordinator.getStatus().isRunning) {
      await coordinator.start()
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in vessel tracking cron:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
```

Then in Railway, add a cron job or webhook that calls this endpoint on startup.

#### **Option C: Direct Code (For Development)**

Create `/lib/startup/vessel-tracking.ts`:

```typescript
import { VesselTrackingCoordinator } from '@/lib/services/vessel-tracking-coordinator'

let isStarted = false

export async function startVesselTracking() {
  if (isStarted) return
  
  try {
    const coordinator = VesselTrackingCoordinator.getInstance()
    await coordinator.start()
    isStarted = true
    console.log('✅ Vessel tracking started')
  } catch (error) {
    console.error('❌ Failed to start vessel tracking:', error)
  }
}
```

Then import and call in your root layout or app initialization.

---

### Step 2: Verify Services are Running

**Check the console logs** - you should see:

```
🚀 Starting vessel tracking services...
📍 Monitoring 9 regions
✅ Connected to AISStream.io WebSocket
📡 Subscribed to 9 bounding boxes
📡 Starting OpenShipData polling for 2 European regions
ℹ️ OpenShipData: Europe detected, starting polling

📊 Coverage Summary:
─────────────────────────────────────────────────
Japan & Korean Peninsula:
  Sources: AISStream
  Priority: high
Southeast Asia:
  Sources: AISStream
  Priority: high
Mediterranean Sea:
  Sources: AISStream + OpenShipData
  Priority: high
North Sea & English Channel:
  Sources: AISStream + OpenShipData
  Priority: medium
...
```

**Within 1-2 minutes**, you should start seeing:

```
🚢 AISStream: Received position for vessel 367719770 (EVER GIVEN)
🚢 AISStream: Received position for vessel 219024044
🚢 OpenShipData: Updated 15 vessels
...
```

---

### Step 3: Check Database for Vessels

Run this query to verify vessels are being saved:

```sql
-- Check vessel count
SELECT COUNT(*) FROM "Vessel";

-- Check recent positions
SELECT 
  v.mmsi,
  v.name,
  v."vesselType",
  p.latitude,
  p.longitude,
  p."dataSource",
  p.timestamp
FROM "Vessel" v
JOIN "VesselPosition" p ON p."vesselId" = v.id
WHERE p.timestamp > NOW() - INTERVAL '15 minutes'
ORDER BY p.timestamp DESC
LIMIT 20;
```

**Expected result:** You should see vessels with positions from the last 15 minutes.

**If no vessels:**
- Wait 2-3 minutes (services need time to receive data)
- Check console for errors
- Verify `AISSTREAM_API_KEY` is correct
- Restart your dev server

---

### Step 4: View Vessels on Map

**Option 1: Use Existing Dashboard**

1. Navigate to: `http://localhost:3000/dashboard/vessels`
2. The page should already have the `VesselMap` component
3. It will automatically fetch and display vessels

**Option 2: Create a Simple Test Page**

Create `/app/test-vessels/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Import VesselMap dynamically to avoid SSR issues with Leaflet
const VesselMap = dynamic(() => import('@/components/vessels/VesselMap'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">Loading map...</div>
})

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  heading: number | null
  destination: string | null
  activeAlertCount: number
}

export default function TestVesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startTracking = async () => {
    try {
      const response = await fetch('/api/vessel-tracking/start', {
        method: 'POST'
      })
      const data = await response.json()
      console.log('Tracking started:', data)
      alert('Vessel tracking started! Wait 1-2 minutes for data.')
    } catch (err) {
      console.error('Error starting tracking:', err)
      alert('Error starting tracking. Check console.')
    }
  }

  const fetchVessels = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/vessel-tracking/vessels?limit=100')
      const data = await response.json()
      
      if (data.success) {
        setVessels(data.vessels)
        console.log(`Loaded ${data.count} vessels`)
      } else {
        setError(data.error || 'Failed to fetch vessels')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVessels()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVessels, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vessel Tracking Test</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? 'Loading...' : `${vessels.length} vessels tracked`}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={startTracking}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start Tracking
            </button>
            
            <button
              onClick={fetchVessels}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="m-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 rounded">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      )}
      
      <div className="h-[calc(100vh-100px)]">
        {vessels.length > 0 ? (
          <VesselMap vessels={vessels} alerts={[]} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {loading ? 'Loading vessels...' : 'No vessels found'}
              </p>
              {!loading && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Click "Start Tracking" and wait 1-2 minutes for data to appear
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

3. Visit: `http://localhost:3000/test-vessels`
4. Click "Start Tracking"
5. Wait 1-2 minutes
6. Click "Refresh" to see vessels appear on map

---

### Step 5: Monitor Real-Time Updates

**Watch the Console:**

```bash
# In your terminal running the dev server
pnpm dev

# You should see periodic updates:
🚢 AISStream: Received position for vessel 367719770
🚢 OpenShipData: Updated 15 vessels (0 errors)
🚢 AISStream: Received position for vessel 219024044
```

**Check Database Growth:**

```sql
-- Run this every minute
SELECT 
  COUNT(*) as total_vessels,
  COUNT(DISTINCT "dataSource") as sources,
  MAX(timestamp) as latest_position
FROM "VesselPosition";
```

You should see:
- `total_vessels` increasing over time
- `sources` showing 2 (aisstream + openshipdata)
- `latest_position` updating to current time

---

## Troubleshooting

### Problem: No vessels appearing

**Check 1: Is tracking started?**
```bash
curl http://localhost:3000/api/vessel-tracking/start
```

**Check 2: Is API key valid?**
```bash
# In .env or .env.local
echo $AISSTREAM_API_KEY

# Should be a long string like: abc123def456...
```

**Check 3: Check console for errors**
```bash
# Look for errors like:
❌ WebSocket error: Invalid API key
❌ Failed to connect to AISStream
```

**Check 4: Database connection**
```bash
# Make sure Prisma is connected
npx prisma db push
npx prisma generate
```

### Problem: Map not loading

**Fix: Ensure dynamic import**
```typescript
// Import VesselMap with { ssr: false }
const VesselMap = dynamic(() => import('@/components/vessels/VesselMap'), {
  ssr: false
})
```

**Fix: Check Leaflet CSS**
```typescript
// Make sure this is in your component:
import 'leaflet/dist/leaflet.css'
```

### Problem: Services starting but no data

**Wait longer:** AISStream can take 2-5 minutes to receive first messages

**Check regions:** Default regions are high-traffic areas, but data may be sparse in some zones

**Verify bounding boxes:** Check that your regions overlap with active shipping lanes

---

## Production Deployment (Railway)

### 1. Environment Variables

Already done ✅ - You added `AISSTREAM_API_KEY` to Railway

### 2. Auto-Start on Deploy

**Option A: Add to Railway startup**

In Railway settings, set start command:
```bash
# Add a post-deploy script
pnpm start:vessel-tracking
```

Create `package.json` script:
```json
{
  "scripts": {
    "start:vessel-tracking": "curl -X POST https://your-domain.com/api/vessel-tracking/start"
  }
}
```

**Option B: Use Railway Cron**

Create a Railway cron job that calls:
```
POST https://your-domain.com/api/vessel-tracking/start
```

Schedule: `@reboot` (runs once on deployment)

### 3. Monitor in Production

Add logging:
```typescript
// In vessel-tracking-coordinator.ts
console.log(`[${new Date().toISOString()}] Vessel tracking status:`, status)
```

View logs in Railway dashboard.

---

## Expected Results

**After 2 minutes:**
- ✅ 10-50 vessels in database (depending on time of day)
- ✅ Vessels appearing on map with ship icons
- ✅ Console showing position updates

**After 10 minutes:**
- ✅ 100-500 vessels tracked
- ✅ Multiple regions with coverage
- ✅ Both AISStream and OpenShipData contributing data

**After 1 hour:**
- ✅ 1,000-3,000 vessels
- ✅ Global coverage visible
- ✅ European regions showing enhanced density (AISStream + OpenShipData)

---

## Quick Start Checklist

- [ ] API key in `.env.local`: `AISSTREAM_API_KEY=your_key`
- [ ] Start dev server: `pnpm dev`
- [ ] Start tracking: `POST /api/vessel-tracking/start`
- [ ] Wait 2 minutes
- [ ] Check database: `SELECT COUNT(*) FROM "Vessel"`
- [ ] Visit test page: `/test-vessels`
- [ ] See ships on map! 🚢

---

## Next Steps

Once vessels are displaying:

1. **Integrate with earthquake alerts** - Auto-alert vessels near earthquakes
2. **Add real-time updates** - WebSocket or polling for live map updates
3. **Vessel details** - Click ship to see info (MMSI, destination, speed)
4. **Alert management** - Show vessels with active tsunami/earthquake alerts
5. **Analytics dashboard** - Track coverage metrics, data sources

See `lib/services/vessel-tracking-example.ts` for more advanced usage patterns.
