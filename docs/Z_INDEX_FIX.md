# Z-Index Stacking Fix

**Issue:** Command modal appearing behind the map  
**Date:** October 4, 2025  
**Status:** ✅ FIXED

---

## Problem

The Quick Action Palette (command modal) was appearing behind the GlobalEventMap component, making it unusable.

**Screenshot Evidence:** Modal visible but behind map layer

---

## Root Cause

Z-index stacking conflict:
- **GlobalEventMap (fullscreen):** `z-[9999]`
- **Quick Action Palette:** `z-50` (too low!)

---

## Solution

Updated Quick Action Palette z-index values:

### Before:
```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />

{/* Command Palette */}
<div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl">
```

### After:
```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm" />

{/* Command Palette */}
<div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[10000] w-full max-w-2xl">
```

---

## Z-Index Hierarchy (Updated)

| Component | Z-Index | Purpose |
|-----------|---------|---------|
| Base content | `z-0` | Normal page content |
| Sidebar | `z-50` | Navigation sidebar |
| Mobile backdrop | `z-40` | Mobile menu overlay |
| Notification dropdown | `z-40` | Notification panel |
| Security alerts | `z-50` | Security notifications |
| Map (fullscreen) | `z-[9999]` | Fullscreen map view |
| **Modal backdrop** | **`z-[9999]`** | **Modal overlay** |
| **Modal content** | **`z-[10000]`** | **Modal dialogs** |

---

## Files Changed

- ✅ `components/dashboard/QuickActionPalette.tsx`
  - Backdrop: `z-50` → `z-[9999]`
  - Modal: `z-50` → `z-[10000]`

---

## Testing

**Test Steps:**
1. Open dashboard with map visible
2. Press `⌘K` or click "Quick Actions" button
3. Verify modal appears **above** the map
4. Verify backdrop darkens entire screen
5. Click backdrop to close modal
6. Verify modal closes properly

**Expected Result:**
- ✅ Modal appears on top of everything
- ✅ Backdrop covers entire screen including map
- ✅ Modal is fully interactive
- ✅ Can close by clicking backdrop or pressing ESC

---

## Prevention

### Z-Index Guidelines

**Use these standard z-index values:**

```typescript
// Standard z-index scale
const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 9998,
  fullscreen: 9999,
  modalOverlay: 9999,
  modalContent: 10000,
}
```

**Rules:**
1. **Modals always highest:** `z-[10000]`
2. **Fullscreen elements:** `z-[9999]`
3. **Notifications:** `z-[9998]`
4. **Regular overlays:** `z-40` to `z-50`
5. **Navigation:** `z-30` to `z-40`

---

## Related Components

Other components that might need similar fixes:

### Already Correct:
- ✅ GlobalEventMap fullscreen: `z-[9999]`
- ✅ Security alerts: `z-50` (below modals, correct)
- ✅ Sidebar: `z-50` (below modals, correct)

### Potential Issues (Monitor):
- Notification dropdown: `z-40` (should be fine)
- Mobile sidebar backdrop: `z-40` (should be fine)

---

## Future Considerations

### If Adding New Modals:

```tsx
// Template for new modals
export function NewModal({ isOpen, onClose }) {
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop - always z-[9999] */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content - always z-[10000] */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
          {/* Modal content here */}
        </div>
      </div>
    </>
  )
}
```

### Best Practices:
1. Always use backdrop + content pattern
2. Backdrop at `z-[9999]`
3. Content at `z-[10000]`
4. Use `fixed` positioning
5. Add `backdrop-blur-sm` for better UX
6. Handle ESC key to close
7. Prevent body scroll when open

---

## Verification

**Build Status:** ✅ No errors  
**Visual Test:** ✅ Modal appears correctly  
**Interaction Test:** ✅ Fully functional  
**Cross-browser:** ✅ Works in Chrome, Safari, Firefox

---

**Status:** ✅ RESOLVED  
**Deploy:** Ready for production
