# Escalation Policy Testing Guide

## ✅ What's Been Built

### 1. **EscalationService** (`/lib/services/escalation.service.ts`)
Production-ready service that:
- Processes multi-step escalation policies
- Sends real notifications via Twilio/SendGrid/WhatsApp
- Tracks delivery status in database
- Supports dry run mode for safe testing
- Logs all escalation events

### 2. **Test UI** (`/app/dashboard/test-escalation`)
Interactive testing interface with:
- Vessel selection dropdown (all 25 vessels from your fleets)
- Event type selector (earthquake/tsunami)
- Severity selector (critical/high/moderate/low)
- Policy picker (auto-selects if blank)
- **Safety checkbox**: "Send Real Notifications" (OFF by default)

### 3. **Test API** (`/app/api/test/trigger-alert`)
Endpoint that:
- Creates a test alert in the database
- Triggers escalation service
- Returns detailed logs of what happened
- Supports `sendNotifications: true/false` parameter

## 🧪 How to Test

### Option A: Dry Run (Recommended First)
1. Go to http://localhost:3000/dashboard/test-escalation
2. Select any vessel
3. Choose "Tsunami" + "Critical"
4. **Leave checkbox UNCHECKED**
5. Click "Trigger Test Alert (Dry Run)"

**Result**: You'll see:
- Which contacts would be notified
- What channels would be used (SMS, Email, WhatsApp)
- The escalation timeline
- Phone numbers of test contacts
- **NO actual messages sent** ✅

### Option B: Send Real Notifications
1. Same as above, but **CHECK the box** ⚠️
2. Click "🔴 Send Real Notifications"

**Result**:
- **REAL SMS/Email/WhatsApp messages sent** via Twilio/SendGrid
- Uses your API credits
- Test contacts will receive actual alerts
- Full delivery logs in database

## 📊 What Gets Created

Every test creates:
1. **VesselAlert** record with:
   - Alert details (event type, severity, vessel)
   - Link to escalation policy
   - Current escalation step

2. **EscalationLog** entries for:
   - Each notification attempt
   - Delivery status (sent/failed/dry_run)
   - Provider message IDs
   - Timestamps

## 🔍 Monitoring

Check escalation logs:
```sql
SELECT * FROM "EscalationLog" 
ORDER BY "attemptedAt" DESC 
LIMIT 10;
```

Check alerts:
```sql
SELECT * FROM "VesselAlert" 
WHERE "escalationStarted" = true 
ORDER BY "createdAt" DESC;
```

## ⚙️ Environment Variables Required

For REAL notifications to work:
```env
# Twilio (SMS & Voice)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_from_email

# WhatsApp (via Twilio)
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number

# App URL for links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📋 Test Escalation Policies

### Tsunami Escalation (3 steps)
1. **Immediate**: SMS + Email to Captain, Chief Officer
2. **After 5 min**: SMS + Voice to Captain, Operations Manager  
3. **After 15 min**: Voice + WhatsApp to Vessel Owner, Emergency Coordinator

### Earthquake Escalation (3 steps)
1. **Immediate**: Email to Captain, Chief Officer
2. **After 10 min**: SMS + Email to Operations Manager
3. **After 30 min**: SMS + Voice to Vessel Owner

## 🎯 Test Contacts (Seeded)

All test contacts have phone numbers starting with +19876543xxx:
- Captain John Smith
- Officer Sarah Johnson  
- Manager David Park
- Owner Michael Chang
- Coordinator Emily Rodriguez
- Engineer Carlos Martinez
- Navigator Lisa Anderson
- Operator James Wilson
- Safety Officer Maria Garcia
- Analyst Robert Brown

## ✨ Features

- **Dry Run Mode**: Test without sending (default)
- **Real Send Mode**: Actually sends notifications
- **Multi-Channel**: SMS, Email, WhatsApp, Voice
- **Step Tracking**: Shows which step is executing
- **Delivery Logs**: Full audit trail
- **Error Handling**: Graceful failures with logs
- **Rate Limiting**: 100ms delay between sends

## 🚀 Next Steps

1. **Test in Dry Run**: Verify logic works
2. **Send One Real Test**: Check Twilio/SendGrid integration
3. **Build Auto-Escalation**: Background job for step 2, 3...
4. **Add Acknowledgment**: Allow contacts to acknowledge alerts
5. **Timeout Handling**: Auto-escalate if no response

## 📝 Notes

- All fleets are now visible (assigned to your user)
- 25 test vessels across 5 fleets
- 11 test contacts with real-looking phone numbers
- 2 escalation policies (Tsunami, Earthquake)
- Dry run creates database records but doesn't send
