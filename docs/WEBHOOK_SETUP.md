# 📡 Webhook Setup Guide

Complete guide to configure delivery receipt webhooks for real-time acknowledgment tracking.

---

## 🎯 Overview

Webhooks enable real-time tracking of message delivery and acknowledgment status:

- **Twilio (SMS)** → Delivery confirmation, read receipts
- **SendGrid (Email)** → Opens, clicks, bounces
- **WhatsApp (via Twilio)** → Delivery, read receipts

---

## 🔧 Setup Instructions

### 1. Twilio SMS Webhooks

**What you'll track:**
- Message sent
- Message delivered
- Message failed
- Read receipts (WhatsApp only)

#### Configuration Steps:

1. **Go to Twilio Console**
   - Navigate to: https://console.twilio.com/
   - Go to: Messaging → Services → [Your Service]

2. **Set Status Callback URL**
   ```
   Production: https://your-domain.com/api/webhooks/twilio
   Development: https://your-ngrok-url.ngrok.io/api/webhooks/twilio
   ```

3. **Enable Status Callbacks**
   - Check: "Use a webhook for status updates"
   - Method: POST
   - Select events:
     - ✅ Queued
     - ✅ Sent
     - ✅ Delivered
     - ✅ Failed
     - ✅ Undelivered

4. **Add to Environment Variables**
   ```bash
   # .env.local
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   ```

#### Alternative: Per-Message Webhook

When sending SMS, include status callback:
```typescript
await twilioClient.messages.create({
  to: phoneNumber,
  from: twilioNumber,
  body: message,
  statusCallback: 'https://your-domain.com/api/webhooks/twilio'
})
```

---

### 2. SendGrid Email Webhooks

**What you'll track:**
- Email processed
- Email delivered
- Email opened ← **Acknowledgment**
- Link clicked ← **Acknowledgment**
- Email bounced
- Spam reports

#### Configuration Steps:

1. **Go to SendGrid Dashboard**
   - Navigate to: https://app.sendgrid.com/
   - Go to: Settings → Mail Settings → Event Webhook

2. **Enable Event Webhook**
   - Authorization Method: None (or Signed Event Webhook)
   - HTTP Post URL:
     ```
     Production: https://your-domain.com/api/webhooks/sendgrid
     Development: https://your-ngrok-url.ngrok.io/api/webhooks/sendgrid
     ```

3. **Select Events to Post**
   - ✅ Processed
   - ✅ Delivered
   - ✅ **Open** ← Key for acknowledgment
   - ✅ **Click** ← Also indicates read
   - ✅ Bounce
   - ✅ Dropped
   - ✅ Deferred
   - ✅ Spam Report
   - ✅ Unsubscribe

4. **Enable Signed Event Webhook** (Recommended)
   - Create a verification key
   - Add to environment variables:
   ```bash
   # .env.local
   SENDGRID_WEBHOOK_VERIFICATION_KEY=your_verification_key
   ```

5. **Test the Webhook**
   - Click "Test Your Integration"
   - Should receive 200 OK response

#### Important: Enable Tracking

For open/click tracking to work, enable in your emails:
```typescript
const msg = {
  to: email,
  from: 'alerts@yourdomain.com',
  subject: 'Alert',
  html: content,
  trackingSettings: {
    clickTracking: { enable: true },
    openTracking: { enable: true }
  }
}
```

---

### 3. WhatsApp Webhooks (via Twilio)

**What you'll track:**
- Message queued
- Message sent
- Message delivered
- **Message read** ← Key for acknowledgment

#### Configuration Steps:

1. **Go to Twilio Console**
   - Navigate to: Messaging → WhatsApp → Senders
   - Select your WhatsApp sender

2. **Set Webhook URL**
   ```
   Production: https://your-domain.com/api/webhooks/whatsapp
   Development: https://your-ngrok-url.ngrok.io/api/webhooks/whatsapp
   ```
   
   Or use the unified endpoint:
   ```
   https://your-domain.com/api/webhooks/twilio
   ```

3. **Enable Status Callbacks**
   - Method: POST
   - Select events:
     - ✅ Queued
     - ✅ Sent
     - ✅ Delivered
     - ✅ **Read** ← Key event!
     - ✅ Failed

4. **WhatsApp Business Requirements**
   - Must use WhatsApp Business API
   - Read receipts only work if:
     - Recipient has read receipts enabled
     - Using approved WhatsApp Business template

---

## 🧪 Testing Webhooks Locally

### Using ngrok:

1. **Install ngrok**
   ```bash
   brew install ngrok
   # or download from: https://ngrok.com/download
   ```

2. **Start your dev server**
   ```bash
   pnpm dev
   ```

3. **Create tunnel**
   ```bash
   ngrok http 3000
   ```

4. **Copy HTTPS URL**
   ```
   Forwarding: https://abc123.ngrok.io → http://localhost:3000
   ```

5. **Update webhook URLs**
   - Twilio: `https://abc123.ngrok.io/api/webhooks/twilio`
   - SendGrid: `https://abc123.ngrok.io/api/webhooks/sendgrid`
   - WhatsApp: `https://abc123.ngrok.io/api/webhooks/whatsapp`

