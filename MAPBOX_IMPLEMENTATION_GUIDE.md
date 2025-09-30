# Mapbox Implementation Guide

## Step 1: Get Your Mapbox Access Token 🔑

### A. From Mapbox Dashboard

1. Go to: https://account.mapbox.com/
2. Sign in with your account
3. Navigate to **"Access tokens"** in the menu
4. You should see a **"Default public token"** - this is what we'll use
5. Copy the token (starts with `pk.`)

**Important**: 
- Public tokens (starting with `pk.`) are safe to use in client-side code
- They're designed to be exposed in your frontend
- Rate limiting is based on your account, not the token

### B. Add Token to Environment Variables

**For Development (.env.local)**:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

**For Production (Vercel/Netlify)**:
- Add the same variable in your hosting platform's environment settings
- Variable name: `NEXT_PUBLIC_MAPBOX_TOKEN`
- Value: Your token

---

## Step 2: Install Required Packages 📦

Run this command:

```bash
pnpm add mapbox-gl react-map-gl
pnpm add -D @types/mapbox-gl
```

**What these do**:
- `mapbox-gl` - Core Mapbox GL JS library (WebGL-powered maps)
- `react-map-gl` - React wrapper for Mapbox (by Uber, well-maintained)
- `@types/mapbox-gl` - TypeScript types

---

## Step 3: Implementation Overview

We'll update the `GlobalEventMap` component to use Mapbox instead of the CSS gradient.

**Key Features We'll Implement**:
1. ✅ Interactive map with zoom/pan
2. ✅ Circle markers for earthquakes (size = magnitude)
3. ✅ Color-coded by severity
4. ✅ Popup on click with event details
5. ✅ Fly-to animation when selecting events
6. ✅ Map style switcher (streets/satellite)
7. ✅ Legend and controls

---

## Step 4: Component Structure

```
components/dashboard/
├── GlobalEventMap.tsx (we'll update this)
└── EventPopup.tsx (optional - for cleaner popups)
```

---

## Step 5: Implementation Files

I'll create the updated component files for you.

---

## Step 6: Usage Limits (Free Tier)

Your Mapbox free tier includes:
- ✅ **50,000 map loads per month**
- ✅ Unlimited static requests
- ✅ All map styles (streets, satellite, dark, etc.)

**What counts as a "load"**:
- Each page view with the map = 1 load
- Refreshing the page = 1 load
- Panning/zooming = FREE (doesn't count)

**Example calculation**:
- 100 users/month × 5 dashboard views each = 500 loads
- Well within free tier! ✅

**Monitor usage**:
- Dashboard: https://account.mapbox.com/statistics/
- Set up billing alerts in settings

---

## Step 7: Best Practices

### Security
✅ **Public token (pk.) is SAFE to expose**
- Designed for client-side use
- Can't be used to modify your account
- Rate-limited per domain

❌ **Secret token (sk.) should NEVER be in frontend**
- Used for server-side operations only
- Can modify your account

### Performance
- ✅ Mapbox caches tiles automatically
- ✅ Only loads visible tiles
- ✅ Hardware-accelerated (WebGL)
- ✅ Lazy loads when component mounts

### Cost Management
- Monitor usage in Mapbox dashboard
- Set up billing alerts
- Consider implementing lazy loading (load map only when tab is active)

---

## Troubleshooting

### "Token is missing" error
- Check `.env.local` file exists in project root
- Verify variable name: `NEXT_PUBLIC_MAPBOX_TOKEN`
- Restart dev server after adding env variable

### Map not showing
- Check browser console for errors
- Verify token is valid (test at https://api.mapbox.com/v4/mapbox.mapbox-streets-v8.json?access_token=YOUR_TOKEN)
- Check CSS is imported

### Blank/white screen
- Import Mapbox CSS: `import 'mapbox-gl/dist/mapbox-gl.css'`
- Check container has explicit height
- Verify token starts with `pk.`

---

## Next Steps

After I implement the component:

1. **Add your token to `.env.local`**
2. **Restart dev server** (`pnpm dev`)
3. **Navigate to dashboard**
4. **You should see a beautiful interactive map!** 🎉

Ready to proceed? I'll implement the component now! 🚀
