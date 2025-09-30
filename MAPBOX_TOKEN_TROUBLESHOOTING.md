# 🗺️ Mapbox Token Troubleshooting Guide

## The Problem

You're seeing **"Mapbox Token Missing"** even though the token is in `.env.local` and Railway environment variables.

---

## Root Cause

**Next.js environment variables are loaded at BUILD time, not at RUNTIME.**

This means:
- ✅ Token is in `.env.local` file
- ❌ But Next.js hasn't loaded it yet
- ❌ Dev server needs restart OR rebuild

---

## Solution: 3-Step Fix

### Step 1: Verify Token is in File ✅

Check line 44 of `.env.local`:
```bash
cat .env.local | grep MAPBOX
```

**Expected output**:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieN...
```

**Your token**: `pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg`

✅ **Status**: Token IS present in file

---

### Step 2: Restart Dev Server 🔄

**Stop current server**:
```bash
# Press Ctrl+C in terminal running pnpm dev
```

**Start fresh**:
```bash
pnpm dev
```

**Why this works**:
- Next.js reads `.env.local` on startup
- Changes to environment files require restart
- Hot reload doesn't pick up env variable changes

---

### Step 3: Hard Refresh Browser 🌐

After restarting server:

**Windows/Linux**:
```
Ctrl + Shift + R
```

**Mac**:
```
Cmd + Shift + R
```

**Why this works**:
- Clears cached JavaScript bundle
- Forces browser to fetch new code with env variable

---

## Verification Steps

### 1. Check Browser Console

Open DevTools (F12) → Console tab

**Look for this log**:
```
Mapbox Token Status: Present ✅
```

OR

```
Mapbox Token Status: Missing ❌
```

**If you see "Missing ❌"**:
- Token not loaded by Next.js
- Continue to troubleshooting below

---

### 2. Check Next.js Environment

Add temporary debugging to your code:

**File**: `components/dashboard/GlobalEventMap.tsx`

The debug log is already added (line 37-40):
```typescript
// Debug: Log token status (remove in production)
if (typeof window !== 'undefined') {
  console.log('Mapbox Token Status:', mapboxToken ? 'Present ✅' : 'Missing ❌')
}
```

**What to look for**:
- Browser console should show "Present ✅"
- If it shows "Missing ❌", Next.js isn't loading the variable

---

## Advanced Troubleshooting

### Issue 1: Environment Variable Not Loading

**Possible causes**:
1. ❌ File named wrong (must be exactly `.env.local`)
2. ❌ Variable name wrong (must be exactly `NEXT_PUBLIC_MAPBOX_TOKEN`)
3. ❌ Server not restarted after adding token
4. ❌ Token has spaces or line breaks

**Check filename**:
```bash
ls -la | grep .env
```

**Expected**:
```
-rw-r--r--  1 user  staff  1234  .env.local
```

**Check variable name** (case-sensitive):
```bash
grep NEXT_PUBLIC .env.local
```

**Must be exactly**:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk...
```

---

### Issue 2: Railway Environment Variables

**Important**: Railway env vars are for **production** only!

**Local development**:
- Uses `.env.local` file ✅
- Does NOT use Railway variables ❌

**Production (Railway)**:
- Uses Railway environment variables ✅
- Does NOT use `.env.local` ❌

**To use Railway vars locally**:
```bash
railway run pnpm dev
```

**But for this issue, just use `.env.local`** (simpler)

---

### Issue 3: Token Format Issues

**Check for common errors**:

❌ **Wrong**:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN = pk.eyJ...  # Spaces around =
```

❌ **Wrong**:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ..."  # Quotes (sometimes cause issues)
```

✅ **Correct**:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg
```

**Your token looks correct!** ✅

---

### Issue 4: Cached Build

Sometimes Next.js caches the old build. Clear it:

```bash
# Remove Next.js cache
rm -rf .next

# Remove node_modules (nuclear option, takes longer)
rm -rf node_modules
pnpm install

# Rebuild
pnpm dev
```

---

## Test Commands

### Quick Test: Is Token Accessible?

Create a temporary test file:

**File**: `app/test-env/page.tsx`
```typescript
'use client'

