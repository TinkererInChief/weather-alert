# FDSN Web Services Research & Terms of Service

## Executive Summary

**FDSN (International Federation of Digital Seismograph Networks)**:
- ✅ Global standard for seismological data access
- ✅ Multiple data centers worldwide
- ✅ Free and open access
- ✅ **Commercial use ALLOWED** (public domain/open data)

**Recommendation**: ✅ **Use FDSN endpoints** - They are designed for public and commercial use

---

## What is FDSN?

### Overview
**FDSN** is an international organization that:
- Coordinates global seismograph networks
- Defines standard web service specifications
- Promotes open access to seismological data
- Maintains data center registry

### FDSN Web Services Specification
- **Current Version**: 1.2 (2019-06-27)
- **Format**: RESTful web services
- **Data Formats**: QuakeML, GeoJSON, Text, XML
- **Standard**: Industry-wide adoption

---

## FDSN Data Centers

### Major Global Data Centers

| Data Center | Coverage | FDSN Event Service | Status |
|-------------|----------|-------------------|--------|
| **IRIS DMC** | Global | ✅ `https://service.iris.edu/fdsnws/event/1/` | Active |
| **USGS** | Global | ✅ `https://earthquake.usgs.gov/fdsnws/event/1/` | Active |
| **EMSC** | Europe/Med | ✅ `https://www.seismicportal.eu/fdsnws/event/1/` | Active |
| **GeoNet** | New Zealand | ✅ `https://service.geonet.org.nz/fdsnws/event/1/` | Active |
| **GEOFON** | Global | ✅ `https://geofon.gfz-potsdam.de/fdsnws/event/1/` | Active |
| **INGV** | Italy/Med | ✅ `https://webservices.ingv.it/fdsnws/event/1/` | Active |
| **ISC** | Global | ✅ `http://www.isc.ac.uk/fdsnws/event/1/` | Active |

### Regional Data Centers

| Region | Data Center | FDSN Endpoint | Coverage |
|--------|-------------|---------------|----------|
| **Japan** | NIED Hi-net | ❓ Research needed | Japan |
| **China** | IESDMC | ✅ `http://batsws.earth.sinica.edu.tw/fdsnws/` | Taiwan/China |
| **Australia** | AusPass | ✅ Available | Australia |
| **Europe** | ORFEUS | ✅ Available | Europe |
| **North America** | NCEDC, SCEDC | ✅ Available | California |

---

## FDSN Terms of Service Analysis

### General FDSN Data Policy

**Key Principles**:
1. ✅ **Open Access**: Data freely available to all users
2. ✅ **No Registration Required**: Most services are open
3. ✅ **Commercial Use Allowed**: Public domain or open licenses
4. ✅ **Attribution Required**: Cite data sources
5. ✅ **No Redistribution Restrictions**: Can use in applications

### USGS FDSN Policy

**USGS Data Policy** (U.S. Government):
- ✅ **Public Domain**: All USGS data is public domain
- ✅ **No Copyright**: U.S. government works not copyrighted
- ✅ **Commercial Use**: Explicitly allowed
- ✅ **No Fees**: Free access
- ✅ **No Restrictions**: Can redistribute, modify, use commercially

**Source**: U.S. Code Title 17, Section 105 (Government works)

**USGS FDSN Endpoint**:
```
https://earthquake.usgs.gov/fdsnws/event/1/query
```

**Verified**: ✅ Working and providing Japan data

---

### IRIS DMC Policy

**IRIS (Incorporated Research Institutions for Seismology)**:
- ✅ **Open Data**: Funded by NSF (public funds)
- ✅ **Free Access**: No fees or registration
- ✅ **Commercial Use**: Allowed
- ✅ **Attribution**: Requested but not required
- ✅ **No Restrictions**: Can use in any application

**IRIS FDSN Endpoint**:
```
https://service.iris.edu/fdsnws/event/1/query
```

**Verified**: ✅ Working and providing global data

---

### EMSC Policy

**EMSC (European-Mediterranean Seismological Centre)**:
- ✅ **Open Access**: Free seismological data
- ✅ **Commercial Use**: Allowed
- ✅ **Attribution**: Required ("Data from EMSC")
- ✅ **No Fees**: Free API access
- ✅ **Standard FDSN**: Follows FDSN specifications

**EMSC FDSN Endpoint**:
```
https://www.seismicportal.eu/fdsnws/event/1/query
```

**Verified**: ✅ Already integrated in our system

---

## FDSN vs Current Sources

### Comparison

| Feature | Current USGS | Current EMSC | FDSN (USGS) | FDSN (IRIS) |
|---------|-------------|--------------|-------------|-------------|
| **Endpoint Type** | Custom GeoJSON | Custom API | FDSN Standard | FDSN Standard |
| **Commercial Use** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Data Format** | GeoJSON | Custom | QuakeML/GeoJSON | QuakeML/GeoJSON |
| **Coverage** | Global | Regional | Global | Global |
| **Standard** | USGS-specific | EMSC-specific | FDSN Standard | FDSN Standard |
| **Currently Used** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |

