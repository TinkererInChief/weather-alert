# OpenAI API Key Troubleshooting Guide

## Quick Checklist

### 1. ✅ Verify API Key on OpenAI Platform

**Go to:** https://platform.openai.com/api-keys

**Check:**
- [ ] Key is **Active** (not revoked)
- [ ] Key has **no restrictions** (or allows chat completions)
- [ ] Key was created recently (within last few hours)
- [ ] You copied the **entire key** (starts with `sk-proj-` or `sk-`)

**Important:** You can only see the full key **once** when created. If you're unsure, create a new one.

### 2. 💳 Check Billing & Credits

**Go to:** https://platform.openai.com/settings/organization/billing

**Verify:**
- [ ] **Payment method** is added
- [ ] **Credits available** or billing is active
- [ ] No **spending limits** blocking requests
- [ ] Account is **not suspended**

**Common Issue:** New API keys won't work without billing set up!

### 3. 🔑 Verify API Key Format

Your key should look like:
```
sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Length:** ~164 characters
**Prefix:** `sk-proj-` (project keys) or `sk-` (legacy keys)

**Check in `.env.local`:**
```bash
# Should be on ONE line, no spaces, no quotes
OPENAI_API_KEY=sk-proj-your-full-key-here
```

### 4. 🔄 Restart Dev Server

After changing `.env.local`:
```bash
# Stop server
pkill -f "next dev"

# Start again
pnpm dev
```

**Or:** Just press `Ctrl+C` in terminal and run `pnpm dev` again.

### 5. 🧪 Test API Key Directly

**Option A: Use Test Endpoint**
```bash
# Visit in browser:
http://localhost:3000/api/ai/test-openai
```

**Expected Success:**
```json
{
  "success": true,
  "message": "OpenAI API is working correctly",
  "model": "gpt-4o-mini"
}
```

**Expected Errors:**
```json
// Invalid key
{
  "success": false,
  "status": 401,
  "details": "Invalid API key"
}

// No billing
{
  "success": false,
  "status": 429,
  "details": "You exceeded your current quota"
}
```

**Option B: Test with cURL**
```bash
# Replace YOUR_API_KEY with your actual key
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

**Success Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Hello!"
      }
    }
  ]
}
```

**Error Response (401):**
```json
{
  "error": {
    "message": "Incorrect API key provided",
    "type": "invalid_request_error"
  }
}
```

## Common Errors & Solutions

### Error: "Invalid API key"

**Causes:**
1. Key was copied incorrectly (missing characters)
2. Key was revoked
3. Key has extra spaces or quotes

**Solutions:**
```bash
# 1. Create a NEW key at https://platform.openai.com/api-keys
# 2. Copy the ENTIRE key (click copy button)
# 3. Update .env.local:
OPENAI_API_KEY=sk-proj-paste-entire-key-here

# 4. Restart server:
pkill -f "next dev" && pnpm dev
```

### Error: "You exceeded your current quota"

**Causes:**
1. No billing set up
2. Free trial credits exhausted
3. Spending limit reached
4. Payment method declined

**Solutions:**
1. **Add billing:** https://platform.openai.com/settings/organization/billing
2. **Add payment method** (credit card)
3. **Check usage:** https://platform.openai.com/usage
4. **Increase limits** if needed

### Error: "Model not found" or "Model does not exist"

**Causes:**
1. Model name is wrong
2. Account doesn't have access to model
3. Model is deprecated

**Solutions:**
```typescript
// Try these models in order:
model: 'gpt-4o-mini'        // ✅ Recommended (cheap, fast)
model: 'gpt-3.5-turbo'      // ✅ Backup (even cheaper)
model: 'gpt-4o'             // ✅ If you have access
model: 'gpt-4-turbo'        // ⚠️ May need special access
```

### Error: "Rate limit exceeded"

**Causes:**
1. Too many requests too quickly
2. Free tier limits
3. Tier limits

**Solutions:**
1. **Wait 60 seconds** and try again
2. **Upgrade tier:** https://platform.openai.com/settings/organization/limits
3. **Add retry logic** (already implemented in fallback)

## Step-by-Step: Creating a New API Key

### 1. Go to OpenAI Platform
https://platform.openai.com/api-keys

### 2. Click "Create new secret key"
![Create Key Button]

### 3. Name Your Key
```
Name: Weather Alert System
Permissions: All (or at minimum: Model capabilities)
```

### 4. Copy the Key IMMEDIATELY
⚠️ **You can only see it once!**

Click the copy button or select all and copy.

### 5. Paste in .env.local
```bash
# Open .env.local
# Find or add this line:
OPENAI_API_KEY=sk-proj-paste-your-key-here

