# Debugging AI Assistant Issues

## Problem: "Failed to generate scenario" Error

When the AI Assistant fails, it could be due to several reasons. Follow these steps to diagnose:

## Step 1: Check API Key Configuration

Verify your `.env.local` has the Perplexity API key:

```bash
grep PERPLEXITY_API_KEY .env.local
```

Should show:
```
PERPLEXITY_API_KEY=pplx-your-api-key-here
```

## Step 2: Test Perplexity API Connection

We've created a test endpoint. Access it while your dev server is running:

```bash
# Start dev server if not running
pnpm dev

# In another terminal, test the API
curl http://localhost:3000/api/ai/test-perplexity
```

Or open in browser:
```
http://localhost:3000/api/ai/test-perplexity
```

### Expected Success Response:
```json
{
  "success": true,
  "message": "Perplexity API is working correctly",
  "response": "OK",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 2,
    "total_tokens": 12
  }
}
```

### Common Error Responses:

#### 1. API Key Invalid (401)
```json
{
  "success": false,
  "error": "API returned 401: Unauthorized",
  "diagnostics": {
    "apiKeyConfigured": true,
    "testResult": {
      "status": 401,
      "body": "Invalid API key"
    }
  }
}
```

**Solution:** Get a new API key from https://www.perplexity.ai/settings/api

#### 2. Rate Limited (429)
```json
{
  "success": false,
  "error": "API returned 429: Too Many Requests",
  "diagnostics": {
    "testResult": {
      "status": 429,
      "body": "Rate limit exceeded"
    }
  }
}
```

**Solution:** Wait a few minutes or upgrade your Perplexity plan

#### 3. Quota Exceeded (402)
```json
{
  "success": false,
  "error": "API returned 402: Payment Required"
}
```

**Solution:** Add credits to your Perplexity account

#### 4. Network Error
```json
{
  "success": false,
  "error": "fetch failed"
}
```

**Solution:** Check your internet connection

## Step 3: Check Authentication

The AI Assistant requires you to be logged in. Check:

1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Look for `next-auth.session-token`
4. If missing, log in again

## Step 4: Check Server Logs

When you try to generate a scenario, check your terminal running `pnpm dev`:

### Success Logs:
```
🤖 Parsing scenario with Perplexity AI: major earthquake near Tokyo
🔑 API Key configured: Yes (length: 62)
📡 Perplexity response status: 200
✓ Perplexity parsed scenario: Tokyo Bay Earthquake
```

### Error Logs:
```
❌ Perplexity API error: {"error":"Invalid API key"}
Error parsing scenario: Error: Perplexity API failed (401)
```

## Step 5: Test with Simple Prompt

Try these simple prompts to isolate the issue:

### Good Test Prompts:
- `magnitude 7 near Tokyo`
- `8.0 earthquake Japan`
- `tsunami scenario California`

### Avoid Initially:
- Very long prompts (>100 words)
- Ambiguous locations
- Non-earthquake terms

## Step 6: Check Browser Console

Open browser DevTools → Console tab and look for errors:

### Common Issues:

#### CORS Error
```
Access to fetch at 'http://localhost:3000/api/ai/parse-scenario' 
from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:** Restart your dev server

#### Network Error
```
POST http://localhost:3000/api/ai/parse-scenario net::ERR_CONNECTION_REFUSED
```

**Solution:** Ensure dev server is running

#### 401 Unauthorized
```
AI Generation Error: Unauthorized
```

**Solution:** Log in to the application

## Fallback: Pattern Matching

If Perplexity fails, the system has a fallback pattern matcher:

```
Input: "magnitude 8 near Tokyo"
Output: Uses pattern matching instead of AI
```

You'll see:
```
✓ Scenario created (fallback mode)
```

## Quick Fixes

### Fix 1: Restart Everything
```bash
# Stop dev server (Ctrl+C)
pnpm dev
# Try again in browser
```

### Fix 2: Clear Cache
```bash
# Clear Next.js cache
rm -rf .next
pnpm build
pnpm dev
```

### Fix 3: Use Historical Scenarios
Instead of AI Assistant, use the **Historical** tab:
- 2011 Tōhoku (9.1)
- 2004 Indian Ocean (9.3)
- 1960 Valdivia Chile (9.5)

These don't require AI and always work.

### Fix 4: Use Quick Form
Manually enter coordinates:
1. Click **Quick Form** tab
2. Enter lat/lon
3. Adjust magnitude
4. Click **Run Custom Scenario**

## Getting Help

If none of these work, collect this information:

1. **Test endpoint result:**
   ```bash
   curl http://localhost:3000/api/ai/test-perplexity > perplexity-test.json
   ```

2. **Server logs:**
   Copy the terminal output when you try to generate a scenario

3. **Browser console:**
   Screenshot or copy any errors from DevTools Console

4. **Environment:**
   ```bash
   node --version
   pnpm --version
   echo $PERPLEXITY_API_KEY | wc -c
   ```

## Perplexity API Documentation

For API-specific issues, check:
- Dashboard: https://www.perplexity.ai/settings/api
- Docs: https://docs.perplexity.ai/
- Status: https://status.perplexity.ai/

## Alternative: Disable AI

To disable AI and use only manual/historical scenarios:

In `.env.local`, remove or comment out:
```bash
# PERPLEXITY_API_KEY=...
```

The system will skip AI and only offer:
- Quick Form (manual entry)
- Historical scenarios
- Pattern matching fallback