export default function TestEnv() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Test</h1>
      <div className="space-y-2">
        <p><strong>Token Status:</strong> {token ? '✅ Present' : '❌ Missing'}</p>
        <p><strong>Token Value:</strong> {token ? `${token.substring(0, 20)}...` : 'N/A'}</p>
      </div>
    </div>
  )
}
```

**Visit**: http://localhost:3000/test-env

**Expected**:
```
Token Status: ✅ Present
Token Value: pk.eyJ1Ijoiam9rZXJp...
```

**If it shows ❌ Missing**: Next.js is definitely not loading the variable

---

## The Fix That Should Work

Based on your situation, here's the most likely solution:

### 1. Completely Stop Server

```bash
# Find and kill any running dev servers
pkill -f "next dev"

# Or manually press Ctrl+C in all terminals
```

### 2. Clear Next.js Cache

```bash
rm -rf .next
```

### 3. Verify .env.local

```bash
# Check file exists
ls -la .env.local

# Check token is there
cat .env.local | grep MAPBOX
```

### 4. Start Fresh

```bash
pnpm dev
```

### 5. Open New Browser Tab

```bash
# Don't just refresh! Open completely new tab:
http://localhost:3000/dashboard
```

### 6. Check Console

Press F12 → Console

**Should see**:
```
Mapbox Token Status: Present ✅
```

---

## If It STILL Doesn't Work...

### Nuclear Option: Inline the Token (Temporary Test)

**ONLY FOR TESTING - NOT FOR PRODUCTION**

Edit `components/dashboard/GlobalEventMap.tsx`:

```typescript
// Line 35 - temporarily hardcode token
const mapboxToken = 'pk.eyJ1IjoiamN29rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg'
// const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN // Comment this out
```

**Restart dev server and test**

**If map now works**:
- ✅ Token is valid
- ❌ Environment variable loading is broken

**If map still doesn't work**:
- ❌ Different issue (API key, imports, etc.)

**IMPORTANT**: Remove hardcoded token after testing!

---

## Alternative: Use Railway Run

If `.env.local` isn't working, use Railway's environment:

```bash
railway run pnpm dev
```

**This will**:
- Use Railway environment variables
- Load `NEXT_PUBLIC_MAPBOX_TOKEN` from Railway
- Bypass `.env.local` issues

---

## Checklist: Have You Done All These?

- [ ] Token is in `.env.local` (line 44)
- [ ] Token starts with `pk.` (not `sk.`)
- [ ] Variable name is exactly `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] No spaces around `=` sign
- [ ] Dev server was completely stopped
- [ ] Ran `rm -rf .next` to clear cache
- [ ] Started dev server with `pnpm dev`
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked browser console for "Token Status"
- [ ] Opened completely new browser tab

---

## Expected Timeline

1. **Add token to `.env.local`** → 30 seconds
2. **Stop server (Ctrl+C)** → 2 seconds  
3. **Clear cache (`rm -rf .next`)** → 5 seconds
4. **Start server (`pnpm dev`)** → 30 seconds
5. **Hard refresh browser** → 2 seconds

**Total**: ~70 seconds (about 1 minute)

---

## Debug Output

After restarting, you should see in **browser console**:

```
Mapbox Token Status: Present ✅
```

And on the dashboard, instead of:
```
┌─────────────────────────┐
│ 📍 Mapbox Token Missing │
└─────────────────────────┘
```

You should see:
```
┌─────────────────────────┐
│ 🗺️ [Interactive Map]   │
│ [Real Mapbox Tiles]    │
└─────────────────────────┘
```

---

## Still Having Issues?

### Quick Diagnostic

Run this in your terminal:

```bash
echo "=== Environment Check ==="
echo "1. .env.local exists:"
ls -la .env.local
echo ""
echo "2. MAPBOX token present:"
grep MAPBOX .env.local | sed 's/\(pk\..\{10\}\).*/\1.../'
echo ""
echo "3. Node environment:"
echo $NODE_ENV
echo ""
echo "4. Next.js process:"
ps aux | grep "next dev" | grep -v grep
```

**Share this output if you need more help!**

---

## Summary

**Most Common Fix**: Restart dev server after adding token to `.env.local`

```bash
# 1. Stop server (Ctrl+C)
# 2. Clear cache
rm -rf .next
# 3. Start fresh
pnpm dev
# 4. Hard refresh browser (Ctrl+Shift+R)
```

**Your specific case**:
- ✅ Token is in `.env.local` (verified)
- ✅ Token format is correct
- ⏳ **Just need to restart dev server!**

**Try it now!** 🚀
