# Notification Template Assessment & Improvement Plan

## 🔍 Current State Analysis

### ✅ What's Working Well

**1. Template Service Infrastructure**
- ✅ Centralized `TemplateService` class with variable interpolation
- ✅ Multi-channel templates (SMS, Email, WhatsApp, Voice)
- ✅ Database-backed templates with fallback to defaults
- ✅ Supports multiple languages (extensible)

**2. Real Alert System**
- ✅ **Earthquake alerts** already use dynamic data:
  ```typescript
  templateData = {
    magnitude: earthquake.properties.mag,
    location: earthquake.properties.place,
    depth: earthquake.geometry?.coordinates?.[2] || 0,
    timestamp: new Date(earthquake.properties.time).toLocaleString(),
    tsunamiLevel: tsunamiThreat.level,
    tsunamiConfidence: tsunamiThreat.confidence,
    instructions: this.getTsunamiGuidance(tsunamiThreat.level)
  }
  ```

**3. Variable Interpolation**
- ✅ Uses `{variable}` syntax for placeholders
- ✅ Automatic field formatting (e.g., `M{magnitude}`, `{depth} km`)

---

## ❌ Issues Found

### 1. **Test Endpoints Use Hardcoded Messages**

**Location**: Multiple test API routes

**Problem**: Test messages bypass the template service entirely.

**Examples**:

#### `/app/api/test/all-channels/route.ts` (Line 32-35)
```typescript
const testMessage = `🧪 **EMERGENCY SYSTEM TEST**

This is a test of all notification channels in the Emergency Alert System.

Time: ${new Date().toLocaleTimeString()}
Status: All systems operational

If you received this, your contact information is correctly configured.`
```
❌ **Hardcoded** - no template usage

#### `/app/api/test/whatsapp/route.ts` (Line 20-27)
```typescript
const testMessage = `🧪 *WhatsApp Test Alert*

This is a test message from your Emergency Alert System.

Time: ${new Date().toLocaleTimeString()}
Status: System operational

Reply 'STOP' to unsubscribe from WhatsApp alerts.`
```
❌ **Hardcoded** - no template usage

#### `/lib/alert-manager.ts` (Line 168)
```typescript
const testMessage = `🧪 Test Alert - Emergency Alert System is working! Time: ${new Date().toLocaleString()}`
```
❌ **Hardcoded** - no template usage

---

### 2. **Missing Event-Specific Details in Some Channels**

**Voice Calls** - Currently use simple text-to-speech but could include:
- Specific GPS coordinates
- Distance from contact location
- Aftershock probability
- Local emergency contact numbers

**WhatsApp** - Could leverage rich formatting:
- Location maps/links
- Action buttons
- Severity-based formatting

---

### 3. **Template Variables Not Fully Utilized**

Current templates have placeholders but some useful data isn't being passed:

**Missing Variables**:
- `{contactName}` - Personalize messages
- `{distance}` - Distance from event to contact
- `{localTime}` - Contact's local time zone
- `{affectedAreas}` - List of affected regions
- `{shelterLocations}` - Nearest shelters
- `{emergencyNumber}` - Local emergency services number

---

## 🎯 Recommended Changes

### **Phase 1: Fix Test Endpoints** (HIGH PRIORITY)

Replace all hardcoded test messages with template service calls.

#### 1.1 Add Test Templates to Template Service

```typescript
// Add to lib/services/template-service.ts initializeDefaultTemplates()

// SMS Test Template
this.defaultTemplates.set('test:sms:en',
  '🧪 TEST ALERT: {systemName} test at {timestamp}. Contact: {contactName}. Status: {status}. This is only a test.')

// WhatsApp Test Template  
this.defaultTemplates.set('test:whatsapp:en',
  '🧪 *SYSTEM TEST*\n\n✅ Status: {status}\n👤 Contact: {contactName}\n🕒 Time: {timestamp}\n\nReply STOP to unsubscribe.')

// Email Test Template
this.defaultTemplates.set('test:email:en',
  `SYSTEM TEST - {systemName}

Hello {contactName},

This is a test of the Emergency Alert System notification channels.

Test Details:
- Time: {timestamp}
- System Status: {status}
- Your Contact ID: {contactId}
- Channels Tested: {channelsTested}

✅ If you received this message, your contact information is correctly configured.