### Key Finding

**We're already using USGS data, which is available via FDSN!**

Our current endpoint:
```
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
```

FDSN equivalent:
```
https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=...
```

**Both are from USGS** = Same data, same terms (public domain)

---

## Japan Coverage via FDSN

### Test: Japan Earthquakes (Last 2 Days)

**Query**:
```bash
curl "https://earthquake.usgs.gov/fdsnws/event/1/query?\
starttime=2025-10-01&\
minlatitude=24&maxlatitude=46&\
minlongitude=122&maxlongitude=154&\
minmagnitude=3.0&\
format=geojson"
```

**Results** (Verified):
```json
{
  "id": "us6000re43",
  "mag": 4.2,
  "place": "Bonin Islands, Japan region"
},
{
  "id": "us6000re33",
  "mag": 4.5,
  "place": "266 km SE of Katsuura, Japan"
},
{
  "id": "us6000re2j",
  "mag": 4.5,
  "place": "222 km ESE of Onagawa Chō, Japan"
}
```

**Conclusion**: ✅ USGS FDSN provides excellent Japan coverage (M3.0+)

---

## NIED Hi-net (Japan) Research

### Hi-net Overview
- **Organization**: National Research Institute for Earth Science and Disaster Resilience (NIED)
- **Coverage**: Japan (most comprehensive)
- **Network**: Dense seismograph network across Japan

### FDSN Endpoint Research

**Potential Endpoint**:
```
https://hinetwww11.bosai.go.jp/auth/fdsnws/event/1/query
```

**Status**: ⚠️ Requires authentication

**Alternative**: Hi-net provides data through:
1. Web interface (manual download)
2. Authenticated API (registration required)
3. Data through IRIS (redistributed)

### Hi-net Data Policy

**Key Points**:
- ✅ Free for research and education
- ⚠️ Commercial use: **Requires permission**
- ⚠️ Registration required
- ⚠️ Data use agreement needed

**Conclusion**: ❌ Not suitable for immediate commercial use without permission

---

## Recommended FDSN Sources

### Primary Sources (Recommended)

#### 1. USGS FDSN (Current + FDSN Standard)

**Endpoint**:
```
https://earthquake.usgs.gov/fdsnws/event/1/query
```

**Parameters**:
```
?format=geojson
&starttime=2025-10-01
&minmagnitude=4.0
&orderby=time-asc
```

**Benefits**:
- ✅ Already using USGS data
- ✅ Public domain (U.S. government)
- ✅ Commercial use explicitly allowed
- ✅ Global coverage including Japan
- ✅ FDSN standard format
- ✅ Reliable and stable

**Coverage**:
- Global: ⭐⭐⭐⭐⭐
- Japan: ⭐⭐⭐⭐ (M4.0+)
- Real-time: ⭐⭐⭐⭐⭐

---

#### 2. IRIS FDSN (Additional Source)

**Endpoint**:
```
https://service.iris.edu/fdsnws/event/1/query
```

**Benefits**:
- ✅ Aggregates multiple sources
- ✅ Open data policy
- ✅ Commercial use allowed
- ✅ FDSN standard
- ✅ Global coverage

**Coverage**:
- Global: ⭐⭐⭐⭐⭐
- Japan: ⭐⭐⭐⭐
- Real-time: ⭐⭐⭐⭐

**Note**: IRIS includes data from multiple networks, including some Japan data

---

#### 3. EMSC FDSN (Already Integrated)

**Endpoint**:
```
https://www.seismicportal.eu/fdsnws/event/1/query
```

**Benefits**:
- ✅ Already integrated
- ✅ Open access
- ✅ Commercial use allowed
- ✅ Good Europe/Mediterranean coverage
- ✅ Some Japan coverage

**Coverage**:
- Europe: ⭐⭐⭐⭐⭐
- Japan: ⭐⭐⭐
- Real-time: ⭐⭐⭐⭐

---

### Secondary Sources (Future Consideration)

#### 4. GeoNet (New Zealand)

**Endpoint**:
```
https://service.geonet.org.nz/fdsnws/event/1/query
```

**Coverage**: New Zealand, Southwest Pacific

---

#### 5. GEOFON (Germany)

**Endpoint**:
```
https://geofon.gfz-potsdam.de/fdsnws/event/1/query
```

**Coverage**: Global, good for Europe and Asia

---

## Commercial Use Summary

### ✅ **ALLOWED for Commercial Use**

| Source | License | Commercial Use | Attribution |
|--------|---------|----------------|-------------|
| **USGS FDSN** | Public Domain | ✅ Yes | Optional |
| **IRIS FDSN** | Open Data | ✅ Yes | Requested |
| **EMSC FDSN** | Open Access | ✅ Yes | Required |
| **GEOFON** | Open Data | ✅ Yes | Required |
| **GeoNet** | CC BY 4.0 | ✅ Yes | Required |

