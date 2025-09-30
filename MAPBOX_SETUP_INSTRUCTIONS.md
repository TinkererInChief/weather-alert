# 🗺️ Mapbox Setup Instructions

## Quick Start (5 Minutes)

### Step 1: Get Your Mapbox Token

1. **Go to Mapbox Account**: https://account.mapbox.com/
2. **Sign in** with your account
3. **Click "Access tokens"** in the left menu
4. **Copy the "Default public token"** (starts with `pk.`)

### Step 2: Add Token to Environment

1. **Create `.env.local` file** in the project root (if it doesn't exist)
2. **Add this line**:
   ```bash
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
   ```
3. **Replace** `pk.your_actual_token_here` with your actual token

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
pnpm dev
```

### Step 4: Test the Map

1. Open http://localhost:3000/dashboard
2. You should see a **beautiful interactive map** with real tiles! 🎉
3. Try:
   - **Zooming** with mouse wheel or +/- buttons
   - **Panning** by dragging the map
   - **Clicking events** to see popups
   - **Cycling map styles** with the layers button (streets → satellite → dark)

---

## What You'll See

### Map Features:
✅ **Real Mapbox tiles** (streets, satellite, or dark mode)
✅ **Interactive zoom/pan** controls
✅ **Earthquake markers** (color-coded by magnitude)
✅ **Pulse animations** on markers
✅ **Hover labels** showing magnitude
✅ **Click popups** with event details
✅ **Navigation controls** (zoom, compass)
✅ **Scale indicator**

### Visual Elements:
- 🟢 Green circles = M 3.0-4.9
- 🟡 Yellow circles = M 5.0-5.9
- 🟠 Orange circles = M 6.0-6.9
- 🔴 Red circles = M 7.0+
- Size = magnitude (bigger = stronger)

---

## Troubleshooting

### Problem: Map not showing / blank screen

**Check 1**: Verify token is in `.env.local`
```bash
cat .env.local | grep MAPBOX
# Should show: NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

**Check 2**: Verify token starts with `pk.` (public token)
- ✅ Correct: `pk.eyJ1...`
- ❌ Wrong: `sk.eyJ1...` (secret token - don't use this!)

**Check 3**: Restart dev server after adding token
```bash
pnpm dev
```

**Check 4**: Check browser console for errors
- Press F12 → Console tab
- Look for Mapbox errors

### Problem: "Token is missing" message

This means the environment variable isn't loaded. 

**Solution**:
1. Verify `.env.local` exists in project root
2. Verify variable name is exactly: `NEXT_PUBLIC_MAPBOX_TOKEN`
3. Restart dev server
4. Hard refresh browser (Ctrl+Shift+R)

### Problem: Map is slow or not loading tiles

**Check internet connection** - Mapbox needs internet to load tiles
**Check Mapbox status**: https://status.mapbox.com/

### Problem: 401 Unauthorized error

Your token may be invalid or revoked.

**Solution**:
1. Go to https://account.mapbox.com/access-tokens/
2. Create a **new public token**
3. Copy it to `.env.local`
4. Restart dev server

---

## Usage Monitoring

### Check Your Usage:
1. Go to: https://account.mapbox.com/statistics/
2. View **map loads** for the current month
3. You have **50,000 free loads/month**

### What Counts as a Load:
- ✅ Each page view with the map = 1 load
- ✅ Refreshing the page = 1 load
- ❌ Panning/zooming = FREE (doesn't count!)
- ❌ Changing styles = FREE

### Set Up Billing Alerts:
1. Go to: https://account.mapbox.com/settings/
2. Click **"Billing"**
3. Set up **email alerts** at 80% usage

---

## Map Styles Available

The map cycles through 3 beautiful styles:

### 1. Streets (Default)
- Clean, modern street map
- Perfect for showing location context
- Clear labels and roads

### 2. Satellite
- High-resolution satellite imagery
- Real terrain and geography
- Great for visual impact

### 3. Dark Mode
- Dark theme for low-light viewing
- Reduced eye strain
- Professional appearance

**To switch**: Click the layers button (top right) or press the button repeatedly

---

## Advanced Configuration (Optional)

### Custom Map Center
Edit `GlobalEventMap.tsx`:
```typescript
const [viewState, setViewState] = useState({
  longitude: -122.4, // Your longitude
  latitude: 37.8,    // Your latitude
  zoom: 5            // Zoom level (1-20)
})
```

### Custom Map Styles
You can use custom Mapbox styles:
```typescript
mapStyle="mapbox://styles/your-username/your-style-id"
```

Create custom styles at: https://studio.mapbox.com/

---

## Cost Information

### Free Tier:
- ✅ 50,000 map loads/month
- ✅ All map styles
- ✅ Unlimited zoom/pan
- ✅ No credit card required

### If You Exceed Free Tier:
- $0.25 per 1,000 loads
- Example: 100,000 loads = $12.50/month
- You'll receive email alerts before billing

### For Your Use Case:
With ~100-1000 users/month:
- Estimated loads: 500-3,000/month
- **Well within free tier!** ✅
- Cost: **$0/month** 

---

## Security Notes

### ✅ Safe to Expose Public Token:
- Public tokens (pk.) are **designed for client-side use**
- They're **safe to commit to GitHub** (if public repo)
- They're **domain-restricted** (optional setting)

### ❌ Never Expose Secret Token:
- Secret tokens (sk.) should **NEVER** be in frontend code
- Keep them in server-side only
- They have full account access

### Best Practices:
1. ✅ Use public token (pk.) for map
2. ✅ Restrict token to your domains (optional)
3. ✅ Monitor usage regularly
4. ✅ Rotate tokens if compromised

---

## Next Steps

### After Map is Working:

1. **Test with real earthquake data** - markers should appear on actual locations
2. **Try different map styles** - click the layers button
3. **Test on mobile** - map is fully responsive
4. **Show it off!** - it looks professional 🎉

### Future Enhancements:
- Add clustering for many events
- Add heatmaps for density
- Add custom marker icons
- Add animation when events appear
- Add drawing tools
- Add geocoding (address search)

---

## Support

### Mapbox Documentation:
- General: https://docs.mapbox.com/
- React Map GL: https://visgl.github.io/react-map-gl/
- API Reference: https://docs.mapbox.com/mapbox-gl-js/api/

### Need Help?
1. Check browser console for errors
2. Review this guide's troubleshooting section
3. Check Mapbox status page
4. Verify your token at: https://account.mapbox.com/

---

## Summary

✅ **What we implemented**:
- Interactive Mapbox map with real tiles
- Color-coded earthquake markers
- Pulse animations
- Click popups with details
- Style switching (streets/satellite/dark)
- Navigation controls
- Responsive design

✅ **What you need to do**:
1. Get Mapbox token
2. Add to `.env.local`
3. Restart dev server
4. Enjoy the map! 🗺️

**Total setup time: ~5 minutes**

Happy mapping! 🚀
