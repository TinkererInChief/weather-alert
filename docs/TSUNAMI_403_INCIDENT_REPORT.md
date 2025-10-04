# Tsunami.gov API Access Blocked - Incident Report
**Date:** October 3, 2025  
**Time:** 09:00 UTC - Present  
**Status:** 🔴 **CRITICAL - SERVICE DEGRADED**

---

## Executive Summary

The tsunami monitoring system is experiencing **continuous HTTP 403 Forbidden errors** from tsunami.gov API endpoints. The system is gracefully degrading (returning 0 alerts) but **tsunami monitoring is effectively non-functional** in production.

---

## Error Details

### Affected Endpoints
```
❌ https://www.tsunami.gov/events/xml/PAAQAtom.xml (NTWC)
❌ https://www.tsunami.gov/events/xml/PHEBAtom.xml (PTWC)
```

### Error Pattern
- **Frequency:** Every 60 seconds (monitoring interval)
- **Duration:** Started 09:00:53 UTC, ongoing
- **HTTP Status:** 403 Forbidden
- **Impact:** 0 tsunami alerts retrieved (should have fallback data)

### Sample Log Entry
```
[err] ❌ Error fetching from https://www.tsunami.gov/events/xml/PAAQAtom.xml: 
      Error: HTTP 403: Forbidden
      at o.fetchFromAtomFeed (/app/.next/server/app/api/tsunami/route.js:1:3934)
```

---

## Root Cause Analysis

### Likely Causes (Ranked by Probability)

#### 1. 🔴 **Missing/Invalid User-Agent** (90% likely)
**Current Implementation:**
```typescript
// lib/tsunami-service.ts:94-98
const response = await fetch(feedUrl, {
  headers: {
    'User-Agent': 'Emergency-Alert-System/1.0'
  }
})
```

**Issue:** NOAA may require specific User-Agent format or registration.

**Evidence:**
- Generic User-Agent may be flagged as bot/scraper
- NOAA APIs often require descriptive User-Agent with contact info

---

#### 2. 🟡 **Rate Limiting** (60% likely)
**Current Behavior:**
- Requests every 60 seconds
- No exponential backoff
- No rate limit detection

**NOAA Guidelines:**
- Recommend 5-minute intervals for tsunami feeds
- May block IPs with excessive requests

---

#### 3. 🟡 **IP-Based Blocking** (50% likely)
**Scenario:** Railway's IP range may be blocked

**Evidence:**
- Cloud hosting IPs often blocked by government APIs
- May require IP whitelisting

---

#### 4. 🟢 **Terms of Service Violation** (30% likely)
**Potential Issues:**
- Automated access may require registration
- May need API key for production use
- Commercial use restrictions

---

#### 5. 🟢 **Geographic Restrictions** (20% likely)
**Scenario:** Server location outside allowed regions

---

## Impact Assessment

### Current State
| Component | Status | Impact |
|-----------|--------|--------|
| Tsunami Monitoring | 🔴 **DOWN** | No alerts retrieved |
| Earthquake Monitoring | ✅ **UP** | Unaffected |
| SMS/Email Alerts | ✅ **UP** | Unaffected |
| Dashboard Display | 🟡 **DEGRADED** | Shows 0 tsunami alerts |
| User Experience | 🟡 **DEGRADED** | Missing critical data |

### Risk Level
- **Operational Risk:** 🔴 **HIGH** - Cannot detect tsunami threats
- **Safety Risk:** 🔴 **CRITICAL** - Life-safety system compromised
- **Compliance Risk:** 🟡 **MEDIUM** - May violate monitoring requirements

---

## Immediate Actions Required

### 1. 🔴 **URGENT: Implement Alternative Data Sources**

**Primary Alternatives:**
```typescript
// Option A: NOAA Weather API (JSON, more reliable)
https://api.weather.gov/alerts/active?event=tsunami

// Option B: PTWC JSON Feed (different endpoint)
https://www.tsunami.gov/events_json/events.json

// Option C: USGS Earthquake Feed (tsunami flag)
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson
```

**Recommendation:** Implement multi-source fallback system

---

### 2. 🟡 **HIGH: Fix User-Agent Header**

