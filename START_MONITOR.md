# 🚢 Start Vessel Proximity Monitor

## Quick Start

```bash
# Start the continuous monitor
pnpm monitor:vessels
```

## What It Does

- Checks every 5 minutes (configurable)
- Monitors all active vessels with recent positions
- Detects earthquakes and tsunamis in last 24 hours
- Calculates distances and severity
- Creates alerts automatically
- Sends SMS + Email to assigned contacts
- Logs all activity to console

## Example Output

```
═══════════════════════════════════════════════════════
🚢 VESSEL PROXIMITY MONITOR
═══════════════════════════════════════════════════════
Check interval: 300s
Starting monitoring...

────────────────────────────────────────────────────────
[Check #1] 2025-10-30T06:45:00.000Z
────────────────────────────────────────────────────────
[Events] Found 2 active events
[Vessels] Found 15 vessels with recent positions
[Alert] MV CARMEN is 85km from earthquake (critical)
[Alert] ✓ Created alert xyz123 for MV CARMEN
[Alert] ✓ Notified 3 contacts

[Summary] Check complete in 1234ms
[Summary] Alerts created: 1
```

## Danger Zone Configuration

### Earthquake:
- 🔴 Critical: < 100 km
- 🟠 High: < 300 km
- 🟡 Moderate: < 500 km
- 🟢 Low: < 1000 km

### Tsunami:
- 🔴 Critical: < 50 km
- 🟠 High: < 200 km
- 🟡 Moderate: < 500 km
- 🟢 Low: < 1000 km

## Configuration

Edit `/scripts/monitor-vessel-proximity.ts`:

```typescript
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const DANGER_ZONE_RADII = {
  earthquake: {
    critical: 100,  // km
    high: 300,
    moderate: 500,
    low: 1000
  },
  // ...
}
```

## Stop Monitor

Press `Ctrl+C` for graceful shutdown

## Logs

All activity logged to console with timestamps:
- Event detection
- Vessel proximity checks
- Alert creation
- SMS/Email delivery status
- Error handling

## Troubleshooting

### No vessels found
- Check that vessels have positions in last hour
- Run: `psql ... -c "SELECT COUNT(*) FROM vessel_positions WHERE timestamp > NOW() - INTERVAL '1 hour'"`

### No events found
- Check for recent earthquakes/tsunamis
- Run: `psql ... -c "SELECT COUNT(*) FROM earthquake_events WHERE createdAt > NOW() - INTERVAL '24 hours'"`

### SMS/Email not sending
- Verify Twilio credentials in `.env.local`
- Verify SendGrid API key
- Check delivery logs in database

## Next Steps

1. **Start monitor**: `pnpm monitor:vessels`
2. **Watch logs**: See alerts being created in real-time
3. **Check dashboard**: View alerts at `/dashboard/vessels`
4. **Test ACK**: Click link in SMS/Email to acknowledge

## Production Deployment

```bash
# Use PM2 or similar process manager
pm2 start "pnpm monitor:vessels" --name vessel-monitor

# Or run in Docker
docker-compose up vessel-monitor
```
