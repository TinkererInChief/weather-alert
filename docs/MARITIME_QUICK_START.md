# 🚢 Maritime Intelligence - Quick Start Guide

## Prerequisites

✅ **Perplexity API Key** - Already configured in `.env.local`

## Test in 2 Minutes

### Step 1: Start the server
```bash
npm run dev
# or
pnpm dev
```

### Step 2: Open the test page
```
http://localhost:3000/test/maritime
```

### Step 3: Select a scenario
Click any earthquake scenario button:
- **San Francisco M7.2** - Major port city with tsunami
- **Seattle M7.5** - Pacific Northwest scenario
- **Tokyo Bay M7.0** - International port

### Step 4: Watch the magic ✨
The widget will:
1. Query Perplexity AI (8-12 seconds)
2. Display maritime intelligence:
   - 🏢 Port status (open/closed)
   - 🚢 Vessel guidance
   - 📞 Emergency contacts
   - 🕒 Historical context

## View on Main Dashboard

The widget automatically appears on the main dashboard when:
- **M6.0+ earthquake** is detected
- **Tsunami warning** is active

Navigate to:
```
http://localhost:3000/dashboard
```

The widget will show between the tsunami banner and the event map.

## API Testing

Test the API directly:

```bash
curl -X POST http://localhost:3000/api/maritime/intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "magnitude": 7.2,
    "location": "San Francisco Bay Area",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "tsunamiWarning": true,
    "timestamp": "2025-10-05T04:00:00Z"
  }'
```

Expected response (~10 seconds):
```json
{
  "success": true,
  "data": {
    "summary": "...",
    "portStatus": [...],
    "vesselGuidance": [...],
    "emergencyContacts": [...],
    "historicalContext": "...",
    "shippingRoutes": {...},
    "confidence": "high",
    "sources": 8,
    "generatedAt": "2025-10-05T04:00:10Z"
  }
}
```

## What to Expect

### Port Status Example
```
San Francisco Port
🔴 CLOSED - Tsunami warning
Estimated reopening: 8-12 hours

Oakland Port
🟢 OPEN - Accepting diversions
+1-510-627-1100
```

### Vessel Guidance Example
```
Vessels in port:
Double mooring lines, secure all cargo, await harbor master instructions

Vessels in deep ocean (>1000m):
Safe to ride out tsunami. Wave height <1m in deep water. Maintain course.
```

### Emergency Contacts Example
```
US Coast Guard - San Francisco
+1-415-399-3547
VHF Channel 16 (156.8 MHz)
```

## Troubleshooting

### Widget not loading?
1. Check console for errors (F12)
2. Verify `PERPLEXITY_API_KEY` in `.env.local`
3. Ensure dev server is running

### API errors?
```bash
# Check if API key is set
echo $PERPLEXITY_API_KEY

# Test connectivity
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-sonar-large-128k-online","messages":[{"role":"user","content":"test"}]}'
```

### Slow response?
- Normal: 8-12 seconds for AI analysis
- Slow: >20 seconds may indicate network issues
- Check Perplexity API status

## Cost Tracking

Monitor your Perplexity usage:
1. Visit: https://www.perplexity.ai/settings/api
2. Check "Usage" tab
3. Each query costs ~$0.01-0.02

Your $20 credit = ~1000-2000 queries

## Next Steps

1. ✅ **Test the widget** - Use test page
2. ✅ **Check API response** - Verify intelligence quality
3. ✅ **Review UI** - Ensure proper display
4. 📋 **Integrate with alerts** - (Optional) Send maritime alerts to contacts

## Files Created

```
✅ lib/services/perplexity-service.ts
✅ app/api/maritime/intelligence/route.ts
✅ components/dashboard/MaritimeIntelligenceWidget.tsx
✅ app/test/maritime/page.tsx
✅ app/dashboard/page.tsx (modified)
✅ docs/MARITIME_INTELLIGENCE_IMPLEMENTATION.md
✅ docs/MARITIME_QUICK_START.md (this file)
```

## Demo Scenarios

### Scenario 1: San Francisco Port Closure
**Input:** M7.2 earthquake, tsunami warning  
**Expected:** Port closure, vessel diversions, emergency contacts

### Scenario 2: Seattle Pacific Northwest
**Input:** M7.5 earthquake, tsunami warning  
**Expected:** Multiple port analysis, historical 2011 comparison

### Scenario 3: Los Angeles (No Tsunami)
**Input:** M6.8 earthquake, no tsunami  
**Expected:** Port monitoring, precautionary guidance

## Support

For detailed documentation, see:
- `docs/MARITIME_INTELLIGENCE_IMPLEMENTATION.md` - Full implementation details
- `docs/PRODUCTION_READINESS_PLAN.md` - Deployment guide

**Ready to test!** Open http://localhost:3000/test/maritime
