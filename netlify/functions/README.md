# Netlify Functions

## About This Directory

This directory contains serverless functions for the Netlify deployment.

## send-contact-email.ts

**Status:** Optional - Only needed if using advanced email customization

**Purpose:** Sends custom-formatted emails when contact form is submitted

**Requirements:**
```bash
npm install @netlify/functions
npm install @sendgrid/mail  # Or your preferred email service
```

## 🎯 Recommended Approach

**Use Netlify Forms built-in email notifications instead!**

No code needed - just configure in Netlify dashboard:
1. Settings > Forms > Form notifications
2. Add email notification
3. Enter your email address
4. Done!

See `/CONTACT_FORM_SETUP.md` for full instructions.

## When to Use This Function

Only if you need:
- Custom email templates
- Multiple recipients based on form data
- Integration with specific email service
- Advanced email logic

## Note on Linting

The TypeScript error for `@netlify/functions` is expected until you:
1. Install the package: `npm install @netlify/functions`
2. Or delete this function if using simple Netlify Forms

The contact form works perfectly without this function!
