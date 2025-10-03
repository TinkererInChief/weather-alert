# OTP Security Audit Report
**Date:** October 3, 2025  
**Time:** 12:17 IST (06:47 UTC)  
**Incident:** Multiple OTP authentication failures in production

---

## Executive Summary

**Incident Type:** Mass OTP Verification Failures  
**Status:** ⚠️ **CRITICAL BUG IDENTIFIED**  
**Impact:** User login failures, potential brute-force attempt  
**Root Cause:** Logic error in OTP verification error handling

---

## 🚨 Critical Bug Identified

### Issue: Error Throw After Successful OTP Match

**Location:** `lib/auth.ts:134-199` (NextAuth `authorize` callback)

**Problem:**
```typescript
async authorize(credentials) {
  try {
    const otpResult = await otpService.verifyOtp({
      phone: credentials.phone,
      code: credentials.code
    })
    // ... user creation logic ...
    return userResult
  } catch (error) {
    console.error('OTP authentication failed:', error)
    return null  // ❌ This masks the actual error
  }
}
```

**Impact:**
- When `otpService.verifyOtp()` throws an error, NextAuth receives `null`
- NextAuth then generates a **generic error message**, not the specific OTP error
- This results in confusing error messages shown to users
- Users see "CredentialsSignin" errors instead of specific OTP errors

---

## Analysis of Production Logs

### Timeline (UTC)
```
06:46:59 - User requests OTP (successful, code dispatched)
06:47:09 - First attempt: "Incorrect code"
06:47:10 - Second attempt: "Incorrect code"  
06:47:12 - Third attempt: "Incorrect code"
06:47:12 - Fourth attempt: "Too many incorrect attempts"
06:47:13+ - Multiple attempts: "Enter the most recent code"
```

### Error Pattern Analysis

#### 1. ✅ Rate Limiting Works Correctly
- After 3 incorrect attempts, system triggered: `"Too many incorrect attempts. Request a new code."`
- This matches `OTP_MAX_ATTEMPTS` configuration (default: 5, appears to be 3 in prod)
- Rate limiting prevented unlimited brute-force attempts

#### 2. ✅ Attempt Tracking Works
- System correctly incremented attempt counter on `sms_otps` table
- After max attempts, OTP was consumed (marked with `consumedAt`)
- Subsequent attempts correctly showed: `"Enter the most recent code"`

#### 3. ⚠️ Potential User Experience Issue
The user had to request a **new OTP** but continued trying the old code, leading to:
- 30+ failed attempts with "Enter the most recent code" error
- This suggests the old code was stale/expired

---

## Security Assessment

### 1. ✅ OTP Verification Logic (SECURE)

**File:** `lib/services/otp-service.ts:128-182`

**Strengths:**
- ✅ Phone number normalization to E.164 format
- ✅ SHA-256 hashing of OTP codes (with secret salt)
- ✅ Progressive lockout after max attempts
- ✅ OTP consumption on successful verification
- ✅ Checks for expired OTPs (`expires > now()`)
- ✅ Retrieves only recent 3 OTPs to handle race conditions
- ✅ Increments attempt counter only on latest OTP

**Code Review:**
```typescript
// Line 134-142: Fetches only valid, unconsumed OTPs
const recentOtps = await prisma.smsOtp.findMany({
  where: {
    phone: formattedPhone,
    consumedAt: null,          // ✅ Not consumed
    expires: { gt: new Date() } // ✅ Not expired
  },
  orderBy: { createdAt: 'desc' },
  take: 3
})

// Line 144-146: Empty result = no valid OTP
if (recentOtps.length === 0) {
  throw new Error('Enter the most recent code we sent to your phone.')
}

// Line 149-156: Rate limiting check
const latest = recentOtps[0]
if (latest.attempts >= this.otpMaxAttempts) {
  await prisma.smsOtp.update({
    where: { id: latest.id },
    data: { consumedAt: new Date() }
  })
  throw new Error('Too many incorrect attempts. Request a new code.')
}

// Line 158-169: Attempt matching OTP
const tokenHash = this.hashToken(formattedPhone, params.code.trim())
const matching = recentOtps.find((r) => r.tokenHash === tokenHash)

if (!matching) {
  // Increment attempt counter
  await prisma.smsOtp.update({
    where: { id: latest.id },
    data: { attempts: { increment: 1 } }
  })
  throw new Error('Incorrect code. Check your SMS inbox and try again.')
}
```

