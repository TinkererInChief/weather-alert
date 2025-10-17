# Vessel Data Ingestion - Background Worker

## The Problem You Identified

You're absolutely right! We're talking about **thousands of ships** broadcasting positions every few seconds. We need a **persistent background process** to continuously ingest this data.

## Solution: Standalone Worker Process

I've created a dedicated worker that runs **independently** from your Next.js app.

---

## Quick Start

### 1. **Start the Worker** (Run this in a separate terminal)

```bash
pnpm worker:vessels
```

You should see:

```
╔══════════════════════════════════════╗
║   Vessel Ingestion Worker v1.0      ║
║   Emergency Alert System             ║
╚══════════════════════════════════════╝

✅ Environment variables validated
📦 Database: localhost:5432
🔑 AISStream API Key: abc123def4...

🚀 Starting vessel ingestion worker...
📡 Starting OpenShipData polling for 2 European regions
✅ Connected to AISStream.io WebSocket
📡 Subscribed to 9 bounding boxes

📊 Coverage Summary:
─────────────────────────────────────────────────
Japan & Korean Peninsula: AISStream (Priority: high)
Mediterranean Sea: AISStream + OpenShipData (Priority: high)
...

🚢 AISStream: Received position for vessel 367719770
🚢 AISStream: Received position for vessel 219024044
🚢 OpenShipData: Updated 15 vessels (0 errors)
```

### 2. **In Another Terminal, Start Your Web App**

```bash
pnpm dev
```

### 3. **Visit the Test Page**

Go to: `http://localhost:3000/test-vessels`

Click **"Refresh"** to see vessels on the map.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Your Next.js App                    │
│              (http://localhost:3000)                 │
│                                                      │
│  ┌────────────────┐                                 │
│  │  /test-vessels │  ← View ships on map            │
│  │  /dashboard    │                                 │
│  └────────────────┘                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Reads from database
                 ↓
        ┌────────────────┐
        │   PostgreSQL    │
        │    Database     │
        └────────────────┘
                 ↑
                 │ Writes positions continuously
                 │
┌────────────────┴────────────────────────────────────┐
│          Vessel Ingestion Worker                     │
│       (pnpm worker:vessels)                          │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────┐    │
│  │  AISStream.io    │    │  OpenShipData      │    │
│  │  (WebSocket)     │    │  (REST API)        │    │
│  │  Global coverage │    │  Europe only       │    │
│  │  Real-time       │    │  Polls 60s         │    │
│  └──────────────────┘    └────────────────────┘    │
│                                                      │
│  Receives: 1-10 messages/second                     │
│  Processes: ~1,000-5,000 vessels/hour               │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Worker receives AIS data** (WebSocket stream + REST polling)
2. **Upserts vessels** to database (creates if new, updates if exists)
3. **Creates position records** for each update
4. **Your web app reads** from database to display on map
5. **Rinse and repeat** - 24/7 continuous ingestion

---

## Performance Stats

After running for 1 hour, you'll see:

```
📊 === Vessel Ingestion Statistics ===
⏱️  Uptime: 1h 0m
🚢 Vessels in DB: 1,247
📍 Positions in DB: 8,932
📡 Recent positions (15m): 523
❌ Errors: 0
🔄 Services:
   - AISStream: active
   - OpenShipData: active
=====================================
```

### Expected Volume

| Time | Vessels | Positions | Database Size |
|------|---------|-----------|---------------|
| **1 hour** | 1,000-2,000 | 5,000-10,000 | ~5 MB |
| **24 hours** | 5,000-10,000 | 50,000-100,000 | ~50 MB |
| **1 week** | 10,000-15,000 | 300,000-500,000 | ~250 MB |
| **1 month** | 15,000-25,000 | 1M-2M | ~1 GB |

**Note:** Old positions can be archived/deleted to manage size (keep last 7 days).

---

## Running in Production

### Option 1: Railway - Separate Service (Recommended)

Create a **second Railway service** just for the worker:

1. **Create new service** in Railway dashboard
2. **Option A: Add to Railway startup**

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

5. **Deploy**

Now you have:
- Service 1: Next.js web app
- Service 2: Vessel worker (background process)
- Both share the same database

**Cost:** Railway free tier covers both (you're just running 2 processes)

### Option 2: Single Service with Procfile

Create `Procfile`:
```
web: pnpm start
worker: pnpm worker:vessels
```

Railway will run both processes in one service.

### Option 3: Docker Compose

```yaml
version: '3.8'
services:
  web:
    build: .
    command: pnpm start
    environment:
      - DATABASE_URL=${DATABASE_URL}
  
  worker:
    build: .
    command: pnpm worker:vessels
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AISSTREAM_API_KEY=${AISSTREAM_API_KEY}
```

---

## Monitoring

### View Logs

**Local:**
```bash
pnpm worker:vessels

# You'll see live logs in terminal
```

**Railway:**
- Go to worker service → Deployments → Logs
- You'll see stats every 5 minutes

### Health Check

```bash
# Check if vessels are being updated
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(timestamp) FROM \"VesselPosition\";"

# Should show increasing count and recent timestamp
```

### Restart Worker

**If it crashes or needs restart:**

**Local:**
- Ctrl+C to stop
- `pnpm worker:vessels` to restart

**Railway:**
- Redeploy service

**Auto-restart:** The worker handles errors gracefully and won't crash on network issues.

---

## Troubleshooting

### No vessels appearing

**Check 1:** Is worker running?
```bash
# Should show the worker process
ps aux | grep vessel-worker
```

**Check 2:** Check logs for errors
```bash
# Look for:
❌ WebSocket error
❌ Failed to connect
```

**Check 3:** Database connection
```bash
# Test connection
npx prisma db push
```

### Worker stops after a while

**Solution:** Run with process manager

**PM2 (local/VPS):**
```bash
npm install -g pm2
pm2 start npm --name "vessel-worker" -- run worker:vessels
pm2 logs vessel-worker
```

**systemd (Linux server):**
```ini
[Unit]
Description=Vessel Ingestion Worker

[Service]
ExecStart=/usr/bin/pnpm worker:vessels
WorkingDirectory=/path/to/app
Restart=always

[Install]
WantedBy=multi-user.target
```

### High database size

**Archive old positions:**

Create `/scripts/archive-old-positions.ts`:
```typescript
import { prisma } from '@/lib/prisma'

// Delete positions older than 7 days
const result = await prisma.vesselPosition.deleteMany({
  where: {
    timestamp: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  }
})

console.log(`Deleted ${result.count} old positions`)
```

Run weekly via cron.

---

## Summary

✅ **Created:**
- `lib/workers/vessel-ingestion-worker.ts` - Main worker class
- `scripts/start-vessel-worker.ts` - Standalone script
- `pnpm worker:vessels` - Run command

✅ **What it does:**
- Connects to AISStream.io WebSocket (global)
- Polls OpenShipData REST API (Europe)
- Continuously ingests vessel positions
- Writes to database 24/7
- Reports stats every 5 minutes
- Handles errors gracefully

✅ **Next steps:**
1. Open terminal: `pnpm worker:vessels`
2. Wait 2 minutes
3. Open browser: `http://localhost:3000/test-vessels`
4. See ships! 🚢

The worker runs **independently** - you can restart your Next.js app without stopping vessel ingestion.
