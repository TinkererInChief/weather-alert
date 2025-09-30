# 🗺️ Quick Mapbox Token Setup

## The Issue

Your dashboard shows: **"Mapbox Token Missing"**

This is because `NEXT_PUBLIC_MAPBOX_TOKEN` is not set in your `.env.local` file.

## Solution (3 Steps - 5 Minutes)

### Step 1: Get Your Token (2 minutes)

1. Go to: **https://account.mapbox.com/access-tokens/**
2. Sign in with your Mapbox account
3. Find your **"Default public token"**
4. Copy it (it starts with `pk.eyJ...`)

### Step 2: Add to .env.local (1 minute)

I've already added a placeholder in your `.env.local` file at **line 44**:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

**Replace `pk.your_mapbox_token_here` with your actual token.**

Your `.env.local` should look like:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNrZXhhbXBsZSJ9.example-token-here
```

### Step 3: Restart Dev Server (30 seconds)

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

### Step 4: Refresh Dashboard

1. Open: http://localhost:3000/dashboard
2. The map should now show **real Mapbox tiles**! 🎉

---

## What Changed

### ✅ Removed:
- **Priority Alerts** component (as requested)

### ✅ Fixed:
- **Import error** - Changed `react-map-gl` to `react-map-gl/mapbox` (v8 requirement)
- **Build error** - Now builds successfully

### ✅ Added:
- **Token placeholder** in `.env.local`
- Better error message when token is missing

---

## Troubleshooting

### Map still not showing after adding token?

**1. Check token format:**
   - Must start with `pk.` (public token)
   - Not `sk.` (secret token)

**2. Verify environment variable name:**
   ```bash
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   ```
   - Exactly this name (case-sensitive)
   - Must start with `NEXT_PUBLIC_` to be available in browser

**3. Restart dev server:**
   ```bash
   pnpm dev
   ```
   - Environment variables only load on server start

**4. Hard refresh browser:**
   - Press: Ctrl+Shift+R (Windows/Linux)
   - Press: Cmd+Shift+R (Mac)

**5. Check browser console:**
   - Press F12 → Console tab
   - Look for Mapbox errors

### Still getting "Token Missing" error?

Check if token is loaded:
```bash
# In your terminal
cat .env.local | grep MAPBOX
# Should show: NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

---

## Expected Result

### Before (Current):
```
┌─────────────────────────────┐
│  📍 Mapbox Token Missing    │
│                             │
│  [Get Mapbox Token →]       │
└─────────────────────────────┘
```

### After (With Token):
```
┌─────────────────────────────┐
│  🗺️ Interactive Map         │
│  🔴 Earthquake Markers      │
│  🌍 Real Tiles              │
│  ⚡ Zoom/Pan/Click          │
└─────────────────────────────┘
```

---

## Security Note

✅ **Safe to commit**: Public tokens (pk.) are designed for browser use
⚠️ **Don't commit**: If you add it to `.env.local.example`, remove the real value
✅ **Safe to expose**: Public tokens can't modify your account

---

## Next Step

👉 **Go to https://account.mapbox.com/access-tokens/ and copy your token!**

Then replace line 44 in `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

Restart server and enjoy your map! 🚀
