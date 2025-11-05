# AIS Vessel Service - Complete Guide

## 🎯 Overview

The AIS Vessel Service provides **dual functionality**:
1. **Enrichment** - Enhance existing vessels with static data
2. **Ingestion** - Discover and track new vessels in real-time

## 📊 Current Status

- **Total Vessels:** 23,984
- **Enriched:** 10,515 (44%)
- **Missing IMO:** 13,469
- **Missing Dimensions:** 4,426

## 🚀 Quick Start

### Start the Daemon (Recommended)

```bash
# Global coverage with position tracking
npm run ais:daemon

# Singapore region only
npm run ais:daemon -- --region=singapore

# Enrichment only (no position tracking)
npm run ais:daemon -- --no-pos

# Custom sample rate (record 1 in 20 positions)
npm run ais:daemon -- --sample=20
```

### Run in Background

```bash
# Using npm script (logs to logs/ais-daemon.log)
npm run ais:daemon:bg

# Or manually with nohup
nohup npm run ais:daemon > logs/ais-daemon.log 2>&1 &

# Or with tmux/screen (recommended for production)
tmux new -s ais-daemon
npm run ais:daemon
# Ctrl+B, D to detach
```

## 🔧 Features

### 1. Real-Time Enrichment
- Listens to AIS Message Type 5 (Ship Static Data)
- Automatically enriches vessels with:
  - IMO number
  - Vessel name
  - Callsign
  - Vessel type (70+ types)
  - Dimensions (length, width)
  - Maximum draught
  - Destination
  - ETA

### 2. New Vessel Discovery
- Creates new vessels automatically when detected
- Tracks vessels not in your database
- Expands coverage organically

### 3. Position Tracking (Optional)
- Records vessel positions from AIS Type 1-3, 18-19
- Configurable sample rate (default: 1 in 10)
- Builds position history for tracking
- Updates last seen timestamp

### 4. Automatic Reconnection
- Handles connection drops gracefully
- Auto-reconnects up to 10 times
- 5-second delay between attempts

### 5. Statistics & Monitoring
- Real-time statistics every 60 seconds
- Tracks messages, enrichments, positions
- Error counting and reporting

## 📋 Configuration Options

### Regions

Pre-configured bounding boxes:

```typescript
global          // Worldwide coverage (default)
singapore       // Singapore Strait
north-atlantic  // North Atlantic Ocean
mediterranean   // Mediterranean Sea
indian-ocean    // Indian Ocean
pacific         // Pacific Ocean
```

### Command Line Arguments

```bash
--region=<name>    # Set geographic region
--no-pos           # Disable position tracking
--sample=<n>       # Position sample rate (1 in N)
--help             # Show help
```

## 📊 Statistics Output

Every 60 seconds, you'll see:

```
📊 AIS Vessel Service Statistics:
   Uptime: 15 minutes
   Connected: ✅
   Messages received: 45,234
   Position reports: 38,901
   Static data messages: 6,333
   Vessels created: 234
   Vessels updated: 1,567
   Positions recorded: 3,890
   Errors: 0
   Last message: 2s ago
```

## 🎯 Use Cases

### Use Case 1: Passive 24/7 Enrichment
**Goal:** Continuously enrich vessels without manual intervention

```bash
# Start in tmux
tmux new -s ais-daemon
npm run ais:daemon

# Detach: Ctrl+B, D
# Reattach: tmux attach -t ais-daemon
```

**Expected Results:**
- 1,000-5,000 vessels enriched per day
- 70-80% enrichment after 1 week
- Zero maintenance required

### Use Case 2: Regional Monitoring
**Goal:** Focus on specific geographic area

```bash
# Monitor Singapore Strait
npm run ais:daemon -- --region=singapore

# Monitor Mediterranean
npm run ais:daemon -- --region=mediterranean
```

**Benefits:**
- Reduced message volume
- Faster enrichment for region
- Lower resource usage

### Use Case 3: Enrichment Only
**Goal:** Enrich vessels without position tracking

```bash
npm run ais:daemon -- --no-pos
```

**Benefits:**
- Lower database writes
- Reduced storage usage
- Focus on static data only

### Use Case 4: High-Frequency Tracking
**Goal:** Record more position data

```bash
# Record every 5th position instead of every 10th
npm run ais:daemon -- --sample=5
```

**Trade-offs:**
- More position data
- Higher database writes
- Increased storage usage

## 🔄 Complementary Enrichment

### Marinesia API (On-Demand)

