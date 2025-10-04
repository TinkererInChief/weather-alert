# 🧪 Production Testing Guide
**Environment:** Railway Production (Test Environment)  
**URL:** https://appealing-playfulness-production.up.railway.app  
**Date:** October 4, 2025

---

## 🚨 Current Issue: Unable to Access Some Pages

### Likely Causes:
1. **Not logged in** - Most pages require authentication
2. **Wrong role** - Some pages require admin permissions
3. **User not approved** - New registrations need approval
4. **Session expired** - Need to re-login

---

## 📋 Step-by-Step Testing Plan

### Phase 1: Initial Access & Authentication

#### Step 1.1: Check if You Have a User Account
```bash
# Option A: Check database directly
# Connect to Railway database and run:
SELECT id, email, phone, role, "approvalStatus", "isActive" 
FROM users 
ORDER BY "createdAt" DESC;

# Option B: Use Railway CLI
railway run psql $DATABASE_URL -c "SELECT email, role, \"approvalStatus\", \"isActive\" FROM users;"
```

**Expected Results:**
- If you see your account: Note the `role` and `approvalStatus`
- If no accounts exist: You need to create one

---

#### Step 1.2: Create Your First Admin User (If Needed)

**Option A: Direct Database Insert (Recommended for first user)**
```sql
-- Connect to Railway database
INSERT INTO users (
  id, 
  email, 
  phone, 
  name, 
  role, 
  "isActive", 
  "approvalStatus",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'your-email@example.com',
  '+1234567890',
  'Admin User',
  'SUPER_ADMIN',
  true,
  'approved',
  NOW(),
  NOW()
);
```

**Option B: Use Registration Flow (For subsequent users)**
1. Go to: `https://appealing-playfulness-production.up.railway.app/register`
2. Fill in the form
3. Submit registration
4. Have an admin approve you (or approve yourself via database)

---

#### Step 1.3: Login to the System

1. **Navigate to Login Page:**
   ```
   https://appealing-playfulness-production.up.railway.app/login
   ```

2. **Enter your phone number** (the one in the database)

3. **Request OTP** - You should receive an SMS

4. **Enter OTP code**

5. **Verify you're logged in** - Should redirect to `/dashboard`

**Troubleshooting Login:**
- **No SMS received?** Check Twilio credentials in `.env.local`
- **Invalid OTP?** Check if OTP is being generated (check `sms_otps` table)
- **Redirects to login?** Session might not be created properly

---

### Phase 2: Test Each Page Systematically

#### 2.1: Public Pages (No Auth Required)

| Page | URL | Expected Result | Test |
|------|-----|-----------------|------|
| Homepage | `/` | Landing page loads | ✅ Should work |
| Login | `/login` | Login form displays | ✅ Should work |
| Register | `/register` | Registration form displays | ✅ Should work |
| About | `/about` | About page loads | ✅ Should work |
| Help | `/help` | Help documentation | ✅ Should work |
| Privacy | `/privacy` | Privacy policy | ✅ Should work |
| Terms | `/terms` | Terms of service | ✅ Should work |
| Data Sources | `/data-sources` | Data sources info | ✅ Should work |

**Test Command:**
```bash
# Test public pages
curl -I https://appealing-playfulness-production.up.railway.app/
curl -I https://appealing-playfulness-production.up.railway.app/register
curl -I https://appealing-playfulness-production.up.railway.app/login
```

---

#### 2.2: Protected Dashboard Pages (Auth Required)

**Prerequisites:** Must be logged in

| Page | URL | Required Role | Expected Result |
|------|-----|---------------|-----------------|
| Dashboard | `/dashboard` | Any authenticated | Main dashboard |
| Earthquake Monitoring | `/dashboard/alerts` | Any authenticated | Earthquake map & alerts |
| Tsunami Monitoring | `/dashboard/tsunami` | Any authenticated | Tsunami monitoring |
| Contacts | `/dashboard/contacts` | Any authenticated | Contact list & CRUD |
| Contact Groups | `/dashboard/groups` | Any authenticated | Group management |
| Alert History | `/dashboard/alerts/history` | Any authenticated | Past alerts |
| Notifications | `/dashboard/notifications` | Any authenticated | Notification logs |
| Audit Trail | `/dashboard/audit` | Any authenticated | System audit logs |
| System Status | `/dashboard/status` | Any authenticated | Health checks |