Reply to this message or visit the dashboard to update your preferences.`)

this.defaultTemplates.set('test:email:en:subject',
  '🧪 System Test - {systemName}')

// Voice Test Template
this.defaultTemplates.set('test:voice:en',
  'This is a test message from {systemName}. The time is {timestamp}. Contact name: {contactName}. All systems are operational. This was only a test.')
```

#### 1.2 Update Test API Routes

**File**: `/app/api/test/all-channels/route.ts`

```typescript
// BEFORE (lines 32-40)
const testMessage = `🧪 **EMERGENCY SYSTEM TEST**...`

// AFTER
import { TemplateService } from '@/lib/services/template-service'

const templateService = new TemplateService()

// For each channel, render appropriate template
const smsMessage = await templateService.renderTemplate({
  type: 'test',
  channel: 'sms',
  language: 'en',
  data: {
    systemName: 'Emergency Alert System',
    timestamp: new Date().toLocaleString(),
    contactName: contact.name,
    status: 'All systems operational',
    contactId: contact.id
  }
})

const whatsappMessage = await templateService.renderTemplate({
  type: 'test',
  channel: 'whatsapp',
  language: 'en',
  data: {
    systemName: 'Emergency Alert System',
    timestamp: new Date().toLocaleString(),
    contactName: contact.name,
    status: 'All systems operational',
    contactId: contact.id
  }
})

// Use smsMessage.content, whatsappMessage.content, etc.
```

---

### **Phase 2: Enhance Earthquake Alert Templates** (MEDIUM PRIORITY)

Add more detailed information to earthquake alerts.

#### 2.1 Enhanced Earthquake SMS Template

```typescript
// Current (line 29-30)
'🚨 EARTHQUAKE ALERT: M{magnitude} at {location}. {instructions} Time: {timestamp}'

// Enhanced
'🚨 EARTHQUAKE ALERT
M{magnitude} @ {location}
Depth: {depth}km | {timestamp}
Distance from you: {distance}km
{instructions}
{detailsUrl}'
```

#### 2.2 Enhanced Earthquake Voice Template

```typescript
// Current (line 79-80)
'Emergency earthquake alert. Magnitude {magnitude} earthquake detected at {location}. {instructions}. This is not a test.'

// Enhanced
'Emergency earthquake alert for {contactName}. A magnitude {magnitude} earthquake occurred at {location}, approximately {distance} kilometers from your location. Depth: {depth} kilometers. {instructions}. The event occurred at {timestamp}. For more information, visit the emergency dashboard. This is not a test.'
```

#### 2.3 Enhanced WhatsApp Template with Rich Formatting

```typescript
// Enhanced
'🚨 *EARTHQUAKE ALERT*

📊 *Magnitude:* {magnitude}
📍 *Location:* {location}  
📏 *Depth:* {depth}km
📐 *Distance from you:* {distance}km
🕒 *Time:* {timestamp}

⚠️ *IMMEDIATE ACTION:*
{instructions}

{tsunamiWarning}

🔗 [View Details]({detailsUrl})
📞 Emergency: {emergencyNumber}

Reply SAFE to confirm you are safe.'
```

---

### **Phase 3: Add Personalization Data** (MEDIUM PRIORITY)

Pass contact-specific data to templates.

#### 3.1 Calculate Distance from Event

```typescript
// Add to alert-manager.ts sendMultiChannelAlerts()

// Calculate distance from earthquake to contact
const distance = contact.latitude && contact.longitude
  ? calculateDistance(
      earthquake.geometry.coordinates[1], // earthquake lat
      earthquake.geometry.coordinates[0], // earthquake lng
      contact.latitude,
      contact.longitude
    )
  : null

// Add to templateData
const templateData = {
  // ... existing fields
  contactName: contact.name,
  distance: distance ? Math.round(distance) : 'Unknown',
  localTime: new Date().toLocaleString('en-US', { 
    timeZone: contact.timezone || 'UTC' 
  }),
  detailsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${earthquake.id}`,
  emergencyNumber: getLocalEmergencyNumber(contact.country || 'US')
}
```

#### 3.2 Helper Function for Distance Calculation

```typescript
// Add to lib/utils/geo-utils.ts

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Get local emergency number by country
 */