For vessels not covered by AIS broadcasts:

```bash
# Show statistics
npm run enrich stats

# List vessels needing enrichment
npm run enrich list 20

# Batch enrich 100 vessels
npm run enrich enrich 100 10

# Enrich single vessel
npm run enrich single 512005706
```

### Combined Strategy

```bash
# Terminal 1: Run AIS daemon 24/7
npm run ais:daemon

# Terminal 2: Periodic Marinesia enrichment (rate-limited)
npm run enrich enrich 500 10
```

## 📈 Expected Performance

### After 1 Hour
- Messages: 10,000-50,000
- Static data: 500-2,000
- Vessels enriched: 100-500
- Positions recorded: 1,000-5,000

### After 24 Hours
- Messages: 500,000-1,000,000
- Static data: 10,000-30,000
- Vessels enriched: 2,000-5,000
- Positions recorded: 50,000-100,000

### After 1 Week
- Enrichment rate: 70-80%
- Position history: Comprehensive
- New vessels discovered: 1,000-3,000

## 🛠️ Troubleshooting

### Connection Issues

```bash
# Check if API key is set
echo $AISSTREAM_API_KEY

# Verify in .env file
cat .env | grep AISSTREAM

# Test connection
npm run ais:daemon -- --help
```

### High Error Rate

- Check database connection
- Verify Prisma schema is up to date
- Check disk space for position storage
- Review error logs

### No Messages Received

- Verify API key is valid
- Check internet connection
- Try different region
- Restart daemon

### Database Performance

If position recording is slow:

```bash
# Disable position tracking
npm run ais:daemon -- --no-pos

# Or increase sample rate
npm run ais:daemon -- --sample=50
```

## 🔒 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start daemon
pm2 start npm --name "ais-daemon" -- run ais:daemon

# View logs
pm2 logs ais-daemon

# Restart
pm2 restart ais-daemon

# Stop
pm2 stop ais-daemon

# Auto-start on boot
pm2 startup
pm2 save
```

### Using systemd

Create `/etc/systemd/system/ais-daemon.service`:

```ini
[Unit]
Description=AIS Vessel Daemon
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/weather-alert
Environment="NODE_ENV=production"
Environment="AISSTREAM_API_KEY=your-key"
ExecStart=/usr/bin/npm run ais:daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable ais-daemon
sudo systemctl start ais-daemon
sudo systemctl status ais-daemon
```

## 📊 Monitoring

### Check Service Status

```bash
# If using PM2
pm2 status

# If using systemd
sudo systemctl status ais-daemon

# Check logs
tail -f logs/ais-daemon.log
```

### Database Queries

```sql
-- Check enrichment progress
SELECT 
  COUNT(*) as total,
  COUNT(imo) as with_imo,
  COUNT(length) as with_dimensions,
  COUNT(CASE WHEN enrichment_source = 'aisstream' THEN 1 END) as ais_enriched
FROM vessels;

-- Recent enrichments
SELECT mmsi, name, imo, vessel_type, enriched_at
FROM vessels
WHERE enrichment_source = 'aisstream'
ORDER BY enriched_at DESC
LIMIT 20;

-- Position tracking stats
SELECT 
  COUNT(*) as total_positions,
  COUNT(DISTINCT vessel_id) as tracked_vessels,
  MAX(timestamp) as latest_position
FROM vessel_positions;
```

## 🎯 Best Practices

1. **Run 24/7** - Continuous operation maximizes coverage
2. **Use tmux/screen** - Prevents disconnection on SSH logout
3. **Monitor logs** - Check for errors regularly
4. **Adjust sample rate** - Balance storage vs. data granularity
5. **Regional focus** - Start with specific region, expand later
6. **Complement with Marinesia** - Fill gaps in AIS coverage
7. **Regular backups** - Position data can grow large

## 📝 Summary

The AIS Vessel Service provides:
- ✅ **Automatic enrichment** - No manual intervention
- ✅ **New vessel discovery** - Expands database organically
- ✅ **Position tracking** - Real-time location history
- ✅ **Production-ready** - Auto-reconnect, error handling
- ✅ **Flexible configuration** - Regions, sampling, tracking options
- ✅ **Zero cost** - Free AISStream API

**Recommended Setup:**
```bash
# Start in tmux for 24/7 operation
tmux new -s ais-daemon
npm run ais:daemon
# Ctrl+B, D to detach
```

This will continuously enrich your vessel database with zero maintenance required.
