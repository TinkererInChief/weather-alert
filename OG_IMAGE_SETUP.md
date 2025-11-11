# Open Graph Image Setup

## ✅ Done!

Your custom Open Graph image is now configured and ready to use.

---

## 📁 File Location

**Original:** `/Open_Graph_Tsunami Alert.png` (root)  
**Moved to:** `/public/og-image.png`

**File size:** 2.1 MB  
**Recommended size:** 1200x630px

---

## 🔧 What Was Updated

### `/app/layout.tsx`

Updated both Open Graph and Twitter Card metadata:

```typescript
openGraph: {
  images: [
    { 
      url: '/og-image.png', 
      width: 1200, 
      height: 630, 
      alt: 'Tsunami Alert System - Emergency Alert Command Center' 
    },
  ],
},
twitter: {
  card: 'summary_large_image',
  images: ['/og-image.png'],
},
```

---

## 🌐 What This Means

When your site is shared on:
- **Facebook** - Shows your custom tsunami alert image
- **Twitter/X** - Shows your custom tsunami alert image
- **LinkedIn** - Shows your custom tsunami alert image
- **Slack** - Shows your custom tsunami alert image
- **WhatsApp** - Shows your custom tsunami alert image
- **Discord** - Shows your custom tsunami alert image

---

## 🧪 How to Test

### 1. Facebook Debugger
https://developers.facebook.com/tools/debug/

### 2. Twitter Card Validator
https://cards-dev.twitter.com/validator

### 3. LinkedIn Post Inspector
https://www.linkedin.com/post-inspector/

### 4. Open Graph Preview (General)
https://www.opengraph.xyz/

---

## 📊 Image Specifications

### Current Setup:
- **Path:** `/public/og-image.png`
- **Dimensions:** 1200x630px (recommended)
- **Format:** PNG
- **File size:** ~2.1 MB

### Best Practices:
- ✅ 1200x630px (1.91:1 ratio)
- ✅ PNG or JPG format
- ⚠️ Keep under 5MB for faster loading
- ✅ Text should be readable at small sizes
- ✅ Important content in center (safe zone)

---

## 🔄 To Update the Image Later

1. **Replace the file:**
   ```bash
   # Replace /public/og-image.png with new image
   cp /path/to/new-image.png /Users/yash/weather-alert/public/og-image.png
   ```

2. **Clear cache:** (if needed)
   - Use Facebook Debugger to scrape new image
   - Use Twitter Card Validator to refresh
   - May take a few minutes for social platforms to update

3. **Alternative:** Version the filename:
   ```typescript
   images: [{ url: '/og-image-v2.png', ... }]
   ```

---

## 📝 Meta Tags Generated

When deployed, your site will have these meta tags:

```html
<!-- Open Graph -->
<meta property="og:title" content="Emergency Alert Command Center" />
<meta property="og:description" content="Real-time earthquake and tsunami monitoring with multi-channel emergency notifications" />
<meta property="og:image" content="https://yoursite.com/og-image.png" />
<meta property="og:url" content="https://yoursite.com/" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_US" />
<meta property="og:site_name" content="Emergency Alert Command Center" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Emergency Alert Command Center" />
<meta name="twitter:description" content="Real-time earthquake and tsunami monitoring with multi-channel emergency notifications" />
<meta name="twitter:image" content="https://yoursite.com/og-image.png" />
```

---

## ✨ Result

Your tsunami alert Open Graph image will now appear when anyone shares your site on social media! 🌊📱

**Next steps:**
1. Deploy to production
2. Test with social media debuggers
3. Share and verify the preview looks good
