# 🚀 Webhook Quick Start

**5-Minute Setup to Enable Message Acknowledgment Tracking**

---

## ✅ What You Just Got

Message acknowledgment tracking is **implemented and ready** - you just need to configure the webhook URLs in your provider dashboards.

### Features Ready:
- ✅ Real-time delivery tracking
- ✅ Email open detection
- ✅ SMS delivery confirmation  
- ✅ WhatsApp read receipts
- ✅ Security verification
- ✅ UI display with green checkmarks

---

## 🔧 Quick Setup (5 minutes)

### Step 1: Local Testing (Optional)

If testing locally first:

```bash
# Terminal 1: Start your dev server
pnpm dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Step 2: Configure Twilio (2 min)

1. Go to: https://console.twilio.com/
2. Navigate to: **Messaging** → **Services** → **[Your Service]**
3. Set **Status Callback URL**:
   ```
   Production: https://your-domain.com/api/webhooks/twilio
   Local: https://abc123.ngrok.io/api/webhooks/twilio
   ```
4. Check these events:
   - ✅ Sent
   - ✅ Delivered  
   - ✅ Failed
5. Click **Save**

### Step 3: Configure SendGrid (2 min)

1. Go to: https://app.sendgrid.com/
2. Navigate to: **Settings** → **Mail Settings** → **Event Webhook**
3. **Enable** Event Webhook
4. Set **HTTP Post URL**:
   ```
   Production: https://your-domain.com/api/webhooks/sendgrid
   Local: https://abc123.ngrok.io/api/webhooks/sendgrid
   ```
5. Select events:
   - ✅ Processed
   - ✅ Delivered
   - ✅ **Opened** ← Key for acknowledgment
   - ✅ **Clicked** ← Also shows engagement
   - ✅ Bounce
6. Click **Save**

### Step 4: Set Environment Variable (1 min)

Add to your `.env.local`:

```bash
# Required for Twilio webhook verification
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Optional but recommended for SendGrid
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_verification_key
```

---

## 🧪 Test It (2 minutes)

### 1. Send Test Email

```bash
# Use your app or test via API
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your@email.com"}'
```

### 2. Open the Email

Open the test email in your inbox.

### 3. Check Logs

You should see:
```
[SendGrid Webhook] Event: open for abc123
[SendGrid Webhook] Updated delivery log: open
```

### 4. Check UI

Go to: **Dashboard** → **Communications** → **Delivery Logs**

You should see:
```
| CHANNEL | DELIVERED   | ACKNOWLEDGED         |
|---------|-------------|---------------------|
| Email   | Oct 30 3:00 | ✓ Oct 30 3:02      |
```

---

## 🎯 That's It!

**Webhooks are now active!** Your acknowledgment column will populate automatically as messages are opened.

---

## 📊 What Happens Now

```
1. You send an email/SMS
   ↓
2. Provider delivers it
   ↓
3. Recipient opens message
   ↓
4. Provider sends webhook to your app
   ↓
5. App updates readAt timestamp
   ↓
6. UI shows green checkmark ✓
```

---

## 🔍 Verify It's Working

### Check Webhook Health:

```bash
curl https://your-domain.com/api/webhooks/twilio
curl https://your-domain.com/api/webhooks/sendgrid
```

Should return: `{"service":"...", "status":"active"}`

### Check Database:

```sql
SELECT channel, status, delivered_at, read_at
FROM delivery_logs
WHERE read_at IS NOT NULL
ORDER BY read_at DESC
LIMIT 5;
```

---

## 📚 More Info

- **Complete Setup:** `docs/WEBHOOK_SETUP.md`
- **Technical Details:** `docs/WEBHOOK_IMPLEMENTATION_SUMMARY.md`
- **Troubleshooting:** See WEBHOOK_SETUP.md → Troubleshooting section

---

## 🎉 You're Done!

Message acknowledgment tracking is now live. The "Acknowledged" column will update automatically as recipients open your messages.

**Questions?** Check `docs/WEBHOOK_SETUP.md` for detailed guides and troubleshooting.