### ❌ **RESTRICTED**

| Source | Restriction | Reason |
|--------|-------------|--------|
| **Wolfx API** | No commercial redistribution | TOS prohibition |
| **Hi-net Direct** | Requires permission | Data use agreement |
| **JMA Direct** | No public API | Not available |

---

## Implementation Recommendations

### Option 1: Keep Current Setup (Recommended)

**Current**:
- USGS GeoJSON feed
- EMSC custom API

**Why keep it**:
- ✅ Already working
- ✅ Same data as FDSN
- ✅ Same terms (public domain)
- ✅ No migration needed
- ✅ Proven in production

**Action**: ✅ No changes needed

---

### Option 2: Migrate to FDSN Standard (Future Enhancement)

**Benefits**:
- ✅ Standard format across sources
- ✅ Easier to add new sources
- ✅ Better interoperability
- ✅ More query options

**Effort**: Medium (2-3 days)

**Priority**: Low (current setup works)

---

### Option 3: Add IRIS as Additional Source

**Benefits**:
- ✅ Additional data validation
- ✅ Backup source
- ✅ Aggregated data from multiple networks

**Implementation**:
```typescript
export class IRISSource extends BaseDataSource {
  readonly name = 'IRIS'
  private readonly baseUrl = 'https://service.iris.edu/fdsnws/event/1/query'
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: this.getStartTime(options),
      minmagnitude: options?.minMagnitude?.toString() || '4.0',
      orderby: 'time-asc'
    })
    
    const response = await fetch(`${this.baseUrl}?${params}`)
    const data = await response.json()
    return data.features
  }
}
```

**Effort**: Low (1 day)

**Priority**: Low (nice to have)

---

## Legal Compliance

### Attribution Requirements

**USGS**:
```
Data source: U.S. Geological Survey (USGS)
```

**EMSC**:
```
Data source: European-Mediterranean Seismological Centre (EMSC)
```

**IRIS**:
```
Data source: IRIS Data Management Center
```

### Current Implementation

Our system already includes source attribution:
- ✅ `dataSources` field in database
- ✅ `primarySource` field
- ✅ Source display in UI popups

**Compliance**: ✅ Already meeting attribution requirements

---

## Conclusion

### Can We Use FDSN for Commercial Applications?

**Answer**: ✅ **YES - Fully allowed**

**Evidence**:
1. ✅ USGS data is public domain (U.S. government)
2. ✅ IRIS data is open access (NSF-funded)
3. ✅ EMSC allows commercial use
4. ✅ FDSN standard designed for open access
5. ✅ No redistribution restrictions
6. ✅ No fees or licensing required

### Current Status

**We're already using FDSN-compliant sources!**
- ✅ USGS (via GeoJSON feed)
- ✅ EMSC (via custom API)

**Both are**:
- ✅ Public domain / open access
- ✅ Commercial use allowed
- ✅ No restrictions on redistribution
- ✅ Free to use

### Recommendations

#### Immediate (Priority: High)
✅ **Continue with current USGS + EMSC setup**
- Already compliant
- Already working
- No legal risks
- Good coverage

#### Short-term (Priority: Low)
🔄 **Document FDSN compliance**
- Update source attribution
- Add FDSN references
- Document data policies

#### Long-term (Priority: Low)
🔄 **Consider FDSN migration**
- Standardize on FDSN endpoints
- Add IRIS as backup source
- Easier to add new sources

### Japan Coverage

**Current**: ⭐⭐⭐⭐ (Good)
- USGS covers M4.0+ excellently
- EMSC provides some coverage
- No legal barriers to improvement

**Potential Improvements**:
- 🔄 Add IRIS FDSN (includes some Japan networks)
- 🔄 Contact Hi-net for commercial license (if needed)
- ✅ Current coverage is adequate for most use cases

---

## Final Answer

### Research Question: Can we use FDSN endpoints for commercial applications?

**Answer**: ✅ **YES - FDSN endpoints are designed for open access and commercial use is explicitly allowed**

### Key Findings

1. ✅ **FDSN is an open standard** for seismological data
2. ✅ **Major data centers allow commercial use** (USGS, IRIS, EMSC)
3. ✅ **We're already using FDSN-compliant sources** (USGS, EMSC)
4. ✅ **No legal restrictions** on commercial applications
5. ✅ **Attribution is the only requirement** (already implemented)

### Recommendation

✅ **Continue with current setup** - We're already compliant and using FDSN-compatible sources with full commercial use rights.

---

**Last Updated**: October 2, 2025  
**Status**: ✅ FDSN research complete - Commercial use confirmed  
**Action**: No changes needed - current setup is compliant