export function getLocalEmergencyNumber(country: string): string {
  const emergencyNumbers: Record<string, string> = {
    'US': '911',
    'UK': '999',
    'EU': '112',
    'AU': '000',
    'IN': '112',
    'JP': '110',
    'CN': '120',
    // Add more countries
  }
  
  return emergencyNumbers[country] || '911'
}
```

---

### **Phase 4: Add Tsunami-Specific Templates** (LOW PRIORITY)

Currently tsunami info is added to earthquake messages. Create dedicated tsunami templates.

```typescript
// SMS
this.defaultTemplates.set('tsunami:sms:en',
  '🌊 TSUNAMI {alertLevel}: {waveHeight}m waves expected @ {location}. ETA: {eta}. {instructions} {detailsUrl}')

// Voice
this.defaultTemplates.set('tsunami:voice:en',
  'Tsunami {alertLevel} for {contactName}. {waveHeight} meter waves expected at {location}. Estimated arrival time: {eta}. {instructions}. Visit the emergency dashboard for evacuation routes. This is not a test.')

// WhatsApp with action buttons
this.defaultTemplates.set('tsunami:whatsapp:en',
  '🌊 *TSUNAMI {alertLevel}*

📍 *Location:* {location}
📏 *Wave Height:* {waveHeight}m
⏰ *ETA:* {eta}
📐 *Distance from you:* {distance}km

🆘 *URGENT ACTION:*
{instructions}

🗺️ [Evacuation Map]({evacuationMapUrl})
🚨 [View Alert Details]({detailsUrl})
📞 Emergency: {emergencyNumber}

Reply SAFE when evacuated.')
```

---

## 📋 Implementation Checklist

### Immediate (Week 1)
- [ ] Add test message templates to `template-service.ts`
- [ ] Update `/app/api/test/all-channels/route.ts` to use templates
- [ ] Update `/app/api/test/whatsapp/route.ts` to use templates
- [ ] Update `/lib/alert-manager.ts` test function to use templates
- [ ] Test all channels with new templates

### Short-term (Week 2)
- [ ] Add `calculateDistance()` function to `lib/utils/geo-utils.ts`
- [ ] Add `getLocalEmergencyNumber()` function
- [ ] Update `alert-manager.ts` to calculate distance
- [ ] Add `contactName`, `distance`, `detailsUrl` to templateData
- [ ] Enhance earthquake templates with new variables
- [ ] Update database schema to store `latitude`, `longitude`, `timezone` for contacts

### Medium-term (Month 1)
- [ ] Create dedicated tsunami templates
- [ ] Add tsunami-specific data to templateData
- [ ] Add evacuation map URLs
- [ ] Implement contact response tracking (SAFE replies)
- [ ] Add template versioning and A/B testing

### Long-term (Month 2+)
- [ ] Multi-language support (Spanish, Japanese, etc.)
- [ ] Template editor in admin dashboard
- [ ] Template preview functionality
- [ ] Template analytics (open rates, response rates)
- [ ] Dynamic content based on time of day
- [ ] Personalized evacuation instructions based on contact location

---

## 🎨 Complete Template Examples

### Earthquake Alert - All Channels

#### SMS (160 char optimized)
```
🚨 M{magnitude} EARTHQUAKE
📍 {location}
📐 {distance}km away
🕒 {time}
⚠️ {instructions}
🔗 {shortUrl}
```

#### Email (Rich HTML)
```
Subject: 🚨 EARTHQUAKE ALERT - M{magnitude} {location}

Hello {contactName},

An earthquake has been detected in your area:

EARTHQUAKE DETAILS
------------------
Magnitude: {magnitude}
Location: {location}
Depth: {depth} km
Time: {timestamp}
Distance from your location: {distance} km

TSUNAMI ASSESSMENT
------------------
Threat Level: {tsunamiLevel}
Confidence: {tsunamiConfidence}%

RECOMMENDED ACTIONS
------------------
{instructions}

{tsunamiWarning}

VIEW FULL DETAILS
[View on Dashboard]({detailsUrl})

EMERGENCY CONTACTS
Local Emergency: {emergencyNumber}
System Status: {systemStatusUrl}

---
Emergency Alert System
Automated notification - Do not reply
Update preferences: {preferencesUrl}
```

#### WhatsApp (Rich formatting + interactive)
```
🚨 *EARTHQUAKE ALERT*

👤 {contactName}
📊 *M{magnitude}* @ *{location}*
📏 Depth: {depth}km
📐 Distance: {distance}km from you
🕒 {timestamp}

🌊 *Tsunami Assessment*
Level: {tsunamiLevel}
Confidence: {tsunamiConfidence}%

⚠️ *IMMEDIATE ACTION*
{instructions}

{tsunamiWarningBlock}

🔗 [View Full Details]({detailsUrl})
🗺️ [Nearby Shelters]({sheltersUrl})
📞 Emergency: {emergencyNumber}

💬 *Quick Response*
Reply SAFE if you're safe
Reply HELP if you need assistance
```

#### Voice (Clear, concise speech)
```
Attention {contactName}.

Emergency earthquake alert.

A magnitude {magnitude} earthquake has occurred at {location}, approximately {distance} kilometers from your location.

The earthquake occurred at {timestamp} at a depth of {depth} kilometers.

Tsunami assessment: {tsunamiLevel}. Confidence level: {tsunamiConfidence} percent.

{instructions}

{tsunamiInstructions}

For more information and evacuation routes, visit the emergency dashboard.

Your local emergency number is {emergencyNumber}.

This is not a test. Stay safe.
```

---

## 🔐 Security & Privacy Considerations

1. **PII Handling**
   - ✅ Don't log full message contents (contains contact names, locations)
   - ✅ Mask phone numbers in logs
   - ✅ Don't include sensitive data in URLs (use tokens)

2. **URL Security**
   - ✅ Use short-lived tokens for detail URLs
   - ✅ Implement rate limiting on detail pages
   - ✅ Require authentication for detailed event info

3. **Template Injection Prevention**
   - ✅ Sanitize all template variables
   - ✅ Escape HTML in email templates
   - ✅ Validate URLs before insertion

---

## 📊 Success Metrics

Track these metrics after implementation:

1. **Engagement**
   - SMS link click-through rate
   - Email open rate
   - WhatsApp reply rate ("SAFE" confirmations)
   - Voice call completion rate

2. **Effectiveness**
   - Time to first response
   - Percentage of contacts confirming safety
   - Reduction in support queries

3. **Technical**
   - Template rendering time (<100ms target)
   - Delivery success rates by channel
   - Template error rates

---

## 💰 Cost Impact

### Current State
- Hardcoded messages = No flexibility, poor user experience

### After Implementation
- ✅ Better user engagement = Higher value per message
- ✅ Personalized content = More effective alerts
- ✅ Template reuse = Lower development costs for new alert types
- ⚠️ Slightly higher API costs (WhatsApp buttons, link previews)

**Estimated Impact**: +5-10% in messaging costs, +50-100% improvement in engagement

---

## 🚀 Quick Start Guide

### Step 1: Update a Single Test Endpoint (30 minutes)

```typescript
// app/api/test/sms/route.ts

import { TemplateService } from '@/lib/services/template-service'

const templateService = new TemplateService()

const rendered = await templateService.renderTemplate({
  type: 'test',
  channel: 'sms',
  language: 'en',
  data: {
    systemName: 'Emergency Alert System',
    timestamp: new Date().toLocaleString(),
    contactName: testContact.name,
    status: 'Operational',
    contactId: testContact.id
  }
})

await smsService.sendSMS(testContact.phone, rendered.content)
```

### Step 2: Test It
```bash
curl -X POST http://localhost:3000/api/test/sms
```

### Step 3: Roll Out to All Channels
- Repeat for WhatsApp, Email, Voice
- Update bulk test endpoint
- Update real alert flow

---

## ✅ Viability Assessment

### Is This Change Viable? **YES!** ✅

**Reasons**:
1. ✅ **Infrastructure exists** - Template service already built
2. ✅ **Low risk** - Changes are additive, not breaking
3. ✅ **High impact** - Better user experience and engagement
4. ✅ **Easy rollback** - Can revert to hardcoded messages if needed
5. ✅ **Testable** - Can A/B test templates
6. ✅ **Scalable** - Template system handles growth well

**Estimated Effort**:
- Phase 1 (Test endpoints): **4-6 hours**
- Phase 2 (Enhanced templates): **6-8 hours**
- Phase 3 (Personalization): **8-10 hours**
- **Total: 18-24 hours** (2-3 days)

**Recommended Approach**: 
Implement in phases, starting with test endpoints (highest impact, lowest risk).

---

## 📞 Questions?

Review this document and let me know:
1. Which phases do you want to prioritize?
2. Any specific template enhancements you'd like?
3. Should we add any other variables or channels?

**Ready to implement when you approve!** 🚀
