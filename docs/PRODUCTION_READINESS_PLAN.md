# Production Readiness Plan
**Emergency Alert System - Path to Production**

*Generated: October 3, 2025*
*Target Launch: Today (EOD)*

---

## Executive Summary

Based on comprehensive codebase audit, the system has **strong foundational architecture** with:
- ✅ Robust RBAC system (4 roles, 23 permissions)
- ✅ Multi-tenant organization support
- ✅ Delivery tracking with `readAt` field (database-ready)
- ✅ Audit logging infrastructure
- ✅ Multi-channel notification system

**Critical Gaps for Production:**
1. ❌ No user self-registration flow
2. ❌ No organization signup workflow
3. ⚠️ Read receipts exist in DB but not surfaced in UI
4. ⚠️ CSV bulk import mentioned but not implemented
5. ⚠️ RBAC guards need verification on all routes
6. ⚠️ Duplicate icons in sidebar navigation
7. ❌ No E2E test coverage

---

## Phase 1: Authentication & User Management (Priority: CRITICAL)

### Task 1.1: User Self-Registration System
**Status:** Not Implemented  
**Estimated Time:** 3-4 hours  
**Dependencies:** None

**Requirements:**
- Public registration page (`/register`)
- User approval workflow for admins
- Email verification
- User status management (`isActive`, `approved` fields needed in schema)

**Implementation Plan:**
```typescript
// New DB fields needed:
model User {
  // ... existing fields
  approvalStatus String @default("pending") // "pending", "approved", "rejected"
  approvedBy     String?
  approvedAt     DateTime?
}
```

**Files to Create/Modify:**
1. `/app/register/page.tsx` - Registration form
2. `/app/api/auth/register/route.ts` - Registration endpoint
3. `/app/dashboard/users/page.tsx` - Add approval UI
4. `/app/api/users/approve/route.ts` - Approval endpoint
5. Update Prisma schema

**Acceptance Criteria:**
- [ ] Users can self-register with email/phone
- [ ] Admins receive notification of new registration
- [ ] Admins can approve/reject from dashboard
- [ ] Approved users can login immediately
- [ ] Rejected users see appropriate message

---

### Task 1.2: Admin/Organization Registration
**Status:** Partially Implemented (Organization model exists)  
**Estimated Time:** 2-3 hours

**Requirements:**
- Organization signup page
- First user becomes ORG_ADMIN automatically
- Organization slug validation (unique)
- Organization settings initialization

**Files to Create:**
1. `/app/register/organization/page.tsx`
2. `/app/api/organizations/register/route.ts`
3. Email templates for org approval

**Acceptance Criteria:**
- [ ] Organizations can self-register
- [ ] First user gets ORG_ADMIN role
- [ ] SUPER_ADMIN receives notification
- [ ] Organization slug is unique and validated
- [ ] Default settings are initialized

---

### Task 1.3: Auto-join via Email Domain
**Status:** Not Implemented  
**Estimated Time:** 2 hours

**Requirements:**
- Email domain extraction and matching
- Organization setting to enable/disable auto-join
- Domain verification system

**Schema Changes:**
```typescript
model Organization {
  // ... existing
  emailDomains    String[]  @default([])
  autoJoinEnabled Boolean   @default(false)
}
```

**Files to Modify:**
1. `/app/api/auth/register/route.ts` - Add domain matching logic
2. `/app/dashboard/settings/page.tsx` - Add domain management UI

**Acceptance Criteria:**
- [ ] Admins can configure allowed email domains
- [ ] Users with matching domain auto-join organization
- [ ] Auto-joined users get appropriate default role
- [ ] Email verification still required

---

### Task 1.4: CSV Bulk User Import
**Status:** Not Implemented  
**Estimated Time:** 3 hours

**Requirements:**
- CSV upload UI with validation
- Template CSV download
- Progress indicator for large imports
- Error reporting per row

**CSV Format:**
```csv
name,email,phone,role,groups
John Doe,john@example.com,+1234567890,OPERATOR,"Group A,Group B"
```

**Files to Create:**
1. `/app/dashboard/users/import/page.tsx` - Upload UI
2. `/app/api/users/import/route.ts` - Import processor
3. `/lib/utils/csv-parser.ts` - CSV validation
4. `/public/templates/user-import-template.csv`

**Acceptance Criteria:**
- [ ] Upload accepts .csv files only
- [ ] Validation shows errors before import
- [ ] Progress bar for large imports
- [ ] Success/error summary after import
- [ ] Duplicate detection (by email/phone)

