# Contact Form Setup Guide

## Overview
The contact form is configured to use **Netlify Forms** with email notifications sent to a secure, hidden email address.

## ✅ What's Already Done

### 1. **Frontend Integration**
- Contact form at `/app/contact/page.tsx` is configured with Netlify Forms
- Form includes `data-netlify="true"` and honeypot spam protection
- Conversion-focused content replaces dummy contact info
- Form fields: name, email, company, phone, subject, message

### 2. **Configuration Files**
- `netlify.toml` - Netlify configuration
- `netlify/functions/send-contact-email.ts` - Serverless function for email (optional)

---

## 🔧 Setup Instructions

### Option 1: Simple Netlify Forms (Recommended)

**No code changes needed!** Just configure in Netlify dashboard:

1. **Deploy to Netlify** (if not already deployed)

2. **Navigate to Form Settings**
   - Go to: Site Settings > Forms > Form notifications
   
3. **Add Email Notification**
   - Click "Add notification"
   - Select "Email notification"
   - Enter your email: `xyz@gmail.com` (or your actual email)
   - Choose form: `contact`
   - Save

4. **Test the Form**
   - Visit your deployed site `/contact`
   - Submit a test form
   - Check your email inbox

✅ **Email address is NEVER exposed in frontend code**
✅ **Spam protection via honeypot**
✅ **All submissions stored in Netlify dashboard**

---

### Option 2: Custom Email via Serverless Function (Advanced)

If you need more control over email content/formatting:

1. **Install Dependencies**
   ```bash
   npm install @netlify/functions
   npm install @sendgrid/mail  # If using SendGrid
   ```

2. **Set Up SendGrid** (or another email service)
   - Sign up at https://sendgrid.com
   - Create API key
   - Verify sender email address

3. **Add Environment Variables in Netlify**
   - Go to: Site Settings > Environment variables
   - Add:
     - `CONTACT_EMAIL` = `xyz@gmail.com`
     - `SENDGRID_API_KEY` = `your-sendgrid-api-key`
     - `SENDGRID_FROM_EMAIL` = `noreply@yourdomain.com`

4. **Update Contact Form Handler**
   
   Modify `/app/contact/page.tsx`:
   
   ```typescript
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()
     setIsSubmitting(true)
     
     try {
       const response = await fetch('/.netlify/functions/send-contact-email', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(formData)
       })
       
       if (response.ok) {
         setSubmitted(true)
       } else {
         throw new Error('Submission failed')
       }
     } catch (error) {
       console.error('Form submission error:', error)
       alert('There was an error sending your message. Please try again.')
     } finally {
       setIsSubmitting(false)
     }
   }
   ```

5. **Uncomment SendGrid Code**
   
   In `netlify/functions/send-contact-email.ts`, uncomment the SendGrid section and install the package.

---

## 🔒 Security Features

### ✅ Email Hidden from Frontend
- Email address stored as environment variable in Netlify
- Never exposed in HTML source code
- Not accessible via browser DevTools

### ✅ Spam Protection
- Honeypot field `bot-field` catches bots
- Netlify's built-in spam filtering
- Form submissions logged for review

### ✅ Validation
- Required fields enforced on frontend and backend
- Email format validation
- Rate limiting via Netlify

---

## 📊 Monitoring Submissions

### View in Netlify Dashboard
1. Go to: Forms > Contact submissions
2. See all form submissions with timestamps
3. Export as CSV for analysis
4. Enable/disable notifications

### Spam Management
- Mark submissions as spam
- Block specific email addresses
- Adjust spam filtering sensitivity

---

## 🎨 Customization

### Change Email Recipient
**In Netlify Dashboard:**
- Site Settings > Forms > Form notifications
- Edit notification
- Change email address
- Save

**OR in Environment Variables:**
- Change `CONTACT_EMAIL` variable

### Modify Form Fields
Edit `/app/contact/page.tsx`:
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  company: '',
  phone: '',
  subject: '',
  message: '',
  // Add new fields here
})
```

Then add corresponding input fields in the JSX.

### Customize Email Template
If using serverless function, modify the `msg` object in `send-contact-email.ts`.

---

## 🧪 Testing

### Test Locally
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run dev server with functions
netlify dev

# Visit http://localhost:8888/contact
# Submit form to test
```

### Test on Staging
1. Deploy to Netlify branch deploy
2. Test form submission
3. Check email delivery
4. Verify data in Forms dashboard

---

## 📝 Current Configuration

- **Form Name:** `contact`
- **Email To:** Set via `CONTACT_EMAIL` environment variable
- **Fields:**
  - name (required)
  - email (required)
  - company (optional)
  - phone (optional)
  - subject (required)
  - message (required)

---

## 🚨 Troubleshooting

### Forms Not Showing Up
- Ensure `data-netlify="true"` is on the `<form>` tag
- Deploy the site (forms only work on deployed sites)
- Check build logs for errors

### Emails Not Arriving
- Check spam folder
- Verify email address in Netlify settings
- Test with different email providers
- Check SendGrid delivery logs (if using custom function)

### Rate Limiting
- Default: 100 submissions per day
- Upgrade Netlify plan for higher limits
- Consider adding custom rate limiting

---

## 📚 Resources

- [Netlify Forms Documentation](https://docs.netlify.com/forms/setup/)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [SendGrid API Docs](https://docs.sendgrid.com/api-reference/)

---

## ✨ Done!

Your contact form is now set up with:
- ✅ Secure email handling
- ✅ Hidden recipient address  
- ✅ Spam protection
- ✅ Conversion-focused content
- ✅ Professional design

Just add your email in Netlify dashboard and you're ready to receive inquiries!
