# GeoNames API Setup Guide

## Why You Need This

The **demo account is rate-limited to 20,000 requests per day** (shared globally by all demo users). This limit is often exceeded, causing the earthquake impact data to fail.

You **must** create your own free GeoNames account to use real city data.

## Setup Steps (5 minutes)

### 1. Create Account
1. Go to http://www.geonames.org/login
2. Click **"Create a new user account"**
3. Fill in:
   - Username (you'll use this in .env)
   - Email
   - Password
4. Click **"Send confirmation mail"**

### 2. Verify Email
1. Check your email inbox
2. Click the verification link
3. Log in to your new account

### 3. Enable Web Services
**⚠️ IMPORTANT: This step is required!**
1. After logging in, go to http://www.geonames.org/manageaccount
2. Scroll down to **"Free Web Services"**
3. Click **"Click here to enable"**
4. Confirm activation

### 4. Add to Environment Variables

#### For Local Development (.env.local):
```bash
GEONAMES_USERNAME="your_username_here"
```

#### For Railway (Production):
1. Go to Railway dashboard: https://railway.app/dashboard
2. Select your project
3. Click on your service
4. Go to **Variables** tab
5. Click **"New Variable"**
6. Add:
   - **Variable**: `GEONAMES_USERNAME`
   - **Value**: `your_username_here`
7. Click **"Add"**
8. Railway will automatically redeploy

### 5. Restart Application

#### Local:
```bash
pnpm dev
```

#### Production (Railway):
Will restart automatically after adding the environment variable.

## Verification

After setup, check your logs for:

✅ **Success**: No warning about demo account
```
🔍 Fetching real city data from GeoNames
✅ Real impact data calculated: 3 cities affected
```

❌ **Still using demo** (if you see this, check step 3):
```
⚠️ CRITICAL: Using demo GeoNames account (rate limited)
```

## Free Tier Limits

- **30,000 requests per day** (your account only)
- **1,000 requests per hour**
- More than enough for typical usage

## Troubleshooting

### "Account not enabled for web services"
- You forgot **Step 3**
- Go to http://www.geonames.org/manageaccount
- Enable "Free Web Services"

### "Invalid username"
- Check spelling in your .env file
- Username is case-sensitive
- Make sure no spaces or quotes around the value

### Still seeing demo account warning
- Restart your development server: `pnpm dev`
- For Railway: Redeploy or restart the service
- Check that environment variable is set correctly

### Rate limit still exceeded
- Wait 24 hours for demo limit to reset
- Or use VPN/different IP temporarily
- Once your account is active, this won't happen

## Cost

**100% FREE** for standard usage.

Paid tiers only needed if you exceed:
- 30,000 requests/day
- Need commercial support
- Need premium features

For this earthquake alert app, the free tier is more than sufficient.

## Support

If you have issues:
1. Check GeoNames forum: http://forum.geonames.org/
2. Email: support@geonames.org
3. Check your account status: http://www.geonames.org/manageaccount