**Verdict:** ✅ **SECURE** - Logic is sound, handles edge cases correctly

---

### 2. ✅ Rate Limiting (WORKING)

**File:** `app/api/auth/otp/verify/route.ts:41-72`

**Configuration:**
- IP-based rate limiting
- Phone-based rate limiting  
- Exponential backoff on failures
- Account lockout after 10 failures

**Strengths:**
- ✅ Dual-layer protection (IP + phone)
- ✅ `otpFailureTracker` records failures in Redis
- ✅ Returns HTTP 429 with `retryAfter` seconds
- ✅ Clears failures on successful verification

**Verdict:** ✅ **WORKING AS DESIGNED**

---

### 3. ⚠️ OTP Delivery (CHECK REQUIRED)

**File:** `lib/services/otp-service.ts:81-126`

**Observation from logs:**
```
[inf] SMS sent successfully
[inf] 📲 OTP code dispatched via SMS { phone: '+18646592474', masked: '•••2474' }
```

✅ SMS was sent successfully via Twilio

**Potential Issues:**
1. **SMS Delivery Delays:** User may have received code late
2. **Wrong Phone Number:** User may have entered wrong number
3. **SMS Provider Issues:** Twilio delivery issues (rare but possible)

**Recommendation:** Add SMS delivery webhook tracking to monitor delivery status

---

### 4. 🚨 Error Handling (BUG IDENTIFIED)

**File:** `lib/auth.ts:194-199`

**Current Implementation:**
```typescript
} catch (error) {
  console.error('OTP authentication failed:', error)
  return null  // ❌ Loses error context
}
```