### Testing Steps:

1. **Send a test message**
   - Via your app's UI
   - Or use Twilio/SendGrid console

2. **Check webhook logs**
   ```bash
   # View your dev server logs
   # Should see: [Twilio Webhook] Status update: ...
   ```

3. **Verify database update**
   ```sql
   SELECT 
     id, 
     channel, 
     status, 
     delivered_at, 
     read_at 
   FROM delivery_logs 
   WHERE channel = 'email' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## 🔐 Security Best Practices

### 1. Verify Webhook Signatures

**Twilio:**
```typescript
// Automatically verified in route handler
// Uses X-Twilio-Signature header
```

**SendGrid:**
```typescript
// Enable signed webhooks in SendGrid dashboard
// Set SENDGRID_WEBHOOK_VERIFICATION_KEY in .env
```

### 2. Use HTTPS in Production
- Never use HTTP for webhooks
- Providers may reject HTTP URLs
- Data contains sensitive information

### 3. Rate Limiting
- Webhooks can receive high volume
- Consider implementing rate limiting
- Log all webhook events for monitoring

### 4. Error Handling
- Return 200 OK even if processing fails
- Log errors for later retry
- Providers may retry failed webhooks

---

## 📊 Monitoring Webhooks

### Health Check Endpoints

Test webhook availability:
```bash
# Twilio webhook
curl https://your-domain.com/api/webhooks/twilio

# SendGrid webhook  
curl https://your-domain.com/api/webhooks/sendgrid

# WhatsApp webhook
curl https://your-domain.com/api/webhooks/whatsapp
```

### View Webhook Logs

Check application logs:
```bash
# Production (Railway)
railway logs

# Development
pnpm dev
# Watch console output
```

### Database Monitoring

Query acknowledgment stats:
```sql
-- Acknowledgment rate by channel
SELECT 
  channel,
  COUNT(*) as total,
  COUNT(read_at) as acknowledged,
  ROUND(COUNT(read_at) * 100.0 / COUNT(*), 2) as ack_rate
FROM delivery_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY channel;

-- Recent read receipts
SELECT 
  channel,
  status,
  delivered_at,
  read_at,
  read_at - delivered_at as time_to_read
FROM delivery_logs
WHERE read_at IS NOT NULL
ORDER BY read_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Problem: No webhooks received

**Checklist:**
1. ✅ Webhook URL is HTTPS (required in production)
2. ✅ URL is publicly accessible (use ngrok for local)
3. ✅ Correct URL in provider dashboard
4. ✅ Events are enabled in provider settings
5. ✅ No firewall blocking requests
6. ✅ Application is running

### Problem: 401 Unauthorized errors

**Solutions:**
- Twilio: Check `TWILIO_AUTH_TOKEN` in environment
- SendGrid: Verify `SENDGRID_WEBHOOK_VERIFICATION_KEY`
- Check signature verification logic

### Problem: Logs not updating

**Check:**
1. Webhook receiving requests (check logs)
2. `providerMessageId` matches between send and webhook
3. Database has correct `channel` value
4. No errors in webhook processing

### Problem: SendGrid opens not tracking

**Requirements:**
- Open tracking must be enabled in email
- Recipient must load images (email clients)
- Works best with HTML emails
- May not work with privacy-focused clients

---

## 📈 Expected Behavior

### SMS (Twilio)
```
sent → delivered (usually within seconds)
```

### Email (SendGrid)
```
processed → delivered → open (when recipient opens)
                     → click (when recipient clicks link)
```

### WhatsApp (Twilio)
```
queued → sent → delivered → read (when recipient opens message)
```

---

## 🔄 Webhook Flow

```
1. App sends message via provider
   ↓
2. Provider accepts message (ID: msg_12345)
   ↓
3. App stores delivery log with providerMessageId = msg_12345
   ↓
4. Provider delivers message
   ↓
5. Provider sends webhook: "delivered" for msg_12345
   ↓
6. App updates delivery log: deliveredAt = now
   ↓
7. Recipient opens message
   ↓
8. Provider sends webhook: "read/open" for msg_12345
   ↓
9. App updates delivery log: readAt = now ✅
   ↓
10. UI shows "Acknowledged" with green checkmark
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Twilio webhook URL configured
- [ ] SendGrid webhook URL configured  
- [ ] WhatsApp webhook URL configured (if using)
- [ ] Environment variables set
- [ ] HTTPS enabled in production
- [ ] Signature verification working
- [ ] Test message sent successfully
- [ ] Webhook received (check logs)
- [ ] Database updated correctly
- [ ] UI shows acknowledgment status

---

## 📚 Additional Resources

- **Twilio SMS Webhooks:** https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply
- **SendGrid Event Webhook:** https://docs.sendgrid.com/for-developers/tracking-events/event
- **WhatsApp Business API:** https://www.twilio.com/docs/whatsapp/tutorial/send-and-receive-media-messages-whatsapp

---

## 🎉 Success!

Once configured, you'll see:
- Real-time delivery status updates
- Acknowledgment timestamps in UI
- Green checkmarks for read messages
- Complete delivery lifecycle tracking

**The "Acknowledged" column will now populate automatically!** 🎯