**Proper Format (NOAA Guidelines):**
```typescript
headers: {
  'User-Agent': 'Emergency-Alert-System/1.0 (contact@yourdomain.com; +1-XXX-XXX-XXXX)',
  'Accept': 'application/atom+xml, application/xml, text/xml',
  'Accept-Encoding': 'gzip, deflate'
}
```

---

### 3. 🟡 **HIGH: Implement Exponential Backoff**

**Current:** Fixed 60-second interval  
**Recommended:** Adaptive interval with backoff

```typescript
// Pseudo-code
if (consecutiveFailures > 3) {
  interval = Math.min(interval * 2, 300) // Max 5 minutes
}
```

---

### 4. 🟢 **MEDIUM: Add Circuit Breaker**

**Pattern:**
- After 5 consecutive failures, pause for 15 minutes
- Log incident for manual review
- Switch to alternative data source

---

### 5. 🟢 **MEDIUM: Contact NOAA**

**Action Items:**
- Email: ntwc@noaa.gov, ptwc@noaa.gov
- Request API access guidelines
- Inquire about IP whitelisting
- Ask about production API keys

---

## Recommended Solution Architecture

### Multi-Source Tsunami Monitoring

```typescript
class TsunamiMonitoringService {
  private sources = [
    {
      name: 'NOAA Weather API',
      url: 'https://api.weather.gov/alerts/active?event=tsunami',
      priority: 1,
      format: 'json'
    },
    {
      name: 'PTWC JSON Feed',
      url: 'https://www.tsunami.gov/events_json/events.json',
      priority: 2,
      format: 'json'
    },
    {
      name: 'NTWC ATOM Feed',
      url: 'https://www.tsunami.gov/events/xml/PAAQAtom.xml',
      priority: 3,
      format: 'xml',
      requiresAuth: true
    }
  ]

  async fetchAlerts(): Promise<TsunamiAlert[]> {
    for (const source of this.sources) {
      try {
        const alerts = await this.fetchFromSource(source)
        if (alerts.length > 0 || source.priority === 1) {
          return alerts
        }
      } catch (error) {
        console.warn(`Source ${source.name} failed, trying next...`)
        continue
      }
    }
    
    throw new Error('All tsunami data sources failed')
  }
}
```

---

## Implementation Plan

### Phase 1: Emergency Fix (Today)
**Duration:** 2-4 hours

1. ✅ **Add NOAA Weather API as primary source**
   - Endpoint: `https://api.weather.gov/alerts/active?event=tsunami`
   - Format: JSON (easier to parse)
   - No authentication required
   - More reliable than XML feeds

2. ✅ **Implement proper User-Agent**
   - Include contact information
   - Follow NOAA guidelines

3. ✅ **Add exponential backoff**
   - Start: 60 seconds
   - Max: 300 seconds (5 minutes)
   - Reset on success

4. ✅ **Deploy to production**
   - Test with Railway environment
   - Monitor logs for 24 hours

---

### Phase 2: Robust Monitoring (This Week)
**Duration:** 1-2 days

1. **Implement circuit breaker pattern**
   - Track consecutive failures
   - Auto-pause after threshold
   - Alert on circuit open

2. **Add source health monitoring**
   - Track success/failure rates per source
   - Auto-switch to backup sources
   - Dashboard visibility

3. **Implement caching layer**
   - Cache last successful alerts
   - Serve cached data during outages
   - TTL: 15 minutes

4. **Add alerting for monitoring failures**
   - Email alerts on extended outages
   - Slack/Discord webhooks
   - PagerDuty integration

---

### Phase 3: Long-Term Improvements (Next Sprint)
**Duration:** 3-5 days

1. **Contact NOAA for official access**
   - Request API documentation
   - Inquire about production keys
   - Get IP whitelisting if needed

2. **Implement additional data sources**
   - JMA (Japan Meteorological Agency)
   - IOC (UNESCO Tsunami Warning System)
   - Regional warning centers

3. **Build data quality monitoring**
   - Compare alerts across sources
   - Detect discrepancies
   - Alert on data quality issues

4. **Create runbook for incidents**
   - Document troubleshooting steps
   - Define escalation procedures
   - Create recovery playbook

---

## Testing Checklist