---

## Phase 2: Delivery Tracking & Analytics (Priority: HIGH)

### Task 2.1: Read Receipts & Delivery Status UI
**Status:** Database Ready, UI Missing  
**Estimated Time:** 2-3 hours

**Current State:**
```typescript
// ✅ Already in schema:
model DeliveryLog {
  status       String    // "queued", "sent", "delivered", "failed"
  sentAt       DateTime?
  deliveredAt  DateTime?
  readAt       DateTime? // ✅ EXISTS!
}
```

**UI Components Needed:**
1. Notification detail modal showing per-contact status
2. Real-time status updates via polling/WebSocket
3. Receipt indicators (✓ sent, ✓✓ delivered, ✓✓ read)
4. Export functionality for delivery reports

**Files to Create/Modify:**
1. `/components/dashboard/DeliveryStatusWidget.tsx` - New widget
2. `/app/dashboard/notifications/[id]/page.tsx` - Detail view
3. `/app/api/notifications/status/route.ts` - Status endpoint
4. Update `/app/dashboard/page.tsx` - Add widget

**Acceptance Criteria:**
- [ ] Dashboard shows sent/delivered/read counts
- [ ] Click notification to see per-contact status
- [ ] Visual indicators (checkmarks) for status
- [ ] Export delivery report as CSV
- [ ] Real-time status updates (30s polling)

---

## Phase 3: UX/UI Audit & Improvements (Priority: MEDIUM)

### Task 3.1: Dashboard Widget Audit
**Current Widgets:**
1. GlobalEventMap ✅ Recently improved
2. RealTimeActivityFeed - **Review needed**
3. KeyMetricsWidget - **Review needed**
4. ContactEngagementAnalytics - **Review needed**
5. QuickActionPalette - **Review needed**
6. EventTimelinePlayback - **Review needed**

**Audit Criteria:**
- Loading states
- Error handling
- Empty states
- Mobile responsiveness
- Performance (render time)
- Data refresh frequency
- Accessibility (ARIA labels)

**Action Items:**
- [ ] Test each widget with empty data
- [ ] Test error scenarios
- [ ] Verify mobile layout (< 768px)
- [ ] Add skeleton loaders where missing
- [ ] Implement error boundaries
- [ ] Optimize re-renders (React.memo)

---

### Task 3.2: Page Audit & Cleanup
**Current Pages:**

| Page | Purpose | Keep? | Issues | Priority |
|------|---------|-------|--------|----------|
| `/` | Homepage | ✅ | None | - |
| `/login` | Auth | ✅ | None | - |
| `/dashboard` | Main | ✅ | Widget audit needed | HIGH |
| `/dashboard/alerts` | Earthquake monitoring | ✅ | None | - |
| `/dashboard/tsunami` | Tsunami monitoring | ✅ | None | - |
| `/dashboard/contacts` | Contact management | ✅ | None | - |
| `/dashboard/groups` | Group management | ✅ | Test needed | MEDIUM |
| `/dashboard/alerts/history` | Alert history | ✅ | None | - |
| `/dashboard/notifications` | Notification logs | ✅ | Add receipts | HIGH |
| `/dashboard/audit` | Audit trail | ✅ | RBAC check | HIGH |
| `/dashboard/status` | System status | ✅ | None | - |
| `/dashboard/settings` | Settings | ✅ | RBAC check | HIGH |
| `/about` | About page | ✅ | Review content | LOW |
| `/contact` | Contact page | ? | Redundant? | LOW |
| `/help` | Help docs | ✅ | Update content | MEDIUM |
| `/privacy` | Privacy policy | ✅ | Legal review | CRITICAL |
| `/terms` | Terms of service | ✅ | Legal review | CRITICAL |
| `/compliance` | Compliance | ✅ | Legal review | CRITICAL |
| `/security-policy` | Security | ✅ | Legal review | CRITICAL |
| `/data-sources` | Public info | ✅ | None | - |
| `/test-*` | Debug pages | ❌ | **Remove in prod** | CRITICAL |
| `/debug/*` | Debug pages | ❌ | **Remove in prod** | CRITICAL |

**Action Items:**
- [ ] **Remove `/test-*` and `/debug/*` routes in production**
- [ ] Review `/contact` page - possibly merge with support
- [ ] Legal review of all policy pages
- [ ] Update `/help` with latest features
- [ ] Add "Coming Soon" badges for incomplete features

