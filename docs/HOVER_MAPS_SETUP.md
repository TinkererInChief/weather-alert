# 🗺️ Hover Maps Setup Guide

The application now features advanced 3D map hover previews for earthquake and tsunami events. Follow this guide to set them up properly.

---

## 🚀 Quick Start

### 1. Get a Mapbox Token (FREE)

1. Visit https://account.mapbox.com/
2. Sign up for a free account
3. Navigate to "Access tokens"
4. Copy your default public token (starts with `pk.`)

**Free tier includes:**
- 200,000 map loads/month
- Full 3D terrain support
- No credit card required

### 2. Add Token to Your Environment

Add to `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your.mapbox.token.here"
```

### 3. Restart Development Server

```bash
pnpm dev
```

---

## 🐛 Troubleshooting

### Issue: "No location data" tooltip appears on hover

**Cause:** The alert/event doesn't have valid coordinates

**Check:**
1. Open browser console
2. Look for the event data structure
3. Verify `latitude` and `longitude` fields exist and are not `null`, `0`, or `undefined`

**Fix:** Ensure your API/database is providing valid coordinates:
```typescript
// Valid coordinates
latitude: 21.3,    // ✅ Valid
longitude: -157.8  // ✅ Valid

// Invalid coordinates (hover won't work)
latitude: null,    // ❌ Invalid
latitude: 0,       // ❌ Invalid (0,0 is middle of Atlantic)
latitude: undefined // ❌ Invalid
```

### Issue: Black/dark map with "Map Unavailable" message

**Causes:**
1. Missing or invalid Mapbox token
2. Rate limit exceeded (> 200k loads/month)
3. Network connectivity issue

**Solutions:**

**Check token is set:**
```bash
# In terminal
echo $NEXT_PUBLIC_MAPBOX_TOKEN

# Should output: pk.xxxxx...
```

**Verify token in browser console:**
```javascript
console.log(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
```

**Test token validity:**
Visit: `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=YOUR_TOKEN_HERE`

Should return JSON (not 401 error)

### Issue: Map loads but is completely black

**Causes:**
1. Token has expired
2. Token lacks necessary scopes
3. Mapbox service is down

**Solutions:**
1. Generate a new token at https://account.mapbox.com/
2. Ensure token has these scopes:
   - ✅ `styles:read`
   - ✅ `styles:tiles`
   - ✅ `fonts:read`
   - ✅ `datasets:read`

### Issue: Hover preview not appearing at all

**Checklist:**
- [ ] Event has valid coordinates (not 0, null, or undefined)
- [ ] Coordinates are greater than 0.01 (not effectively zero)
- [ ] You're hovering over the correct element (card or table row)
- [ ] Browser console shows no errors
- [ ] Component is wrapped with `EventHoverCard`

**Debug:**
```typescript
// Add to your page component to debug
console.log('Event data:', alert)
console.log('Has coords:', alert.latitude, alert.longitude)
```

---

## 📊 Testing the Implementation

### Test with Earthquake Alerts

1. Navigate to `/dashboard/alerts`
2. Switch to "Live" or "Analytics" tab
3. Hover over any alert card or table row
4. You should see:
   - 3D terrain map
   - Depth shaft visualization
   - Shaking radius circles
   - Population impact estimates
   - Event details panel

### Test with Tsunami Alerts

1. Navigate to `/dashboard/tsunami`
2. Switch to "Live" or "Analytics" tab
3. Hover over any alert
4. You should see:
   - 3D terrain map
   - Animated wave ripples
   - ETA countdown (if target location set)
   - Threat level badges
   - Event details panel

---

## 🔧 Advanced Configuration

### Custom Target Location for Tsunami ETA

Edit the tsunami integration in `/app/dashboard/tsunami/page.tsx`:

```typescript
<EventHoverCard
  event={tsunamiEvent}
  type="tsunami"
  tsunamiTargetLocation={{
    latitude: 37.7749,  // San Francisco
    longitude: -122.4194,
    name: 'San Francisco'
  }}
>
```

### Disable Specific Features

In `/components/shared/MapPreview.tsx`:

```typescript
<MapPreview
  latitude={event.latitude}
  longitude={event.longitude}
  magnitude={magnitude}
  depth={depth}
  type="earthquake"
  showDepthShaft={false}      // Disable depth visualization
  showShakingRadius={false}   // Disable radius circles
  showTsunamiRipples={false}  // Disable tsunami ripples
/>
```

---

## 📈 Performance Considerations

### Map Load Times

- **First render:** 200-500ms (tile loading)
- **Subsequent hovers:** < 100ms (cached)

### Optimization Tips

1. **Debounce hover:** Already implemented (150ms delay)
2. **Limit concurrent previews:** Only one map loads at a time
3. **Static maps:** Interactive features disabled for performance
4. **Lazy loading:** Map library loads on first hover

### Bundle Size Impact

- **Mapbox GL JS:** ~55KB gzipped
- **Radix Popover:** ~5KB gzipped
- **Total added:** ~60KB gzipped

---

## 🆘 Still Having Issues?

1. **Check browser console** for errors
2. **Verify environment variable** is set correctly
3. **Test with default token** first (included in code)
4. **Clear browser cache** and restart dev server
5. **Check Mapbox account** for rate limit status

### Get Help

- Mapbox documentation: https://docs.mapbox.com/
- Mapbox support: https://support.mapbox.com/

---

## ✅ Success Indicators

When everything is working correctly, you should see:

- ✅ Map loads within 500ms
- ✅ 3D terrain is visible
- ✅ Markers pulse at epicenter
- ✅ Circles/ripples animate smoothly
- ✅ Event details panel shows all info
- ✅ No console errors
- ✅ Smooth hover animations

---

**Happy mapping!** 🗺️✨
