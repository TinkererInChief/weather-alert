# Design System Guidelines

## Overview
The Emergency Alert dashboard uses a **hybrid design approach** that balances premium aesthetics with clarity and functionality.

## Design Philosophy

### Core Principles
1. **Clarity First**: Monitoring and status pages prioritize readability over visual flair
2. **Premium Touch**: Main dashboard and CTAs maintain a polished, modern aesthetic
3. **Consistency**: All pages under `/dashboard/*` follow the same design language
4. **Accessibility**: High contrast, solid backgrounds, and clear visual hierarchy

## Component Styling Standards

### 1. Widget Cards (Data Display)
**Use for**: Metrics, status displays, monitoring widgets, information panels

```tsx
className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
```

**Characteristics**:
- Solid white background (`bg-white`)
- Rounded corners (`rounded-xl`)
- Subtle shadow (`shadow-sm`)
- Solid border (`border-slate-200`)
- Standard padding (`p-6`)
- NO backdrop blur
- NO hover transforms

**Examples**:
- Active Contacts Widget
- Feed Status Widget
- Channel Status Widget
- Events By Type Widget
- All widgets in `/dashboard/status`

### 2. Hero/Metric Cards (Highlighted Data)
**Use for**: Key metrics, KPIs, important stats

```tsx
className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 
          transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
```

**Characteristics**:
- Gradient background (color-coded by metric type)
- Rounded corners (`rounded-xl`)
- Colored border matching gradient
- Subtle hover effects allowed
- Icon + number + label layout

**Color Palette**:
- Green: Uptime, success metrics (`from-green-50 to-green-100`)
- Blue: Time-based metrics (`from-blue-50 to-blue-100`)
- Purple: Count/volume metrics (`from-purple-50 to-purple-100`)
- Orange: Performance metrics (`from-orange-50 to-orange-100`)

### 3. Container Cards (Premium)
**Use for**: Main content areas, primary interactive sections on dashboard

```tsx
className="card" // Uses .card class from globals.css
```

**Characteristics**:
- Glassmorphism (`bg-white/90 backdrop-blur-sm`)
- Larger radius (`rounded-2xl`)
- Enhanced shadows (`shadow-lg shadow-slate-200/50`)
- Hover effects (`hover:shadow-xl hover:-translate-y-1`)

**Reserved For**:
- Main dashboard hero sections
- Primary content containers
- Special interactive cards that need emphasis

### 4. Buttons

#### Primary Actions
```tsx
className="btn btn-primary"
```
- Gradient background (blue-cyan)
- Shadow effects
- Hover transforms

#### Secondary Actions
```tsx
className="btn btn-secondary"
```
- White background
- Border
- Subtle hover

#### Status Buttons (Success, Danger, Warning)
```tsx
className="btn btn-success" // or btn-danger, btn-warning
```
- Color-coded gradients
- Used for status-specific actions

## Page-Specific Guidelines

### `/dashboard` (Main Dashboard)
- **Map & Timeline**: Use widget card style (`bg-white rounded-xl shadow-sm`)
- **Testing Controls**: Widget card style
- **System Status Feed**: Widget card style
- **Hero sections**: Can use premium card style if needed
- **CTAs**: Premium gradient buttons

### `/dashboard/status` (System Status)
- **All cards**: Widget card style
- **Hero Metrics**: Gradient metric cards
- **Service cards**: Widget card style
- **Charts**: Widget card style

### `/dashboard/contacts`, `/dashboard/alerts`, etc.
- **Tables**: Widget card style
- **Forms**: Widget card style
- **Action panels**: Widget card style
- **Submit buttons**: Premium gradient buttons

## Typography

### Headings
- Page Title: `text-2xl font-bold text-slate-900`
- Section Title: `text-lg font-semibold text-slate-900`
- Card Title: `text-base font-semibold text-slate-900`
- Subsection: `text-sm font-medium text-slate-700`

### Body Text
- Primary: `text-sm text-slate-700`
- Secondary: `text-xs text-slate-500`
- Muted: `text-xs text-slate-400`

### Numbers/Metrics
- Large: `text-4xl font-bold text-slate-900`
- Medium: `text-2xl font-bold text-slate-900`
- Small: `text-lg font-semibold text-slate-900`

## Colors

### Semantic Colors
- **Success**: `green-50` to `green-900`
- **Warning**: `amber-50` to `amber-900`
- **Error**: `red-50` to `red-900`
- **Info**: `blue-50` to `blue-900`

### Status Colors
- **Healthy**: Green (`green-500`, `green-600`)
- **Warning**: Amber (`amber-500`, `amber-600`)
- **Critical**: Red (`red-500`, `red-600`)
- **Unknown**: Slate (`slate-400`, `slate-500`)

### Neutral Palette
- Background: `slate-50`, `slate-100`
- Text: `slate-700`, `slate-900`
- Borders: `slate-200`, `slate-300`
- Muted: `slate-400`, `slate-500`

## Spacing

### Card Padding
- Default: `p-6`
- Compact: `p-4`
- Large: `p-8`

### Grid Gaps
- Default: `gap-6`
- Compact: `gap-4`

### Section Spacing
- Between sections: `space-y-6`
- Between related items: `space-y-4`

## Animation & Transitions

### Hover Effects
- **Widgets**: Minimal or none (maintain `transition-all duration-200` for smoothness)
- **Buttons**: Transform + shadow (`hover:-translate-y-0.5`)
- **Links**: Color change only

### Loading States
```tsx
className="animate-pulse"
```

### Transitions
- Default: `transition-all duration-200`
- Slow: `transition-all duration-300`

## Accessibility

### Contrast Requirements
- Text: Minimum 4.5:1 contrast ratio
- Icons: Minimum 3:1 contrast ratio
- Borders: Visible in both light modes

### Focus States
- Always include `focus:outline-none focus:ring-2 focus:ring-[color]`
- Ring offset for visibility: `focus:ring-offset-2`

### Semantic HTML
- Use proper heading hierarchy
- Include ARIA labels for icons
- Add roles for interactive elements

## Implementation Checklist

When creating new dashboard pages:

- [ ] Use widget card style for all data display components
- [ ] Use gradient metric cards for KPIs/hero metrics
- [ ] Use premium gradient buttons for primary CTAs
- [ ] Follow typography hierarchy
- [ ] Include loading states
- [ ] Add error states
- [ ] Test color contrast
- [ ] Add ARIA labels
- [ ] Ensure mobile responsiveness
- [ ] Test with backdrop (ensure solid bg-white works)

## Migration Guide

### Updating Existing Components

**Before** (Premium/Glassmorphism):
```tsx
<div className="card">
  {/* content */}
</div>
```

**After** (Widget Style):
```tsx
<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
  {/* content */}
</div>
```

### When to Keep `.card` Class
- Main dashboard hero sections
- Special emphasis sections
- Marketing/landing pages (not dashboard pages)

## File References

- **CSS Variables**: `/app/globals.css`
- **Widget Examples**: `/components/dashboard/*Widget.tsx`
- **Status Page Reference**: `/app/dashboard/status/page.tsx`
- **Main Dashboard**: `/app/dashboard/page.tsx`

## Updates & Versioning

**Last Updated**: 2025-10-06  
**Version**: 1.0  
**Status**: Active

---

For questions or design decisions not covered here, refer to `/dashboard/status` as the canonical reference for widget styling.
