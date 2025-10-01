# Quick Start: Testing RBAC & Data Source Traceability

## 🚀 Quick Setup (5 minutes)

### Step 1: Deploy Database Changes

```bash
# If using Railway
railway run npx prisma migrate deploy

# Or locally
npx prisma migrate deploy
```

### Step 2: Create Test Users

```bash
# Create 4 test users with different roles
railway run npx tsx scripts/seed-test-users.ts

# Or locally
npx tsx scripts/seed-test-users.ts
```

You'll see output like:
```
✅ Created SUPER_ADMIN: Super Admin User
   Email: superadmin@test.com
   Phone: +1234567890

✅ Created ORG_ADMIN: Organization Admin
   Email: orgadmin@test.com
   Phone: +1234567891

✅ Created OPERATOR: Operator User
   Email: operator@test.com
   Phone: +1234567892

✅ Created VIEWER: Viewer User
   Email: viewer@test.com
   Phone: +1234567893
```

### 🔑 **Important: Development OTP**

For **all test phone numbers** (+1234567890 through +1234567893), use:

**OTP Code: `123456`**

This works **only in development mode** (`NODE_ENV=development`) and **only for test phone numbers**. Real phone numbers will receive actual SMS OTPs.

⚠️ **Security Note:** This bypass is automatically disabled in production!

---

## 🧪 Testing RBAC

### Test 1: VIEWER Role (Read-Only)

1. **Login**: Go to `/login`, enter `+1234567893`
2. **Enter OTP**: Use `123456` (works for all test users in development)
3. **Try to view**: ✅ Can see contacts and groups
4. **Try to create**: ❌ "Create Group" button should be hidden/disabled
5. **Try API**: ❌ POST requests will return 403 Forbidden

**🔑 Development OTP:** All test phone numbers (+1234567890-93) accept `123456` as the OTP in development mode.

**Expected Behavior:**
- Can navigate and view all pages
- Cannot see action buttons (Create, Edit, Delete)
- API calls for write operations fail with permission error

### Test 2: OPERATOR Role

1. **Login**: Go to `/login`, enter `+1234567892`
2. **Enter OTP**: Use `123456`
3. **Try to view**: ✅ Can see contacts and groups
4. **Try to create group**: ✅ Should work!
5. **Try to delete contact**: ❌ Should fail (no permission)
6. **Try to view audit logs**: ❌ Should be hidden/forbidden

**Expected Behavior:**
- Can create and edit contacts
- Can manage contact groups
- Can send alerts
- Cannot delete contacts
- Cannot access audit logs or user management

### Test 3: ORG_ADMIN Role

1. **Login**: Go to `/login`, enter `+1234567891`
2. **Enter OTP**: Use `123456`
3. **Try everything OPERATOR can**: ✅ All should work
4. **Try to delete contact**: ✅ Should work!
5. **Try to view audit logs**: ✅ Should work!
6. **Try to manage users**: ❌ Should fail (SUPER_ADMIN only)

**Expected Behavior:**
- Can do everything OPERATOR can
- Can delete contacts
- Can view audit logs
- Can manage organization settings
- Cannot manage users or data sources

### Test 4: SUPER_ADMIN Role

1. **Login**: Go to `/login`, enter `+1234567890`
2. **Enter OTP**: Use `123456`
3. **Try everything**: ✅ Everything should work!

**Expected Behavior:**
- Full access to all features
- Can manage users
- Can configure data sources
- Can access all settings

---

## 📊 Testing Data Source Traceability

### Viewing Alert Sources

1. Go to **Dashboard** → **Earthquake Monitoring**
2. Click on any alert
3. Look for "Data Sources" section
4. Should show badges like: `USGS` `EMSC` `JMA`

### Example Alert with Sources

```json
{
  "id": "alert_123",
  "magnitude": 6.5,
  "location": "Off the coast of Japan",
  "dataSources": ["USGS", "JMA", "EMSC"],
  "primarySource": "USGS",
  "sourceMetadata": {
    "usgs": {
      "eventId": "us7000abcd",
      "significance": 850
    },
    "jma": {
      "eventId": "jma2025abcd",
      "intensity": 5
    }
  }
}
```

---

## 🔍 Verifying RBAC is Working

### Check 1: API Response

Try calling a protected endpoint:

```bash
# As VIEWER (should fail)
curl -X POST https://your-app.railway.app/api/contact-groups \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"name":"Test Group"}'

# Expected response:
{
  "success": false,
  "error": "Insufficient permissions",
  "required": "MANAGE_GROUPS",
  "userRole": "VIEWER"
}
```

### Check 2: Audit Logs

```sql
-- View recent permission denials
SELECT 
  u.name,
  u.role,
  a.action,
  a.resource,
  a."createdAt"
FROM audit_logs a
JOIN users u ON a."userId" = u.id
WHERE a.action = 'PERMISSION_DENIED'
ORDER BY a."createdAt" DESC
LIMIT 10;
```

### Check 3: UI Elements

**VIEWER should NOT see:**
- "Create" buttons
- "Edit" buttons
- "Delete" buttons
- Settings pages
- User management

**OPERATOR should see:**
- "Create Contact" button ✅
- "Create Group" button ✅
- "Send Alert" button ✅
- But NOT "Delete Contact" ❌

---

## 🐛 Troubleshooting

### Issue: "No groups yet" even though Contact Groups page exists

**Solution:** The user needs `VIEW_GROUPS` permission. Check user role:

```sql
SELECT id, name, email, role FROM users WHERE email = 'your-email@test.com';
```

If role is `VIEWER`, they should be able to view but not create groups.

### Issue: Cannot create test users

**Error:** `User already exists`

**Solution:** Test users already created. To reset:

```sql
-- Delete existing test users
DELETE FROM users WHERE email LIKE '%@test.com';

-- Then run seed script again
npx tsx scripts/seed-test-users.ts
```

### Issue: Permission denied but user should have access

**Check:**
1. User's role in database
2. Session is valid
3. User is active (`isActive = true`)

```sql
SELECT id, name, role, "isActive" FROM users WHERE id = 'user-id';
```

---

## 📱 Test User Credentials

| Role | Phone | Email | Can Do |
|------|-------|-------|--------|
| **SUPER_ADMIN** | +1234567890 | superadmin@test.com | Everything |
| **ORG_ADMIN** | +1234567891 | orgadmin@test.com | Manage org, view audits |
| **OPERATOR** | +1234567892 | operator@test.com | Manage contacts/groups/alerts |
| **VIEWER** | +1234567893 | viewer@test.com | View only |

---

## 🎯 Quick Test Checklist

- [ ] Can login with all 4 test users
- [ ] VIEWER cannot create groups
- [ ] OPERATOR can create groups
- [ ] OPERATOR cannot delete contacts
- [ ] ORG_ADMIN can delete contacts
- [ ] ORG_ADMIN can view audit logs
- [ ] SUPER_ADMIN can access everything
- [ ] Permission denied attempts are logged
- [ ] Alert sources are displayed correctly

---

## 📚 Full Documentation

For complete details, see:
- [DATA_SOURCE_TRACEABILITY_AND_RBAC.md](./DATA_SOURCE_TRACEABILITY_AND_RBAC.md)

---

## 🆘 Need Help?

1. Check audit logs for permission denials
2. Verify user role in database
3. Ensure session is valid
4. Check browser console for errors
5. Review API responses for error details

**Common Issues:**
- Session expired → Re-login
- Wrong role → Update in database
- User inactive → Set `isActive = true`
- Missing permissions → Check role-permission matrix