**Problem:**
- NextAuth's `authorize` callback returns `null` on error
- NextAuth generates **generic error** instead of specific OTP error
- Users don't see the actual OTP validation error message
- Results in poor UX (user doesn't know why login failed)

**Example Flow:**
1. User enters expired code
2. `otpService.verifyOtp()` throws: `"Enter the most recent code we sent to your phone."`
3. NextAuth `authorize` catches error, returns `null`
4. NextAuth shows: `"Sign in failed. Check the details you provided are correct."`
5. User is confused ❌

---

## Brute-Force Analysis

### Attack Indicators

| Indicator | Present? | Assessment |
|-----------|----------|------------|
| High-frequency requests | ✅ Yes (30+ in 1 min) | Could be legitimate user |
| Multiple phone numbers | ❌ No (single number) | Not mass attack |
| Distributed IPs | ❌ No (same IP) | Not botnet |
| Pattern variance | ❌ No (predictable) | Likely legitimate user |
| Rate limit triggered | ✅ Yes | Security working |

### Verdict: ⚠️ **LIKELY NOT A BRUTE-FORCE ATTACK**

**Reasoning:**
1. Single phone number (+18646592474)
2. Single IP address
3. Predictable human-like timing
4. User appeared to be trying old/stale code repeatedly
5. Rate limiting successfully blocked excessive attempts

**Likely Scenario:**
- User requested OTP
- User entered code incorrectly 3 times
- System locked them out
- User continued trying **old code** instead of requesting new one
- This created the flood of "Enter the most recent code" errors

---

## Recommendations

### 🔴 Critical (Fix Immediately)

#### 1. Fix Error Handling in NextAuth

**Problem:** Errors from `otpService.verifyOtp()` are masked

**Solution:** Rethrow errors with proper error messages

```typescript
// File: lib/auth.ts (line 134)
async authorize(credentials) {
  if (!credentials?.phone || !credentials?.code) {
    throw new Error('Phone number and verification code are required')
  }

  try {
    const otpResult = await otpService.verifyOtp({
      phone: credentials.phone,
      code: credentials.code
    })

    // ... rest of user creation logic ...
    
    return userResult
  } catch (error) {
    console.error('OTP authentication failed:', error)
    
    // ✅ FIX: Rethrow with original error message
    if (error instanceof Error) {
      throw error  // Preserve specific error message
    }
    throw new Error('OTP verification failed. Please try again.')
  }
}
```

**Impact:**
- Users will see **specific error messages**:
  - "Incorrect code. Check your SMS inbox and try again."
  - "Too many incorrect attempts. Request a new code."
  - "Enter the most recent code we sent to your phone."
- Improved UX and debugging

---

### 🟡 High Priority (Fix This Week)

#### 2. Add Frontend OTP State Management

**Problem:** Users don't know they need a new OTP after lockout

**Solution:** Add frontend logic to detect lockout and prompt for new code

```typescript
// File: app/login/page.tsx (OTP verification form)

if (error.message.includes('Too many incorrect attempts')) {
  // Clear the code input
  setCode('')
  // Show "Request New Code" button prominently
  setShowResendButton(true)
  setError('You\'ve used too many attempts. Please request a new code.')
}

if (error.message.includes('Enter the most recent code')) {
  setError('This code has expired. Please request a new code.')
  setShowResendButton(true)
}
```

#### 3. Add OTP Delivery Tracking

**Enhancement:** Track SMS delivery status via Twilio webhooks

```typescript
// File: lib/sms-service.ts

async sendSMS(phone: string, message: string) {
  const result = await this.twilioClient.messages.create({
    to: phone,
    from: this.twilioNumber,
    body: message,
    statusCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/sms-status`,
    // Track: queued, sent, delivered, failed, undelivered
  })
  
  // Store delivery SID for tracking
  await prisma.smsDelivery.create({
    data: {
      phone,
      messageSid: result.sid,
      status: 'queued',
      sentAt: new Date()
    }
  })
}
```

#### 4. Improve Error Logging

**Enhancement:** Add structured logging with context

```typescript
// File: lib/auth.ts (line 195)

console.error('OTP authentication failed:', {
  error: error instanceof Error ? error.message : 'Unknown error',
  phone: credentials.phone?.slice(-4), // Only last 4 digits
  timestamp: new Date().toISOString(),
  errorType: error.constructor.name,
  stack: error instanceof Error ? error.stack : undefined
})
```

---

### 🟢 Medium Priority (Fix Next Sprint)

#### 5. Add OTP Request Cooldown

**Enhancement:** Prevent OTP request spam

```typescript
// File: lib/services/otp-service.ts

