# JMA Wolfx API Analysis for Commercial Use

## Executive Summary

**API Found**: ✅ Wolfx Open API provides JMA earthquake data  
**URL**: `https://api.wolfx.jp/jma_eqlist.json`  
**Commercial Use**: ⚠️ **RESTRICTED - Not allowed for commercial applications**

---

## API Overview

### Wolfx Open API
- **Provider**: Wolfx Project (nonprofit initiative)
- **Documentation**: https://wolfx.jp/apidoc_en
- **Terms of Service**: https://wolfx.jp/tos_en
- **Status**: ✅ Active and operational

### Available Endpoints

1. **JMA Earthquake Information** (Latest 50 events)
   - HTTP: `https://api.wolfx.jp/jma_eqlist.json`
   - WebSocket: `wss://ws-api.wolfx.jp/jma_eqlist`

2. **JMA Earthquake Early Warning** (Real-time)
   - HTTP: `https://api.wolfx.jp/jma_eew.json`
   - WebSocket: `wss://ws-api.wolfx.jp/jma_eew`

---

## Sample Data

### API Response Format

```json
{
  "No1": {
    "Title": "震源・震度情報",
    "EventID": "20251002104823",
    "time": "2025/10/02 10:48",
    "time_full": "2025/10/02 10:48:23",
    "location": "トカラ列島近海",
    "magnitude": "2.3",
    "shindo": "1",
    "depth": "20km",
    "latitude": "29.5",
    "longitude": "129.5",
    "info": "この地震による津波の心配はありません。"
  },
  "No2": {
    "Title": "震源・震度情報",
    "EventID": "20251002090902",
    "time": "2025/10/02 09:09",
    "time_full": "2025/10/02 09:09:02",
    "location": "岩手県内陸北部",
    "magnitude": "3.0",
    "shindo": "1",
    "depth": "10km",
    "latitude": "39.9",
    "longitude": "140.9",
    "info": ""
  }
}
```

### Data Fields

| Field | Description | Example |
|-------|-------------|---------|
| `Title` | Event type (Japanese) | "震源・震度情報" |
| `EventID` | Unique event ID | "20251002104823" |
| `time` | Event time (short) | "2025/10/02 10:48" |
| `time_full` | Event time (full) | "2025/10/02 10:48:23" |
| `location` | Location (Japanese) | "トカラ列島近海" |
| `magnitude` | Magnitude | "2.3" |
| `shindo` | JMA seismic intensity | "1" |
| `depth` | Depth | "20km" |
| `latitude` | Latitude | "29.5" |
| `longitude` | Longitude | "129.5" |
| `info` | Additional info (Japanese) | "この地震による津波の心配はありません。" |

---

## Terms of Service Analysis

### Section 3: Usage License and Restrictions

#### ✅ **Allowed**:
- Free access to all services
- No cost for API usage
- Real-time earthquake monitoring

#### ❌ **PROHIBITED**:
1. **Redistributing or proxying any content in any form**
   - This includes using the API in a commercial application
   - Cannot redistribute the data to end users
   - Cannot proxy the API through your service

2. Malicious access or excessive connections
3. Illegal activities
4. Bypassing security mechanisms

---

## Commercial Use Assessment

### Question: Can we use this for commercial applications?

**Answer**: ❌ **NO - Not allowed**

### Specific TOS Violation

**Section 3 - Prohibited Actions**:
> "Redistributing or proxying any content of the Project in any form is prohibited."

**What this means**:
- ❌ Cannot use in commercial SaaS application
- ❌ Cannot redistribute data to customers
- ❌ Cannot proxy API through our service
- ❌ Cannot integrate into paid product

### Why Our Use Case Violates TOS

Our emergency alert system:
1. **Fetches data from Wolfx API** ✓ (allowed)
2. **Stores data in our database** ⚠️ (redistribution)
3. **Serves data to our users** ❌ (prohibited redistribution)
4. **Sends alerts to customers** ❌ (prohibited redistribution)
5. **Commercial application** ❌ (prohibited)

**Result**: Our use case violates the "no redistribution" clause.

---

## Legal Risk Assessment

### Risk Level: 🔴 **HIGH**

**Risks**:
1. **TOS Violation**: Clear violation of redistribution clause
2. **Service Termination**: Wolfx can terminate access at any time
3. **Legal Action**: Potential copyright infringement claims
4. **Reputation Damage**: Using services against TOS

### Consequences

**If we use this API**:
- ⚠️ Wolfx can block our IP/access
- ⚠️ Potential legal action for TOS violation
- ⚠️ Service disruption to our customers
- ⚠️ Reputation damage

---

## Alternatives for JMA Data

### Option 1: Direct JMA Sources (Recommended)

**JMA Official Website**:
- URL: https://www.jma.go.jp/
- Status: No public API (HTML only)
- Language: Japanese
- Cost: Free but no API

**Pros**:
- ✅ Official source
- ✅ Most accurate
- ✅ Free

**Cons**:
- ❌ No JSON API
- ❌ Requires web scraping
- ❌ Japanese language
- ❌ Fragile (HTML changes)

---

### Option 2: USGS for Japan Coverage (Current)

**USGS Earthquake API**:
- URL: https://earthquake.usgs.gov/
- Coverage: Global including Japan
- Magnitude: M4.0+ (detailed)

**Pros**:
- ✅ Already integrated
- ✅ Free for commercial use
- ✅ Reliable API
- ✅ English language
- ✅ No TOS restrictions

**Cons**:
- ⚠️ Slightly delayed vs JMA
- ⚠️ Missing small events (M<4.0)
- ⚠️ Not as detailed for Japan

