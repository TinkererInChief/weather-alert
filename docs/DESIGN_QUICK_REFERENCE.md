# Design System Quick Reference

> **TL;DR**: Use clean widget style for data, premium style for hero sections

## Component Styles Cheat Sheet

### 📊 Data Display Widget
```tsx
<div className="widget-card">
  {/* or */}
  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
</div>
```
**Use for**: Status displays, data tables, forms, monitoring widgets

### 📈 KPI/Metric Card
```tsx
<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 
                border border-green-200 transition-all duration-300 
                hover:shadow-lg hover:-translate-y-0.5">
</div>
```
**Colors**: Green (uptime), Blue (time), Purple (counts), Orange (performance)

### ✨ Premium Section
```tsx
<div className="card">
</div>
```
**Use for**: Hero sections, special emphasis (use sparingly)

## Buttons

| Type | Class | Use Case |
|------|-------|----------|
| Primary | `btn btn-primary` | Main actions, submit buttons |
| Secondary | `btn btn-secondary` | Cancel, alternative actions |
| Success | `btn btn-success` | Confirmations |
| Danger | `btn btn-danger` | Delete, destructive actions |
| Warning | `btn btn-warning` | Caution actions |

## Typography

```tsx
// Page Title
className="text-2xl font-bold text-slate-900"

// Section Title
className="text-lg font-semibold text-slate-900"

// Card Title
className="text-base font-semibold text-slate-900"

// Body Text
className="text-sm text-slate-700"

// Secondary Text
className="text-xs text-slate-500"

// Large Metric
className="text-4xl font-bold text-slate-900"
```

## Colors

### Status
- ✅ Success: `green-500`, `green-600`
- ⚠️ Warning: `amber-500`, `amber-600`
- ❌ Error: `red-500`, `red-600`
- ℹ️ Info: `blue-500`, `blue-600`

### Backgrounds
- Metric Green: `from-green-50 to-green-100`
- Metric Blue: `from-blue-50 to-blue-100`
- Metric Purple: `from-purple-50 to-purple-100`
- Metric Orange: `from-orange-50 to-orange-100`

## Spacing

```tsx
// Card padding
p-6        // Default
p-4        // Compact

// Grid gaps
gap-6      // Default
gap-4      // Compact

// Sections
space-y-6  // Between sections
space-y-4  // Within sections
```

## Decision Tree

```
Need to display data?
├─ Yes
│  ├─ Is it a KPI metric with importance?
│  │  └─ Use: Gradient metric card
│  └─ Regular data/status?
│     └─ Use: widget-card
└─ Is it a hero/emphasis section?
   └─ Use: card (sparingly)
```

## Examples

### Good ✅
```tsx
// Status widget
<div className="widget-card">
  <h3 className="text-base font-semibold text-slate-900">Active Contacts</h3>
  <p className="text-4xl font-bold text-slate-900">42</p>
</div>

// Uptime metric
<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 
                border border-green-200">
  <p className="text-sm font-medium text-green-700">Uptime</p>
  <p className="text-3xl font-bold text-green-900">99.9%</p>
</div>

// Primary button
<button className="btn btn-primary">
  Save Changes
</button>
```

### Avoid ❌
```tsx
// Don't: Glassmorphism on data widgets
<div className="card">
  <p>Active Contacts: 42</p>
</div>

// Don't: Plain white on metrics
<div className="bg-white rounded-xl">
  <p>Uptime: 99.9%</p>
</div>

// Don't: Mixing styles
<div className="bg-white/90 backdrop-blur-sm shadow-lg">
  {/* This should be widget-card */}
</div>
```

## Reference Pages

- 📖 Full Docs: `/docs/DESIGN_SYSTEM.md`
- 🎯 Implementation: `/docs/DESIGN_SYSTEM_IMPLEMENTATION.md`
- 🔍 Example: `/app/dashboard/status/page.tsx`

## Quick Checks

Before committing:
- [ ] Data widgets use `widget-card` or equivalent
- [ ] Metrics use gradient backgrounds
- [ ] Buttons use `btn btn-*` classes
- [ ] Typography follows hierarchy
- [ ] Spacing uses `gap-6` and `space-y-6`
- [ ] Colors match semantic meaning

---

**Questions?** Check `/dashboard/status` for reference implementation.
