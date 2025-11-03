# 🚀 Deployment Guide - Railway

## Prerequisites

1. ✅ GitHub repository with your code
2. ✅ Railway account (railway.app)
3. ✅ Environment variables ready

---

## Step 1: Prepare Your App

### 1.1 Create `railway.json` (Railway configuration)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.2 Update `package.json` scripts

Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

### 1.3 Create `.railwayignore` (optional)

```
node_modules
.next
.env*
!.env.example
*.log
.git
```

---

## Step 2: Railway Setup

### 2.1 Install Railway CLI

```bash
npm i -g @railway/cli
```

### 2.2 Login

```bash
railway login
```

### 2.3 Create New Project (or link existing)

**Option A: New Project**
```bash
railway init
```

**Option B: Link Existing Database**
Since you already have a Railway database:
```bash
railway link
# Select your existing project
```

---

## Step 3: Configure Environment Variables

### 3.1 In Railway Dashboard

Go to your project → Variables → Add all:

```bash
# Database (already configured)
DATABASE_URL=postgresql://postgres:...@metro.proxy.rlwy.net:54129/railway?sslmode=require

# Next.js
NODE_ENV=production
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_email@domain.com

# External APIs (optional)
NWS_USER_AGENT=YourApp/1.0 (your@email.com)
PTWC_USER_AGENT=YourApp/1.0 (your@email.com)

# Redis (if needed)
REDIS_URL=redis://...

# Feature Flags
ENABLE_TSUNAMI_MONITORING=true
ENABLE_JMA=false

# Monitoring
TSUNAMI_POLL_INTERVAL_MS=300000
TSUNAMI_POLL_TTL_MS=60000
```

### 3.2 Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## Step 4: Deploy

### 4.1 From GitHub (Recommended)

1. Go to Railway Dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Next.js and deploys!

### 4.2 From CLI

```bash
# Push to GitHub first
git add -A
git commit -m "feat: Prepare for Railway deployment"
git push origin main

# Deploy to Railway
railway up
```

---

## Step 5: Database Migration

### 5.1 Run Prisma Migrations

```bash
# Connect to Railway project
railway link

# Run migrations
railway run npx prisma migrate deploy

# Or if using db push
railway run npx prisma db push
```

### 5.2 Apply Performance Indexes

```bash
# Connect to database
railway run -- psql $DATABASE_URL -f prisma/migrations/add_performance_indexes_fixed.sql
```

---

## Step 6: Verify Deployment

### 6.1 Check Logs

```bash
railway logs
```

### 6.2 Test Your App

1. Visit your Railway URL (e.g., `https://your-app.up.railway.app`)
2. Test login/registration
3. Test API endpoints
4. Monitor logs for errors

---

## Step 7: Custom Domain (Optional)

### 7.1 In Railway Dashboard

1. Go to Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `alerts.yourdomain.com`)
4. Add DNS records as instructed

### 7.2 Update Environment

```bash
NEXTAUTH_URL=https://alerts.yourdomain.com
```

---

## Step 8: Set Up Monitoring

### 8.1 Railway Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Deployment history

### 8.2 Add Health Checks (Optional)

Create a monitoring service (UptimeRobot, Cronitor, etc.) to ping:
```
https://your-app.up.railway.app/api/health
```

---

## Troubleshooting

### Build Fails

**Error: "Prisma generate failed"**
```bash
# Solution: Ensure postinstall script exists
"postinstall": "prisma generate"
```

**Error: "Module not found"**
```bash
# Solution: Clear cache and rebuild
railway run npm install
railway up
```

### Database Connection Issues

**Error: "Cannot connect to database"**
```bash
# Check DATABASE_URL is set correctly
railway variables

# Test connection
railway run npx prisma db pull
```

### Slow Performance

**Issue: API timeouts**
1. Check Railway metrics (CPU/Memory)
2. Consider upgrading plan
3. Verify database indexes are applied
4. Check for N+1 queries

### Environment Variables Not Loading

```bash
# Verify variables are set
railway variables

# Restart service
railway restart
```

---

## Cost Estimation

### Railway Pricing (as of 2024)

**Starter Plan** (~$5-10/month)
- 512MB RAM
- 1 vCPU
- Shared resources
- Good for testing

**Developer Plan** (~$15-25/month)
- 2GB RAM
- 2 vCPU
- Better performance
- Recommended for production

**Database**
- Included in plan
- 1GB storage free
- $0.25/GB after that

**Total: ~$20-30/month** for production-ready setup

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `railway.json` created
- [ ] All environment variables set
- [ ] NEXTAUTH_SECRET generated
- [ ] Database connected
- [ ] Prisma migrations applied
- [ ] Performance indexes applied
- [ ] Build successful
- [ ] App accessible via URL
- [ ] Login/auth working
- [ ] API endpoints responding
- [ ] Monitoring set up
- [ ] Custom domain configured (if needed)

---

## Continuous Deployment

### Auto-Deploy from GitHub

1. Railway Dashboard → Settings
2. Enable "Auto-Deploy"
3. Select branch (main/master)
4. Every push triggers deployment ✅

### Rollback

```bash
# View deployments
railway deployments

# Rollback to previous
railway rollback <deployment-id>
```

---

## Alternative: Vercel Deployment

If you prefer Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... add all others

# Production deploy
vercel --prod
```

**Note:** Still use Railway for database + Redis

---

## Performance Optimization for Production

### 1. Enable Production Optimizations

```bash
# .env.production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2. Database Connection Pooling

Already configured in your `lib/prisma.ts` ✅

### 3. Redis Caching

Add Redis to Railway:
```bash
railway add redis
```

Use for session storage and API caching.

### 4. Monitor Performance

```bash
# View Railway metrics
railway metrics

# Check logs
railway logs --tail
```

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Vercel Docs: https://vercel.com/docs

---

## Quick Commands Reference

```bash
# Deploy
railway up

# Logs
railway logs

# Run command
railway run <command>

# Connect to DB
railway run psql $DATABASE_URL

# Restart
railway restart

# Open dashboard
railway open

# Link project
railway link
```

---

**You're ready to deploy!** 🚀

For Railway deployment, just:
1. Push to GitHub
2. Connect Railway to repo
3. Set environment variables
4. Deploy!

Questions? Let me know!