---

### Option 3: FDSN Web Services

**Hi-net (Japan)**:
- URL: https://hinetwww11.bosai.go.jp/
- FDSN endpoint: May exist
- Status: Need to verify

**Pros**:
- ✅ Official Japanese source
- ✅ Standard FDSN format
- ✅ May allow commercial use

**Cons**:
- ⚠️ May require authentication
- ⚠️ Need to verify TOS
- ⚠️ Unknown availability

---

### Option 4: Commercial API Services

**Earthquake API Providers**:
- Various commercial providers
- Aggregate data from multiple sources
- Licensed for commercial use

**Pros**:
- ✅ Licensed for commercial use
- ✅ Reliable API
- ✅ Support included

**Cons**:
- ❌ Monthly fees
- ❌ Additional cost
- ❌ May not include JMA

---

## Recommendation

### ❌ **DO NOT USE Wolfx API**

**Reasons**:
1. ❌ Violates TOS (redistribution prohibited)
2. ❌ High legal risk
3. ❌ Not licensed for commercial use
4. ❌ Service can be terminated anytime
5. ❌ Reputation risk

### ✅ **CONTINUE WITH CURRENT SETUP**

**Current Sources**:
- ✅ USGS (global, including Japan)
- ✅ EMSC (Europe, some Japan coverage)

**Benefits**:
- ✅ Licensed for commercial use
- ✅ Reliable and stable
- ✅ Good Japan coverage (M4.0+)
- ✅ No legal risks
- ✅ Already integrated

### 🔄 **FUTURE: Research FDSN Options**

**Action Items**:
1. Research Hi-net FDSN endpoint
2. Verify commercial use permissions
3. Check authentication requirements
4. Test data quality and coverage

---

## Wolfx API Technical Assessment

### If TOS Allowed Commercial Use (Hypothetical)

**Technical Quality**: ⭐⭐⭐⭐⭐ (Excellent)

**Pros**:
- ✅ Real JMA data (most accurate for Japan)
- ✅ JSON format (easy to parse)
- ✅ 50 most recent events
- ✅ Real-time updates
- ✅ WebSocket support
- ✅ Includes JMA intensity (shindo)
- ✅ Tsunami information
- ✅ Free API

**Cons**:
- ⚠️ Japanese language (requires translation)
- ⚠️ Nonprofit project (sustainability concern)
- ⚠️ No SLA guarantee
- ⚠️ Single point of failure

**Coverage**:
- Japan: ⭐⭐⭐⭐⭐ (Excellent, all magnitudes)
- Western Pacific: ⭐⭐⭐⭐ (Good)
- Global: ⭐⭐ (Limited to major events)

---

## Comparison Matrix

| Feature | Wolfx API | USGS | EMSC | Hi-net FDSN |
|---------|-----------|------|------|-------------|
| **Commercial Use** | ❌ No | ✅ Yes | ✅ Yes | ❓ Unknown |
| **Japan Coverage** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **API Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❓ |
| **Reliability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❓ |
| **Cost** | Free | Free | Free | ❓ |
| **Legal Risk** | 🔴 High | ✅ None | ✅ None | ❓ |
| **Language** | Japanese | English | English | ❓ |
| **Min Magnitude** | All | M4.0+ | M3.5+ | ❓ |

---

## Implementation Considerations

### If We Were to Use Wolfx (Hypothetically)

**Required Changes**:

1. **Add WolfxJMASource class**
```typescript
export class WolfxJMASource extends BaseDataSource {
  readonly name = 'JMA (Wolfx)'
  private readonly baseUrl = 'https://api.wolfx.jp/jma_eqlist.json'
  
  async fetchEarthquakes(): Promise<EarthquakeFeature[]> {
    // Fetch and parse Japanese data
    // Translate location names
    // Convert to standard format
  }
}
```

2. **Translation Layer**
- Japanese location names → English
- JMA intensity (shindo) → Magnitude equivalent
- Japanese info messages → English

3. **Data Conversion**
- Parse Japanese date format
- Convert coordinates
- Map JMA fields to our schema

**Effort**: Medium (2-3 days)

**But**: ❌ **Cannot use due to TOS restrictions**

---

## Conclusion

### Can We Use Wolfx API for Commercial Application?

**Answer**: ❌ **NO**

**Reason**: Terms of Service explicitly prohibit redistribution and proxying of content, which our commercial application would require.

### Recommended Action

✅ **Continue with current setup** (USGS + EMSC)

**Rationale**:
1. ✅ Licensed for commercial use
2. ✅ Reliable and stable
3. ✅ Good coverage (including Japan M4.0+)
4. ✅ No legal risks
5. ✅ Already working

### Future Research

🔄 **Investigate Hi-net FDSN** (low priority)
- May provide official JMA data
- Check commercial use permissions
- Verify API availability

---

## Contact Information

**Wolfx Project**:
- Email: [email protected]
- Website: https://wolfx.jp/
- Note: Could contact to request commercial license (unlikely for nonprofit)

**Alternative**: Focus on official JMA sources or FDSN endpoints

---

## Final Recommendation

### ❌ **DO NOT INTEGRATE Wolfx API**

**Legal Risk**: Too high for commercial application

**Alternative**: Current USGS + EMSC setup is sufficient and legally compliant

**Future**: Research official JMA FDSN endpoints or commercial API providers if better Japan coverage is critical

---

**Last Updated**: October 2, 2025  
**Status**: Wolfx API not suitable for commercial use  
**Recommendation**: Continue with USGS + EMSC
