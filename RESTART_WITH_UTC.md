# Fix Real-Time Activity Counters - Restart with UTC Timezone

## Problem
The ingestion service and Next.js server are running with IST timezone, causing a 5.5-hour offset in timestamps. This makes all real-time queries return 0.

## Solution
Restart all services with TZ=UTC environment variable.

## Steps

### 1. Stop the AIS Streaming Service
In the terminal where `pnpm ais:start` is running:
- Press `Ctrl+C` to stop it

Or kill it manually:
```bash
kill 24266 24260 24245 24244
```

### 2. Stop the Next.js Dev Server
In the terminal where `pnpm dev` is running:
- Press `Ctrl+C` to stop it

Or kill it manually:
```bash
kill 23262
```

### 3. Restart Both Services

In terminal 1 (Next.js):
```bash
cd /Users/yash/weather-alert
pnpm dev
```

In terminal 2 (AIS Streaming):
```bash
cd /Users/yash/weather-alert
pnpm ais:start
```

### 4. Verify TZ is Set
After restart, run this to verify:
```bash
TZ=UTC npx tsx scripts/check-recent-with-tz.ts
```

You should see:
- `Node TZ env: UTC`
- `Timezone offset (minutes): 0`
- Recent positions should show age < 1 minute

### 5. Check Dashboard
Refresh http://localhost:3000/dashboard/database

Real-time Activity counters should now show non-zero values within 30 seconds.

## What Changed
- `package.json` scripts now include `TZ=UTC` prefix
- `.env.local` includes `TZ=UTC` as a fallback
- All date operations will now use UTC timezone

## Verification
Run this to check if services are using UTC:
```bash
lsof -ti:3000 | xargs ps -p
ps aux | grep "start-ais" | grep -v grep
```

Then check timezone:
```bash
node -e "console.log('TZ:', process.env.TZ, 'Offset:', new Date().getTimezoneOffset())"
```

Should show: `TZ: UTC Offset: 0`
