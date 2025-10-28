# PM2 Service Management Guide

## Overview

PM2 is used to manage all background services for the Emergency Alert System. This ensures:
- Automatic restart on crashes
- Log management
- Memory limits
- Easy start/stop/restart of all services

## Installation

```bash
# Install PM2 globally
npm install -g pm2

# Or use pnpm
pnpm add -g pm2
```

## Service Configuration

All services are configured in `ecosystem.config.js`:

### Services
1. **nextjs** - Next.js web application (port 3000)
2. **ais-streaming** - AIS vessel data ingestion
3. **stats-updater** - Realtime statistics background job

## Common Commands

### Start All Services
```bash
pm2 start ecosystem.config.js
```

### Start Specific Service
```bash
pm2 start ecosystem.config.js --only nextjs
pm2 start ecosystem.config.js --only ais-streaming
pm2 start ecosystem.config.js --only stats-updater
```

### Stop All Services
```bash
pm2 stop all
```

### Stop Specific Service
```bash
pm2 stop nextjs
pm2 stop ais-streaming
pm2 stop stats-updater
```

### Restart All Services
```bash
pm2 restart all
```

### Restart Specific Service
```bash
pm2 restart nextjs
pm2 restart ais-streaming
pm2 restart stats-updater
```

### View Status
```bash
pm2 status
pm2 ls
```

### View Logs
```bash
# All logs
pm2 logs

# Specific service logs
pm2 logs nextjs
pm2 logs ais-streaming
pm2 logs stats-updater

# Last 100 lines
pm2 logs --lines 100

# Follow logs (tail -f)
pm2 logs --raw
```

### View Monitoring Dashboard
```bash
pm2 monit
```

### Delete All Processes
```bash
pm2 delete all
```

## Auto-Start on System Reboot

### Generate Startup Script
```bash
# Generate startup script for your system
pm2 startup

# Follow the instructions it provides (usually requires sudo)
```

### Save Current Process List
```bash
# After starting all services, save the list
pm2 save
```

### Test Auto-Start
```bash
# Reboot and check if services started
pm2 ls
```

## Log Management

Logs are stored in `./logs/` directory:
- `nextjs-out.log` - Next.js stdout
- `nextjs-error.log` - Next.js stderr
- `ais-out.log` - AIS streaming stdout
- `ais-error.log` - AIS streaming stderr
- `stats-out.log` - Stats updater stdout
- `stats-error.log` - Stats updater stderr

### Rotate Logs
```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Memory Management

Each service has a memory limit:
- Next.js: 1GB
- AIS Streaming: 512MB
- Stats Updater: 256MB

If a service exceeds its limit, PM2 will automatically restart it.

## Monitoring & Alerts

### View Metrics
```bash
# Real-time metrics
pm2 monit

# JSON metrics
pm2 jlist

# Pretty formatted
pm2 prettylist
```

### Programmatic Monitoring
```javascript
const pm2 = require('pm2')

pm2.connect((err) => {
  if (err) throw err

  pm2.list((err, processes) => {
    if (err) throw err
    
    processes.forEach((proc) => {
      console.log(`${proc.name}: ${proc.pm2_env.status}`)
      console.log(`  Memory: ${(proc.monit.memory / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  CPU: ${proc.monit.cpu}%`)
      console.log(`  Restarts: ${proc.pm2_env.restart_time}`)
    })

    pm2.disconnect()
  })
})
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
pm2 logs servicename --lines 50

# Check if port is already in use
lsof -i :3000

# Restart with fresh state
pm2 delete servicename
pm2 start ecosystem.config.js --only servicename
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# If needed, restart service
pm2 restart servicename

# Or reload (zero-downtime for Next.js)
pm2 reload nextjs
```

### Service Keeps Restarting
```bash
# Check error logs
pm2 logs servicename --err --lines 100

# Check if dependencies are installed
cd /Users/yash/weather-alert
pnpm install

# Check environment variables
pm2 env 0  # Replace 0 with process id from pm2 ls
```

## Production Best Practices

### 1. Use Clustering for Next.js
```javascript
// In ecosystem.config.js
{
  name: 'nextjs',
  instances: 'max',  // Or specific number like 4
  exec_mode: 'cluster'
}
```

### 2. Set Up Health Checks
```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:3000/api/health/stats || pm2 restart stats-updater
```

### 3. Monitor Disk Space
```bash
# Add to crontab to clean old logs
0 0 * * * find /Users/yash/weather-alert/logs -name "*.log" -mtime +30 -delete
```

### 4. Regular Backups
```bash
# Backup PM2 configuration
pm2 save

# Backup log rotation config
pm2 set pm2-logrotate:max_size 10M
```

## Integration with systemd (Linux)

For production Linux servers:

```bash
# Generate systemd service
pm2 startup systemd

# Follow instructions, then save
pm2 save

# Enable service
sudo systemctl enable pm2-yourusername
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Start all services |
| `pm2 stop all` | Stop all services |
| `pm2 restart all` | Restart all services |
| `pm2 logs` | View all logs |
| `pm2 monit` | Monitoring dashboard |
| `pm2 ls` | List all processes |
| `pm2 delete all` | Delete all processes |
| `pm2 save` | Save process list |
| `pm2 resurrect` | Restore saved process list |
| `pm2 startup` | Generate startup script |

## Health Check Integration

Services can be monitored via health endpoints:

```bash
# Check overall health
curl http://localhost:3000/api/health?detailed=true

# Check stats updater specifically
curl http://localhost:3000/api/health/stats

# Use in monitoring scripts
if ! curl -f http://localhost:3000/api/health/stats; then
  pm2 restart stats-updater
  echo "Stats updater restarted at $(date)" >> logs/auto-restart.log
fi
```

## Next Steps

1. Install PM2: `pnpm add -g pm2`
2. Start services: `pm2 start ecosystem.config.js`
3. Check status: `pm2 ls`
4. View logs: `pm2 logs`
5. Set up auto-start: `pm2 startup && pm2 save`
6. Set up log rotation: `pm2 install pm2-logrotate`