---

### Task 3.3: Sidebar Icon Improvements
**Current Issues:**

| Nav Item | Current Icon | Issue | Recommended |
|----------|--------------|-------|-------------|
| Contacts | `Users` | ❌ Same as Groups | `User` or `UserCircle` |
| Contact Groups | `Users` | ❌ Same as Contacts | `Users` (keep) |
| Alert History | `Clock` | ✅ OK | - |
| Notifications | `Bell` | ✅ OK | - |
| Audit Trail | `Shield` | ✅ OK | - |
| System Status | `Activity` | ✅ OK | - |

**Recommended Changes:**
```typescript
// components/layout/AppLayout.tsx
const navigation = [
  { name: 'Contacts', icon: UserCircle },      // Changed from Users
  { name: 'Contact Groups', icon: Users },     // Keep
]
```

**Files to Modify:**
1. `/components/layout/AppLayout.tsx` (lines 58-68)

---

## Phase 4: Security & RBAC Audit (Priority: CRITICAL)

### Task 4.1: RBAC Route Protection Audit
**Status:** RBAC system exists, need to verify guards

**Routes to Audit:**

| Route | Required Permission | Guard Status | Action |
|-------|-------------------|--------------|--------|
| `/dashboard` | `VIEW_DASHBOARD` | ❓ Check | Verify |
| `/dashboard/contacts` | `VIEW_CONTACTS` | ❓ Check | Verify |
| `/dashboard/groups` | `VIEW_GROUPS` | ❓ Check | Verify |
| `/dashboard/settings` | `VIEW_SETTINGS` | ❓ Check | Verify |
| `/dashboard/audit` | `VIEW_AUDIT_LOGS` | ❓ Check | Verify |
| `/api/contacts/*` | `MANAGE_CONTACTS` | ❓ Check | Verify |
| `/api/users/*` | `MANAGE_USERS` | ❓ Check | Verify |
| `/api/settings/*` | `MANAGE_SETTINGS` | ❓ Check | Verify |

**Audit Script:**
```bash
# Search for missing AuthGuard usage
grep -r "export default function" app/dashboard/**/*.tsx | \
  grep -v "AuthGuard"
```

**Action Items:**
- [ ] Audit all dashboard pages for `<AuthGuard>` wrapper
- [ ] Audit all API routes for permission checks
- [ ] Add `<Can permission="X">` to sensitive UI elements
- [ ] Test each role (VIEWER, OPERATOR, ORG_ADMIN, SUPER_ADMIN)
- [ ] Document permission matrix in `/docs/PERMISSIONS.md`

---

### Task 4.2: API Security Hardening
**Current State:** NextAuth.js in use ✅

**Checklist:**
- [ ] All API routes check `session`
- [ ] Rate limiting on public endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma ✅)
- [ ] XSS prevention (React ✅)
- [ ] CSRF tokens on mutations
- [ ] Secrets rotation documented

**Files to Review:**
1. All `/app/api/**/route.ts` files
2. `/lib/rbac/authorization.ts`
3. Middleware for rate limiting

---

## Phase 5: Testing & Quality Assurance (Priority: HIGH)

### Task 5.1: User Groups End-to-End Testing
**Test Scenarios:**

1. **Group Creation**
   - [ ] Admin can create group
   - [ ] Operator can create group
   - [ ] Viewer cannot create group

2. **Member Management**
   - [ ] Add contacts to group
   - [ ] Remove contacts from group
   - [ ] Contact appears in multiple groups

3. **Alert Targeting**
   - [ ] Send alert to specific group
   - [ ] Verify only group members notified
   - [ ] Check delivery logs

4. **Group Deletion**
   - [ ] Delete group
   - [ ] Verify contacts not deleted
   - [ ] Verify group memberships cleaned up

**Test Data:**
```sql
-- Create test group
INSERT INTO contact_groups (id, name, description) 
VALUES ('test-group-1', 'Test Group', 'Testing group functionality');

-- Add test contacts
-- ... (script to generate test data)
```

---

### Task 5.2: E2E Testing Suite
**Tool:** Playwright (already in dependencies)

**Critical User Journeys:**

1. **Authentication Flow**
   ```typescript
   test('User can login with phone OTP', async ({ page }) => {
     await page.goto('/login')
     await page.fill('[name="phone"]', '+1234567890')
     await page.click('button[type="submit"]')
     // ... verify OTP sent, enter code, verify dashboard
   })
   ```

