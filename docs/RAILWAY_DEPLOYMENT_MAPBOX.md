# 🚂 Railway Deployment - Mapbox Configuration

This guide shows you how to add the Mapbox token to your Railway deployment so the 3D map previews work in production.

---

## 🎯 **Quick Setup (2 minutes)**

### **Step 1: Get Your Mapbox Token**

You already have this in your `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg"
```

### **Step 2: Add to Railway**

1. Go to https://railway.app/
2. Open your project: **Emergency Alert System**
3. Click on your service
4. Go to **"Variables"** tab
5. Click **"+ New Variable"**
6. Add:
   ```
   Variable: NEXT_PUBLIC_MAPBOX_TOKEN
   Value: pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg
   ```
7. Click **"Add"**
8. Railway will automatically redeploy

### **Step 3: Verify**

After deployment completes (~2 minutes):
1. Visit your production URL
2. Open browser console (F12)
3. Hover over an event
4. Look for: `🗺️ Initializing map with token: pk.eyJ1Ijoiam9rZXJpbm...`
5. Should see: `✅ Map style loaded successfully`

---

## 🐛 **Troubleshooting**

### **Issue: Map still shows "Map Unavailable"**

**Check 1: Variable is Set**
- In Railway dashboard → Variables tab
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is listed
- Make sure it starts with `pk.`

**Check 2: Redeployment Completed**
- Railway should auto-redeploy after adding variable
- Check "Deployments" tab for status
- Wait for "✓ Deployed" status

**Check 3: Browser Console**
- Visit your production site
- Open console (F12)
- Hover over an event
- Look for error messages

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `⚠️ Mapbox token not configured` | Variable not set | Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Railway |
| `❌ Mapbox error: 401` | Invalid token | Check token is correct |
| `❌ Mapbox error: 403` | Token lacks permissions | Generate new token with all scopes |
| `❌ CORS error` | CSP blocking | Already fixed in code |

---

## 🔐 **Security Notes**

### **Why NEXT_PUBLIC_?**

The `NEXT_PUBLIC_` prefix makes the variable accessible in the browser. This is safe for Mapbox tokens because:
- ✅ They're designed to be public
- ✅ Usage is tracked/limited by domain
- ✅ You can restrict them to specific URLs

### **Restrict Token to Your Domain**

1. Go to https://account.mapbox.com/access-tokens/
2. Click your token
3. Under "URL restrictions", add:
   ```
   https://tsunami-alerts.com
   https://appealing-playfulness-production.up.railway.app
   ```
4. This prevents others from using your token

---

## 📊 **Testing in Production**

Once deployed, test these pages:

**Dashboard (`/dashboard`):**
```
✓ Hover over Unified Incident Timeline events
✓ Map should load within 1 second
✓ Should see 3D terrain
✓ No console errors
```

**Earthquake Alerts (`/dashboard/alerts`):**
```
✓ Live Feed: Hover over cards
✓ Analytics: Hover over table rows  
✓ Should show depth shaft visualization
✓ Should show shaking radius circles
```

**Tsunami Monitoring (`/dashboard/tsunami`):**
```
✓ Live Feed: Hover over cards
✓ Analytics/History: Hover over table rows
✓ Should show animated wave ripples
✓ Should show ETA countdown
```

---

## 🚀 **CSP Updates (Already Applied)**

The code now includes Mapbox in Content Security Policy:

```typescript
// lib/security-headers.ts
trustedDomains: [
  'https://api.mapbox.com',
  'https://*.tiles.mapbox.com',
  'https://events.mapbox.com'
]

// Script sources
scriptSources.push('https://api.mapbox.com')
scriptSources.push('blob:') // For Mapbox workers

// Style sources
styleSources.push('https://api.mapbox.com')

// Font sources
directives.push("font-src 'self' https://api.mapbox.com")
```

This allows Mapbox to:
- ✅ Load map tiles and styles
- ✅ Execute web workers
- ✅ Load fonts for map labels
- ✅ Make API calls for terrain data

---

## 💡 **Alternative: Railway CLI**

If you prefer command line:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Add variable
railway variables set NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg"

# Trigger redeployment
railway up
```

---

## 📝 **Checklist**

Before marking this complete:

- [ ] Added `NEXT_PUBLIC_MAPBOX_TOKEN` to Railway variables
- [ ] Waited for automatic redeployment
- [ ] Visited production site
- [ ] Opened browser console
- [ ] Hovered over an event
- [ ] Saw "✅ Map style loaded successfully" in console
- [ ] Map displays correctly with 3D terrain
- [ ] No CSP errors in console
- [ ] Tested on all three pages (dashboard, alerts, tsunami)

---

## 🎉 **Success Indicators**

When everything works:
- ✅ Maps load within 1 second
- ✅ 3D terrain is visible
- ✅ Markers pulse at epicenter
- ✅ Smooth animations
- ✅ No console errors
- ✅ Hover cards position correctly

---

**Need Help?**

If you're still having issues after following this guide:
1. Check Railway deployment logs
2. Check browser console for specific errors
3. Verify Mapbox account is active
4. Test token with direct URL:
   ```
   https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=YOUR_TOKEN
   ```
   Should return JSON, not 401.