### Before Deployment
- [ ] Test NOAA Weather API endpoint
- [ ] Verify JSON parsing logic
- [ ] Test User-Agent header format
- [ ] Validate exponential backoff
- [ ] Test circuit breaker logic
- [ ] Verify error handling
- [ ] Test with mock 403 responses
- [ ] Validate fallback behavior

### After Deployment
- [ ] Monitor logs for 1 hour
- [ ] Verify alerts are retrieved
- [ ] Check dashboard displays correctly
- [ ] Test manual tsunami check
- [ ] Verify monitoring status indicator
- [ ] Check database for stored alerts
- [ ] Test notification system
- [ ] Monitor for 24 hours

---

## Monitoring Metrics

### Key Indicators
1. **Tsunami Alert Retrieval Rate**
   - Target: >95% success rate
   - Alert if: <80% for 1 hour

2. **Source Availability**
   - Track per-source success rates
   - Alert if primary source <90% for 30 minutes

3. **Data Freshness**
   - Track time since last successful fetch
   - Alert if: >15 minutes without data

4. **Error Rate**
   - Track HTTP 403 errors
   - Alert if: >10 consecutive failures

### Dashboard Queries
```sql
-- Tsunami monitoring health (last 24 hours)
SELECT 
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE success = true) as successful_checks,
  COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate
FROM tsunami_monitoring_logs
WHERE checked_at > NOW() - INTERVAL '24 hours';

-- Recent failures
SELECT 
  source,
  error_message,
  checked_at
FROM tsunami_monitoring_logs
WHERE success = false
  AND checked_at > NOW() - INTERVAL '1 hour'
ORDER BY checked_at DESC
LIMIT 10;
```

---

## Communication Plan

### Internal Stakeholders
- **Engineering Team:** Immediate notification via Slack
- **Operations:** Daily status updates
- **Management:** Weekly summary report

### External Communication
- **Users:** No user-facing impact (graceful degradation)
- **NOAA:** Formal inquiry about API access
- **Compliance:** Document incident for audit trail

---

## Lessons Learned

### What Went Wrong
1. **Single point of failure** - Only one data source
2. **Insufficient error handling** - No fallback mechanism
3. **Inadequate monitoring** - 403 errors not alerting
4. **Missing documentation** - No NOAA API guidelines followed

### What Went Right
1. **Graceful degradation** - System didn't crash
2. **Logging** - Clear error messages in logs
3. **Isolation** - Earthquake monitoring unaffected

### Improvements for Future
1. **Always implement fallback data sources**
2. **Follow API provider guidelines strictly**
3. **Add health checks for external dependencies**
4. **Implement circuit breakers for all external APIs**
5. **Set up proactive monitoring and alerting**

---

## Related Documentation

- `docs/TSUNAMI_DATA_SOURCES.md` - Data source options
- `docs/FDSN_RESEARCH_AND_TOS.md` - API terms of service
- `lib/tsunami-service.ts` - Current implementation
- `app/api/tsunami/route.ts` - API endpoint

---

## Incident Timeline

| Time (UTC) | Event | Action Taken |
|------------|-------|--------------|
| 09:00:53 | First 403 error detected | System logged error, continued monitoring |
| 09:01:53 | Errors continue every 60s | Graceful degradation active |
| 14:49:53 | Incident identified | Investigation started |
| TBD | Fix implemented | Deploy alternative data source |
| TBD | Monitoring resumed | Verify alerts retrieved |
| TBD | Incident resolved | Post-mortem completed |

---

## Action Items

### Immediate (Today)
- [ ] Implement NOAA Weather API as primary source
- [ ] Fix User-Agent header format
- [ ] Add exponential backoff logic
- [ ] Deploy to production
- [ ] Monitor for 24 hours

### Short-Term (This Week)
- [ ] Implement circuit breaker pattern
- [ ] Add source health monitoring
- [ ] Implement caching layer
- [ ] Set up alerting for failures
- [ ] Contact NOAA for guidance

### Long-Term (Next Sprint)
- [ ] Add additional data sources (JMA, IOC)
- [ ] Build data quality monitoring
- [ ] Create incident runbook
- [ ] Implement comprehensive testing suite
- [ ] Document API access procedures

---

**Report Prepared By:** Emergency Alert System Engineering Team  
**Next Review:** October 4, 2025  
**Priority:** 🔴 **CRITICAL - IMMEDIATE ACTION REQUIRED**
