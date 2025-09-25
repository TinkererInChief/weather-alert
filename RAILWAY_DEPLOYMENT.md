# 🚂 Railway Production Deployment Guide

## Step 1: Login to Railway

```bash
# Login to Railway
railway login

# Create new project
railway new emergency-alert-system
cd emergency-alert-system
```

## Step 2: Add Database Services

```bash
# Add PostgreSQL database
railway add postgresql

# Add Redis cache
railway add redis

# Link to your local project
railway link
```

## Step 3: Configure Environment Variables

Go to Railway dashboard → Your Project → Variables tab and add:

### Required Variables:
```bash
# Twilio (get from twilio.com console)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# SendGrid (get from sendgrid.com)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
SENDGRID_FROM_NAME=Emergency Alert System

# Alert Configuration
MIN_MAGNITUDE=6.0
MIN_TSUNAMI_SEVERITY=2
ALERT_CHECK_INTERVAL=30000
QUEUE_CONCURRENCY=5

# Production Security
JWT_SECRET=your_secure_random_jwt_secret_here
API_RATE_LIMIT=100
NODE_ENV=production
LOG_LEVEL=info
```

### Auto-Generated (Railway handles these):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `PORT` - Application port

## Step 4: Deploy the Application

```bash
# Deploy to Railway
railway up

# Watch deployment logs
railway logs --follow
```

## Step 5: Run Database Migration

```bash
# Deploy database schema
railway run pnpm db:deploy

# Seed initial data
railway run pnpm db:seed
```

## Step 6: Verify Deployment

1. **Check health endpoint**: `https://your-app.railway.app/api/health`
2. **Test dashboard**: `https://your-app.railway.app`
3. **Verify database**: Use Railway's database browser

## Step 7: Set Up Monitoring

### Railway Built-in:
- Metrics dashboard
- Error tracking  
- Uptime monitoring
- Resource usage

### Custom Monitoring:
```bash
# Add health check monitoring
curl -f https://your-app.railway.app/api/health || exit 1
```

## Scaling Configuration

### For High-Traffic (1000+ alerts/hour):
```bash
# Increase resources in Railway dashboard:
# - Memory: 2GB+
# - CPU: 2 vCPUs
# - Auto-scaling: enabled
```

### Database Optimization:
```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(active);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_earthquake_events_processed ON earthquake_events(processed);
```

## Production Checklist

### ✅ Before Go-Live:
- [ ] All environment variables set
- [ ] Database migrated and seeded
- [ ] Health check returns 200
- [ ] SMS test successful
- [ ] Email test successful  
- [ ] Contact management working
- [ ] Alert monitoring active
- [ ] Backup strategy configured

### ✅ Post-Deployment:
- [ ] Set up domain (yourdomain.com)
- [ ] Configure SSL certificate
- [ ] Set up monitoring alerts
- [ ] Test full alert workflow
- [ ] Document incident response procedures
- [ ] Configure log retention
- [ ] Set up automated backups

## Cost Optimization

### Railway Pricing (as of 2024):
- **Starter Plan**: $5/month (hobby projects)
- **Developer Plan**: $20/month (production apps)
- **Team Plan**: $100/month (scaling teams)

### Database Costs:
- **PostgreSQL**: ~$10-20/month (2GB)
- **Redis**: ~$5-15/month (1GB)

### Total Monthly Cost:
- **MVP**: ~$35-55/month
- **Production**: ~$125-200/month
- **Enterprise**: ~$300-500/month

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   ```bash
   railway logs
   # Check DATABASE_URL is set correctly
   ```

2. **Redis Connection Timeout**
   ```bash
   # Verify REDIS_URL in environment
   railway env
   ```

3. **Build Failures**
   ```bash
   # Clear build cache
   railway redeploy
   ```

4. **Memory Issues**
   ```bash
   # Increase memory limit in Railway dashboard
   # Monitor: railway metrics
   ```

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Emergency Support**: Your production monitoring system

---

## Quick Commands Reference

```bash
# Project management
railway login
railway link
railway status

# Deployment
railway up
railway redeploy

# Environment
railway env
railway env set KEY=value

# Database
railway connect postgresql
railway run pnpm db:deploy

# Monitoring  
railway logs --follow
railway metrics
```