**How to Test:**
1. Login first
2. Navigate to each URL
3. Verify page loads without redirect to `/login`

**If you get redirected to login:**
- Session expired - login again
- Cookie not being set - check browser settings
- Auth middleware issue - check server logs

---

#### 2.3: Admin-Only Pages (Requires Admin Role)

| Page | URL | Required Role | Expected Result |
|------|-----|---------------|-----------------|
| User Management | `/dashboard/users` | SUPER_ADMIN or ORG_ADMIN | User approval dashboard |
| Settings | `/dashboard/settings` | SUPER_ADMIN or ORG_ADMIN | System settings |

**How to Test:**
1. Login as admin user (SUPER_ADMIN or ORG_ADMIN)
2. Navigate to `/dashboard/users`
3. Should see user management interface

**If you see "Access Denied":**
- Your user role is not admin
- Update your role in database:
  ```sql
  UPDATE users 
  SET role = 'SUPER_ADMIN' 
  WHERE email = 'your-email@example.com';
  ```

---

### Phase 3: Test New Features

#### 3.1: User Registration Flow

**Test Steps:**
1. Open incognito/private window
2. Go to `/register`
3. Fill form with test data:
   - Name: Test User
   - Email: test@example.com
   - Phone: +1234567891
4. Submit form
5. Verify success message
6. Check database:
   ```sql
   SELECT * FROM users WHERE email = 'test@example.com';
   ```
7. Verify `approvalStatus = 'pending'` and `isActive = false`

**Expected Result:**
- ✅ User created with pending status
- ✅ Cannot login until approved
- ✅ Audit log entry created

---

#### 3.2: User Approval Flow

**Test Steps:**
1. Login as admin
2. Go to `/dashboard/users`
3. Should see test user in "Pending" tab
4. Click "Approve" button
5. Verify user status changes to "Approved"
6. Check database:
   ```sql
   SELECT "approvalStatus", "isActive", "approvedBy", "approvedAt" 
   FROM users 
   WHERE email = 'test@example.com';
   ```

**Expected Result:**
- ✅ Status changes to 'approved'
- ✅ `isActive` set to `true`
- ✅ `approvedBy` and `approvedAt` populated
- ✅ Audit log entry created

---

#### 3.3: Delivery Status Widget

**Test Steps:**
1. Login as any user
2. Go to `/dashboard`
3. Scroll down to "Delivery Status" widget
4. Verify it loads (may show 0 if no messages sent yet)
5. Try switching time ranges (24h, 7d, 30d)

**Expected Result:**
- ✅ Widget displays without errors
- ✅ Shows statistics (even if 0)
- ✅ Time range selector works
- ✅ Auto-refreshes every 30 seconds

**If widget shows errors:**
- Check `/api/delivery/stats` endpoint
- Verify `delivery_logs` table exists
- Check browser console for errors

---

### Phase 4: API Endpoint Testing

#### 4.1: Test API Endpoints with curl

**Registration API:**
```bash
curl -X POST https://appealing-playfulness-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test User",
    "email": "apitest@example.com",
    "phone": "+1234567892"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Your account is pending approval.",
  "userId": "..."
}
```

---

**Users List API (requires auth):**
```bash
# First, get your session cookie from browser
# Then:
curl https://appealing-playfulness-production.up.railway.app/api/users \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [...]
}
```

---

**Delivery Stats API (requires auth):**
```bash
curl https://appealing-playfulness-production.up.railway.app/api/delivery/stats?range=24h \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total": 0,
    "sent": 0,
    "delivered": 0,
    "read": 0,
    "failed": 0,
    "queued": 0,
    "byChannel": {...}
  }
}
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Unauthorized" or Redirects to Login

**Symptoms:**
- Can't access any dashboard pages
- Always redirected to `/login`

**Solutions:**
1. **Clear browser cookies and cache**
2. **Login again**
3. **Check if user is active:**
   ```sql
   SELECT "isActive", "approvalStatus" FROM users WHERE email = 'your-email';
   ```
4. **Verify NextAuth configuration:**
   - Check `NEXTAUTH_URL` in `.env.local`
   - Should be: `https://appealing-playfulness-production.up.railway.app`
   - Check `NEXTAUTH_SECRET` is set

---

### Issue 2: "Access Denied" on Admin Pages

**Symptoms:**
- Can access dashboard but not `/dashboard/users`
- See "Access Denied" message