2. **Alert Creation & Delivery**
   ```typescript
   test('Operator can create and send earthquake alert', async ({ page }) => {
     // Login as operator
     // Navigate to alerts
     // Create alert
     // Send to contacts
     // Verify delivery logs
   })
   ```

3. **Contact Management**
   - Create contact
   - Edit contact
   - Add to group
   - Delete contact

4. **RBAC Verification**
   - Viewer cannot access settings
   - Operator cannot manage users
   - ORG_ADMIN cannot manage organizations

**Files to Create:**
```
/tests/
  e2e/
    auth.spec.ts
    alerts.spec.ts
    contacts.spec.ts
    groups.spec.ts
    rbac.spec.ts
    notifications.spec.ts
  fixtures/
    test-data.ts
    test-users.ts
```

**Test Coverage Goals:**
- Auth flows: 100%
- Critical paths: 90%
- RBAC guards: 100%
- API endpoints: 80%

---

## Phase 6: Production Deployment Checklist

### Pre-Deployment
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring configured (health checks)
- [ ] Error tracking (Sentry/similar)
- [ ] Rate limiting configured
- [ ] CDN for static assets
- [ ] SSL certificates valid

### Deployment
- [ ] Run `pnpm run build` successfully
- [ ] Database migrations applied
- [ ] Secrets validated
- [ ] Health check endpoint responding
- [ ] Smoke tests passing

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify email/SMS delivery
- [ ] Test user registration flow
- [ ] Verify RBAC permissions
- [ ] Check audit log recording

---

## Estimated Timeline (Today)

### Morning Session (3-4 hours)
1. ✅ **Icon fixes** (15 min) - Quick win
2. 🔧 **User registration** (3 hours)
   - Create registration page
   - Build approval API
   - Test flow

### Afternoon Session (3-4 hours)
3. 🔧 **Read receipts UI** (2 hours)
   - Build status widget
   - Add to dashboard
   - Test real-time updates
4. 🔧 **RBAC audit** (1-2 hours)
   - Check all routes
   - Add missing guards
   - Test each role

### Evening Session (2-3 hours)
5. 🔧 **CSV import** (2 hours)
6. 🔧 **Page cleanup** (30 min)
   - Remove debug routes
   - Legal content review
7. 🔧 **Basic E2E tests** (1 hour)
   - Auth flow
   - Alert creation

### Final Push (1-2 hours)
8. 🔧 **Organization signup** (1-2 hours)
9. ✅ **Deployment prep** (30 min)

**Total: 10-13 hours** (aggressive but achievable)

---

## Risk Assessment

### High Risk
- ❌ **No E2E tests** - Could deploy with hidden bugs
- ❌ **Legal pages not reviewed** - Compliance risk
- ❌ **Debug routes in production** - Security risk

### Medium Risk
- ⚠️ **RBAC not fully audited** - Possible unauthorized access
- ⚠️ **Performance not tested at scale** - May slow under load
- ⚠️ **No error monitoring** - Blind to production issues

### Low Risk
- ℹ️ **Icon confusion** - UX issue, not critical
- ℹ️ **Missing features** - Can deploy with "Coming Soon"

---

## Recommendations

### Must-Have for Production (Today)
1. ✅ User registration system
2. ✅ RBAC audit and fixes
3. ✅ Remove debug routes
4. ✅ Read receipts UI
5. ✅ Basic E2E tests (auth, alerts)

### Nice-to-Have (Can Deploy Without)
1. CSV bulk import
2. Organization auto-signup
3. Email domain auto-join
4. Full E2E coverage
5. Performance optimizations

### Post-Launch (Week 1)
1. Comprehensive E2E tests
2. Load testing
3. Error monitoring setup
4. Analytics integration
5. User feedback collection

---

## Success Criteria

Production launch is successful if:
- ✅ Users can register and login
- ✅ Admins can approve users
- ✅ Alerts can be created and sent
- ✅ Delivery status is visible
- ✅ All roles have appropriate access
- ✅ No debug/test routes accessible
- ✅ System health monitoring active
- ✅ Legal pages published
- ✅ No critical security vulnerabilities

---

## Next Steps

1. **Start with quick wins** (icons, page cleanup)
2. **Build user registration** (most critical)
3. **Add read receipts UI** (high user value)
4. **RBAC audit** (security critical)
5. **Deploy MVP** with remaining items as post-launch

**Let's build this! 🚀**