# Save the file
```

### 6. Restart Server
```bash
# Terminal where dev server is running:
Ctrl+C

# Then:
pnpm dev
```

### 7. Test It
Visit: http://localhost:3000/api/ai/test-openai

## Billing Setup Guide

### 1. Go to Billing Settings
https://platform.openai.com/settings/organization/billing/overview

### 2. Add Payment Method
- Click "Add payment method"
- Enter credit card details
- Confirm

### 3. Set Budget (Optional but Recommended)
```
Monthly budget: $10-50 (depending on usage)
Email alerts: Yes
Hard limit: Yes (to prevent surprises)
```

### 4. Check Current Usage
https://platform.openai.com/usage

**Expected costs for this app:**
- Per AI scenario: ~$0.0002
- 100 scenarios: ~$0.02
- 1000 scenarios: ~$0.20

Very affordable! 💰

## Debugging in Browser

### Open Developer Console
1. **Chrome/Edge:** Press `F12` or `Cmd+Option+I` (Mac)
2. Go to **Console** tab
3. Try generating a scenario
4. Look for error messages

### Network Tab
1. Go to **Network** tab
2. Try generating a scenario
3. Find request to `/api/ai/parse-scenario`
4. Click on it
5. Check **Response** tab for error details

### Common Console Errors

**"Failed to fetch"**
- Server is down
- Wrong URL
- CORS issue (shouldn't happen with Next.js)

**"500 Internal Server Error"**
- Check server terminal for logs
- API key issue
- Model issue

**"No scenario returned from API"**
- Response format issue
- Check server logs for actual error

## Server Logs to Check

When you try to generate a scenario, you should see:

**Success:**
```
🤖 Parsing scenario with OpenAI GPT-4: [your prompt]
🔑 API Key configured: Yes (length: 164)
📡 OpenAI response status: 200
📦 OpenAI response: {...}
✓ OpenAI parsed scenario: English Channel Earthquake
```

**Failure:**
```
🤖 Parsing scenario with OpenAI GPT-4: [your prompt]
🔑 API Key configured: Yes (length: 164)
📡 OpenAI response status: 401
❌ OpenAI API error: 401 {"error": {"message": "Incorrect API key"}}
⚠️ Trying fallback parser...
```

## Quick Test Script

Save this as `test-openai.sh`:

```bash
#!/bin/bash

# Load API key from .env.local
source .env.local

echo "Testing OpenAI API..."
echo "Key length: ${#OPENAI_API_KEY}"
echo "Key prefix: ${OPENAI_API_KEY:0:10}..."
echo ""

# Test API
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }' | jq

echo ""
echo "If you see a 'choices' array above, it works! ✅"
echo "If you see an 'error' object, check the message. ❌"
```

Run with:
```bash
chmod +x test-openai.sh
./test-openai.sh
```

## Still Not Working?

### 1. Check OpenAI Status
https://status.openai.com/

Is the API down? Check for incidents.

### 2. Try a Different Model
```typescript
// In /app/api/ai/parse-scenario/route.ts
// Change line 124:
model: 'gpt-3.5-turbo'  // Instead of gpt-4o-mini
```

### 3. Check Account Status
https://platform.openai.com/settings/organization/general

- Is account active?
- Any restrictions?
- Email verified?

### 4. Create Fresh API Key
Sometimes keys are just broken. Create a new one:
1. Delete old key
2. Create new key
3. Update .env.local
4. Restart server

### 5. Contact OpenAI Support
https://help.openai.com/

If nothing works, they can check your account.

## Environment Variable Checklist

Your `.env.local` should have:

```bash
# ✅ Correct format
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXX...

# ❌ Wrong - has quotes
OPENAI_API_KEY="sk-proj-XXXXXXXXXXXX..."

# ❌ Wrong - has spaces
OPENAI_API_KEY = sk-proj-XXXXXXXXXXXX...

# ❌ Wrong - multiline
OPENAI_API_KEY=sk-proj-XXXXXXXXXX
XXXXXXXXXX...

# ❌ Wrong - commented out
# OPENAI_API_KEY=sk-proj-XXXXXXXXXXXX...
```

## Summary

**Most Common Issues:**
1. 💳 **No billing set up** (80% of cases)
2. 🔑 **Key copied wrong** (15% of cases)
3. 🔄 **Server not restarted** (4% of cases)
4. 🚫 **Key revoked/expired** (1% of cases)

**Quick Fix:**
1. Go to https://platform.openai.com/settings/organization/billing
2. Add payment method
3. Go to https://platform.openai.com/api-keys
4. Create new key
5. Copy entire key
6. Update .env.local
7. Restart server with `pkill -f "next dev" && pnpm dev`
8. Test at http://localhost:3000/api/ai/test-openai

Good luck! 🍀