**Solutions:**
1. **Check your role:**
   ```sql
   SELECT role FROM users WHERE email = 'your-email';
   ```
2. **Update to admin if needed:**
   ```sql
   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your-email';
   ```
3. **Logout and login again** to refresh session

---

### Issue 3: OTP Not Received

**Symptoms:**
- Enter phone number
- No SMS received

**Solutions:**
1. **Check Twilio credentials** in Railway environment variables
2. **Check Twilio console** for delivery status
3. **Verify phone number format** (must be E.164: +1234567890)
4. **Check `sms_otps` table:**
   ```sql
   SELECT * FROM sms_otps ORDER BY "createdAt" DESC LIMIT 5;
   ```
5. **Manual OTP retrieval** (for testing):
   ```sql
   SELECT "tokenHash" FROM sms_otps 
   WHERE phone = '+1234567890' 
   ORDER BY "createdAt" DESC LIMIT 1;
   ```

---

### Issue 4: Pages Load But Show Errors

**Symptoms:**
- Page loads but shows error messages
- Components fail to render

**Solutions:**
1. **Check browser console** for JavaScript errors
2. **Check Railway logs:**
   ```bash
   railway logs
   ```
3. **Verify database connection:**
   ```bash
   railway run psql $DATABASE_URL -c "SELECT 1;"
   ```
4. **Check API responses** in Network tab

---

## 📊 Testing Checklist

### Pre-Testing Setup
- [ ] Database accessible
- [ ] At least one SUPER_ADMIN user exists
- [ ] User is approved and active
- [ ] Can login successfully
- [ ] Session persists across page loads

### Public Pages
- [ ] Homepage loads
- [ ] Registration page works
- [ ] Login page works
- [ ] All policy pages accessible

### Dashboard Pages (Any User)
- [ ] Main dashboard loads
- [ ] Earthquake monitoring works
- [ ] Tsunami monitoring works
- [ ] Contacts page accessible
- [ ] Groups page accessible
- [ ] Alert history loads
- [ ] Notifications page works
- [ ] Audit trail accessible
- [ ] System status shows

### Admin Pages
- [ ] User management accessible
- [ ] Can see pending users
- [ ] Can approve users
- [ ] Can reject users
- [ ] Settings page accessible

### New Features
- [ ] Registration creates pending user
- [ ] Approval workflow works
- [ ] Delivery status widget loads
- [ ] Time range selector works
- [ ] Statistics display correctly

### API Endpoints
- [ ] Registration API works
- [ ] Approval API works (admin only)
- [ ] Users list API works (auth required)
- [ ] Delivery stats API works (auth required)

---

## 🚀 Quick Start Commands

### Create First Admin User (Direct Database)
```bash
# Connect to Railway database
railway run psql $DATABASE_URL

# Then run:
INSERT INTO users (id, email, phone, name, role, "isActive", "approvalStatus", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  '+1234567890',
  'System Admin',
  'SUPER_ADMIN',
  true,
  'approved',
  NOW(),
  NOW()
);
```

### Check Current Users
```bash
railway run psql $DATABASE_URL -c "SELECT email, role, \"approvalStatus\", \"isActive\" FROM users;"
```

### Make User Admin
```bash
railway run psql $DATABASE_URL -c "UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your-email@example.com';"
```

### View Recent Audit Logs
```bash
railway run psql $DATABASE_URL -c "SELECT action, resource, \"createdAt\" FROM audit_logs ORDER BY \"createdAt\" DESC LIMIT 10;"
```

---

## 📞 Need Help?

### Check These First:
1. **Railway Logs:** `railway logs --tail`
2. **Browser Console:** F12 → Console tab
3. **Network Tab:** F12 → Network tab
4. **Database State:** Run SQL queries above

### Common Commands:
```bash
# View logs
railway logs --tail

# Check environment variables
railway variables

# Restart service
railway up

# Connect to database
railway run psql $DATABASE_URL
```

---

## ✅ Success Criteria

You've successfully tested production when:
- ✅ Can create and login as admin user
- ✅ Can access all dashboard pages
- ✅ Can register new users via `/register`
- ✅ Can approve users via `/dashboard/users`
- ✅ Delivery status widget displays
- ✅ No console errors on any page
- ✅ All API endpoints respond correctly

---

**Next Steps After Testing:**
1. Document any issues found
2. Fix critical bugs
3. Create real admin accounts
4. Set up monitoring
5. Ready for real users! 🎉