async sendOtp(params: { phone: string }) {
  // Check if user requested OTP too recently
  const recentOtp = await prisma.smsOtp.findFirst({
    where: {
      phone: formattedPhone,
      createdAt: { gt: new Date(Date.now() - 60000) } // Within last 60 seconds
    }
  })
  
  if (recentOtp) {
    throw new Error('Please wait 60 seconds before requesting a new code.')
  }
  
  // ... rest of send logic
}
```

#### 6. Add User-Facing Attempt Counter

**Enhancement:** Show remaining attempts to user

```typescript
// Return remaining attempts in error response
if (!matching) {
  const remainingAttempts = this.otpMaxAttempts - latest.attempts - 1
  await prisma.smsOtp.update({
    where: { id: latest.id },
    data: { attempts: { increment: 1 } }
  })
  throw new Error(
    `Incorrect code. You have ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
  )
}
```

---

## Configuration Review

### Current Production Config

| Setting | Value | Secure? | Recommendation |
|---------|-------|---------|----------------|
| `OTP_LENGTH` | 6 | ✅ Yes | Keep at 6 (industry standard) |
| `OTP_EXPIRY_MINUTES` | 5-10 | ✅ Yes | 5 minutes is secure |
| `OTP_MAX_ATTEMPTS` | 3-5 | ✅ Yes | 3 is good for security |
| `OTP_SECRET` | Set | ✅ Yes | Ensure strong random value |

### Recommended Updates

```env
# More strict limits for production
OTP_MAX_ATTEMPTS=3
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# Add new settings
OTP_REQUEST_COOLDOWN_SECONDS=60
OTP_ACCOUNT_LOCKOUT_MINUTES=15
```

---

## Testing Checklist

### Manual Testing

- [ ] Test with correct OTP code
- [ ] Test with incorrect OTP code (3 attempts)
- [ ] Test with expired OTP code
- [ ] Test with already-used OTP code
- [ ] Test requesting new OTP after lockout
- [ ] Test rate limiting (IP and phone)
- [ ] Verify error messages are user-friendly
- [ ] Check SMS delivery logs in Twilio

### Automated Testing

```typescript
// File: tests/otp-security.test.ts

describe('OTP Security', () => {
  it('should lock account after max attempts', async () => {
    const phone = '+1234567890'
    await otpService.sendOtp({ phone })
    
    // Make max attempts with wrong code
    for (let i = 0; i < 3; i++) {
      await expect(
        otpService.verifyOtp({ phone, code: '000000' })
      ).rejects.toThrow('Incorrect code')
    }
    
    // Next attempt should trigger lockout
    await expect(
      otpService.verifyOtp({ phone, code: '000000' })
    ).rejects.toThrow('Too many incorrect attempts')
  })
  
  it('should reject expired OTP', async () => {
    // Test implementation
  })
  
  it('should reject already-used OTP', async () => {
    // Test implementation
  })
})
```

---

## Monitoring Recommendations

### Metrics to Track

1. **OTP Success Rate**
   - Target: >95% success rate on first attempt
   - Alert if: <90% for 5 minutes

2. **Failed OTP Attempts**
   - Target: <10% of all attempts
   - Alert if: >20% for 5 minutes

3. **Account Lockouts**
   - Track: Number of lockouts per hour
   - Alert if: >10 in 1 hour (potential attack)

4. **SMS Delivery Failures**
   - Target: <1% failure rate
   - Alert if: >5% for 5 minutes

### Dashboard Queries

```sql
-- OTP Success Rate (last 24 hours)
SELECT 
  COUNT(*) FILTER (WHERE consumed_at IS NOT NULL) * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_otps
FROM sms_otps 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Failed Attempts by Phone
SELECT 
  phone,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM sms_otps
WHERE consumed_at IS NULL 
  AND attempts >= 3
GROUP BY phone
ORDER BY failed_attempts DESC
LIMIT 10;
```

---

## Incident Response Checklist

If similar incident occurs:

1. ✅ Check production logs for error patterns
2. ✅ Verify rate limiting is working
3. ✅ Check Twilio SMS delivery logs
4. ✅ Review database for suspicious patterns
5. ✅ Check if user is locked out (clear Redis cache if needed)
6. ✅ Monitor for distributed attack (multiple IPs/phones)
7. ✅ Review recent code deployments
8. ✅ Check environment variables are set correctly

---

## Conclusion

### Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| OTP Verification Logic | ✅ Secure | None |
| Rate Limiting | ✅ Working | None |
| OTP Delivery | ✅ Working | Add webhook tracking |
| Error Handling | 🚨 **BUG** | **Fix immediately** |
| User Experience | ⚠️ Poor | Improve feedback |
| Monitoring | ⚠️ Basic | Add detailed metrics |

### Next Steps

1. **Immediate (Today):**
   - Fix error handling in `lib/auth.ts` to preserve specific error messages
   - Deploy fix to production
   - Test login flow thoroughly

2. **This Week:**
   - Add frontend OTP state management
   - Implement SMS delivery tracking
   - Improve error logging with context

3. **Next Sprint:**
   - Add OTP request cooldown
   - Add user-facing attempt counter
   - Create monitoring dashboard

---

**Report Prepared By:** Emergency Alert System Security Team  
**Review Status:** Pending Implementation  
**Priority:** 🔴 **CRITICAL - ACTION REQUIRED**
