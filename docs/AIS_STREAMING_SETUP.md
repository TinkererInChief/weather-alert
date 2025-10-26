# AIS Streaming Service Setup

This guide explains how to set up and use the AIS (Automatic Identification System) streaming service to populate your database with real-time vessel positions.

## Overview

The AIS streaming service connects to two data sources:
1. **AISStream.io** - Global coverage via WebSocket streaming
2. **OpenShipData** - European waters via REST API polling

## Prerequisites

1. **AISStream.io API Key** (Required)
   - Sign up at https://aisstream.io/
   - Get your free API key
   - Add to `.env.local`:
     ```
     AISSTREAM_API_KEY=your_api_key_here
     ```

2. **Database Setup**
   - PostgreSQL 17 with TimescaleDB extension
   - Run migrations: `pnpm run db:push`

3. **Redis** (Optional but recommended)
   - For rate limiting and caching
   - Start locally: `brew services start redis`

## Starting the AIS Streaming Service

### Method 1: Using pnpm script (Recommended)

```bash
pnpm run ais:start
```

This will:
- Connect to AISStream.io WebSocket
- Start polling OpenShipData for European waters
- Monitor high-risk seismic/tsunami regions by default
- Log statistics every 5 minutes
- Automatically reconnect on failures

### Method 2: Using the API endpoint

Start the Next.js dev server:
```bash
pnpm run dev
```

Then make a POST request:
```bash
curl -X POST http://localhost:3000/api/vessel-tracking/start
```

Check status:
```bash
curl http://localhost:3000/api/vessel-tracking/start
```

Stop the service:
```bash
curl -X POST http://localhost:3000/api/vessel-tracking/stop
```

## Monitored Regions

By default, the service monitors these high-risk regions:

1. **Pacific Ring of Fire**
   - Japan & Korean Peninsula
   - Southeast Asia (Indonesia & Philippines)
   - US West Coast
   - Chile & Peru Coast
   - Alaska & Aleutian Islands

2. **Mediterranean Seismic Zone**
   - Mediterranean Sea

3. **Caribbean Seismic Zone**
   - Caribbean & Central America

4. **Indian Ocean**
   - Bay of Bengal

5. **North Sea**
   - North Sea & English Channel

## Fleet Management

### Marking Vessels as Fleet

To mark a vessel as part of your fleet, create a `VesselContact` record:

```typescript
await prisma.vesselContact.create({
  data: {
    vesselId: 'vessel_id_here',
    contactId: 'contact_id_here',
    role: 'captain', // or 'crew', 'owner', etc.
    primary: true
  }
})
```

### Viewing Fleet Vessels Only

On the vessels dashboard (`/dashboard/vessels`), check the "Fleet Only" filter to show only vessels with assigned contacts.

## Vessel Filtering

The vessels dashboard supports filtering by:

1. **Fleet Only** - Show only vessels in your fleet (with assigned contacts)
2. **Vessel Type** - cargo, tanker, passenger, fishing, etc.
3. **Owner** - Filter by vessel owner
4. **Operator** - Filter by vessel operator
5. **Flag** - Filter by country flag

All filters can be combined and show vessel counts.

## Performance

- **Vessels tracked**: 26,461+ (from your current database)
- **Position updates**: Real-time via WebSocket
- **Storage**: Time-series data using TimescaleDB
- **Refresh rate**: 30 seconds on dashboard

## Monitoring

The service logs statistics every 5 minutes:
- Total vessels in database
- Total positions stored
- Recent positions (last 15 minutes)
- Service status (AISStream, OpenShipData)
- Error count

## Troubleshooting

### No vessels appearing

1. Check if AISStream API key is set:
   ```bash
   echo $AISSTREAM_API_KEY
   ```

2. Check service status:
   ```bash
   curl http://localhost:3000/api/vessel-tracking/start
   ```

3. Check logs for errors:
   ```bash
   # Look for connection errors or API issues
   ```

### Vessels not in fleet

Make sure vessels have `VesselContact` records:
```sql
SELECT v.name, COUNT(vc.id) as contact_count
FROM vessels v
LEFT JOIN vessel_contacts vc ON v.id = vc.vessel_id
GROUP BY v.id, v.name
HAVING COUNT(vc.id) = 0;
```

### Performance issues

1. Ensure TimescaleDB extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'timescaledb';
   ```

2. Check database indexes:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'vessel_positions';
   ```

3. Consider limiting monitored regions or using bounding box filters

## Additional Filter Suggestions

Beyond the current filters (type, owner, operator, flag), you could add:

1. **Size Range** - Filter by vessel length/tonnage
2. **Speed Range** - Filter by current speed
3. **Destination** - Filter by destination port
4. **Last Seen** - Filter by how recently the vessel was seen
5. **Alert Status** - Filter vessels with active alerts
6. **Navigation Status** - At anchor, underway, moored, etc.
7. **Build Year** - Filter by vessel age
8. **Cargo Type** - For cargo vessels
9. **Distance from Point** - Vessels within X km of a location
10. **Route** - Vessels on specific routes

## API Endpoints

- `POST /api/vessel-tracking/start` - Start AIS streaming
- `POST /api/vessel-tracking/stop` - Stop AIS streaming
- `GET /api/vessel-tracking/start` - Get service status
- `GET /api/vessels?fleetOnly=true` - Get fleet vessels
- `GET /api/vessels/filters` - Get available filter values

## Environment Variables

```bash
# Required
AISSTREAM_API_KEY=your_api_key_here

# Optional
VESSELS_PUBLIC_READ=true  # Allow public access to vessel data
```

## Next Steps

1. Start the AIS streaming service
2. Wait a few minutes for vessels to appear
3. Visit `/dashboard/vessels` to see the map
4. Use filters to find specific vessels
5. Mark vessels as fleet by creating VesselContact records
6. Enable "Fleet Only" filter to see your fleet
