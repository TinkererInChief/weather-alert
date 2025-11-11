# Optional Netlify Functions

## ⚠️ This directory is NOT deployed

The functions in this directory are **optional advanced features** and are not deployed to Netlify.

---

## Why Not Active?

### Netlify Forms handles email notifications natively!

The contact form uses **Netlify Forms** which has built-in email notifications. You don't need custom serverless functions for basic email sending.

**To receive contact form emails:**
1. Go to Netlify Dashboard → Site Settings → Forms → Form notifications
2. Click "Add notification"
3. Select "Email notification"
4. Enter your email address

That's it! No code, no API keys, no dependencies needed.

---

## When Would You Use These Functions?

The `send-contact-email.ts.example` function is only needed if you want:
- Custom email templates (beyond Netlify's default)
- Additional processing of form data
- Integration with third-party services (SendGrid, etc.)
- Custom email routing logic

---

## How to Enable (Advanced)

If you want to use the custom function:

### 1. Install dependencies
```bash
pnpm add @netlify/functions
pnpm add @sendgrid/mail  # if using SendGrid
```

### 2. Rename and move function to active directory
```bash
# Rename the example file
mv netlify-functions-optional/functions/send-contact-email.ts.example netlify-functions-optional/functions/send-contact-email.ts

# Move to active directory
mkdir -p netlify/functions
mv netlify-functions-optional/functions/* netlify/functions/
```

### 3. Set environment variables
In Netlify Dashboard → Site Settings → Environment Variables:
- `CONTACT_EMAIL` - Your email address
- `SENDGRID_API_KEY` - Your SendGrid API key (if using SendGrid)

### 4. Deploy
The function will be deployed as `/.netlify/functions/send-contact-email`

---

## For Most Users: Use Netlify Forms

✅ **Recommended:** Use Netlify Forms' built-in email notifications  
❌ **Not needed:** Custom serverless functions for basic email

Keep it simple! 🚀
