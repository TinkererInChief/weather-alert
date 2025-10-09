# Railway Mapbox Fix - Deployment Steps

## Issue
Mapbox map not loading in Railway production due to:
1. Missing/incorrect CSP headers
2. Environment variable not set in Railway

## ✅ Fixes Applied (Ready to Deploy)

### 1. CSP Headers Fixed (`next.config.js`)
Updated Content-Security-Policy to properly allow all Mapbox domains:
- Changed from listing individual tile servers (a.tiles, b.tiles, etc.)
- To wildcard pattern: `https://*.mapbox.com`
- This allows all Mapbox tile subdomains

### 2. Enhanced Error Handling (`MapPreview.tsx`)
- Better token validation
- Specific error messages for 401, 403, CSP issues
- More detailed console logging

## 🚀 Deployment Steps for Railway

### Step 1: Verify Environment Variable in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **"Variables"** tab
4. Check if `NEXT_PUBLIC_MAPBOX_TOKEN` exists

**If it doesn't exist, add it:**
```
Variable Name: NEXT_PUBLIC_MAPBOX_TOKEN
Value: pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg
```

### Step 2: Deploy the Code Changes

Railway auto-deploys on git push, so:

```bash
# Commit the fixes
git add next.config.js components/shared/MapPreview.tsx
git commit -m "Fix: Enhanced Mapbox CSP and error handling for Railway"
git push origin main
```

Railway will automatically:
- Detect the push
- Build your app
- Deploy with new CSP headers
- Apply the NEXT_PUBLIC_MAPBOX_TOKEN variable

### Step 3: Verify Deployment

1. Wait for Railway deployment to complete (check deployment logs)
2. Visit your production URL: `https://appealing-playfulness-production.up.railway.app`
3. Navigate to Dashboard → Earthquake Alerts or Tsunami Alerts
4. Hover over an alert to trigger the map preview
5. Open browser console (F12) to see any errors

## 🔍 Expected Console Output

**Success:**
```
🗺️ Initializing map with token: pk.eyJ1Ijoiam9rZXJpb...
✅ Map style loaded successfully
```

**If Token Missing:**
```
❌ Mapbox token not found
```

**If Token Invalid:**
```
❌ Mapbox FATAL error: { status: 401, message: '...' }
```

**If CSP Blocking:**
```
❌ Mapbox FATAL error: { message: '...csp...' }
```

## 🛠️ Troubleshooting

### Map Still Not Loading After Deployment

**Check 1: Environment Variable**
```bash
# Using Railway CLI
railway variables

# Should show:
# NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```

**Check 2: Check Browser Console**
- F12 → Console tab
- Look for any red error messages
- Share the error output if you see any

**Check 3: Network Tab**
- F12 → Network tab
- Filter by "mapbox"
- Check if requests are being blocked or returning 401/403

**Check 4: Verify Token in Browser**
Open browser console on your Railway app and run:
```javascript
console.log('Token:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
```
It should show your token starting with "pk."

### Common Issues

| Issue | Solution |
|-------|----------|
| Token missing in Railway | Add `NEXT_PUBLIC_MAPBOX_TOKEN` to Railway Variables |
| 401 Unauthorized | Token expired - generate new one at mapbox.com |
| 403 Forbidden | Token lacks permissions - create new token with all scopes |
| CSP Error | Already fixed - redeploy the code |
| Map shows but no tiles | Check token URL restrictions in Mapbox dashboard |

## 📝 Changes Made Summary

### `next.config.js`
- ✅ Simplified `connect-src` to use `https://*.mapbox.com` wildcard
- ✅ Removed manual listing of tile subdomains (a.tiles, b.tiles, etc.)
- ✅ This allows dynamic Mapbox infrastructure changes

### `components/shared/MapPreview.tsx`
- ✅ Added token validation on component mount
- ✅ Enhanced error messages with specific HTTP status codes
- ✅ Better console logging for debugging
- ✅ Improved error display for users

## ✅ Verification Checklist

After deployment, verify:

- [ ] Railway deployment completed successfully
- [ ] Environment variable `NEXT_PUBLIC_MAPBOX_TOKEN` is set in Railway
- [ ] Browser console shows "🗺️ Initializing map with token"
- [ ] No CSP errors in console
- [ ] No 401/403 errors in Network tab
- [ ] Map preview loads when hovering over alerts
- [ ] 3D terrain and animations work properly

## 🎯 Next Steps

1. **Deploy now**: Push the code changes to trigger Railway deployment
2. **Wait 2-3 minutes**: For Railway to build and deploy
3. **Test the map**: Visit production and hover over an alert
4. **Share results**: Let me know if you see any console errors

---

**Your token (already in .env.local):**
```
pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg
```

**Railway Project URL:**
```
https://appealing-playfulness-production.up.railway.app
```
