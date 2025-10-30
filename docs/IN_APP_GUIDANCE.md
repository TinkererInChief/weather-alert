# In-App Guidance System

## Overview

The Emergency Alert System includes a comprehensive in-app guidance system built with **Driver.js** to help users learn the interface through interactive tours, contextual help, and feature announcements.

## Features

### 📚 Interactive Tours

Guided walkthroughs of key features:

- **Dashboard Tour**: Introduction to command center components
- **Alert Creation Tour**: Step-by-step alert creation guide  
- **Delivery Logs Tour**: Understanding message tracking
- **Communications Tour**: Channel management walkthrough
- **Earthquake Monitoring Tour**: Seismic data filtering and alerting

### 💡 Contextual Help

- **Help Tooltips**: Hover over `?` icons for inline explanations
- **Help Button**: Access tours and documentation from any page
- **Tour Replay**: Restart tours anytime from the help menu

### 🎉 Feature Announcements

- **What's New Modal**: Automatically shows new features after updates
- **Version-based Tracking**: Only shows once per version
- **Dismissable**: Users can close and won't see again

## Usage

### For New Users

Tours automatically start on first visit to help onboard users quickly:

1. **Dashboard Tour** starts automatically on first dashboard visit
2. Step through the tour using Next/Previous buttons
3. Press `ESC` to exit at any time
4. Tours can be replayed via the Help button

### For Existing Users

Access tours and help anytime:

1. Click the **Help button** (question mark icon) in the top-right
2. Select a tour from the dropdown menu
3. Choose "Documentation" for detailed guides
4. Use "Reset All Tours" to see all tours again

### For Developers

#### Adding New Tours

1. **Define Tour Steps** in `lib/guidance/tours.ts`:

```typescript
export const myNewTourSteps: DriveStep[] = [
  {
    element: '#my-element',
    popover: {
      title: 'Step Title',
      description: 'Step description',
      side: "bottom",
      align: 'start'
    }
  }
]
```

2. **Create Tour Hook** in `hooks/useTour.ts`:

```typescript
export const useMyNewTour = (autoStart = false) => {
  return useTour(TourId.MY_NEW_TOUR, myNewTourSteps, { autoStart })
}
```

3. **Add Tour ID** to enum in `lib/guidance/tours.ts`:

```typescript
export enum TourId {
  // ... existing tours
  MY_NEW_TOUR = 'my-new-tour',
}
```

4. **Integrate in Component**:

```typescript
import { useMyNewTour } from '@/hooks/useTour'
import { TourId } from '@/lib/guidance/tours'
import HelpButton from '@/components/guidance/HelpButton'

export default function MyComponent() {
  const myTour = useMyNewTour(true) // Auto-start for new users
  
  return (
    <div>
      <HelpButton 
        tours={[
          {
            id: TourId.MY_NEW_TOUR,
            label: 'My Feature Tour',
            onStart: () => myTour.restartTour()
          }
        ]}
      />
      {/* Your component content with tour target IDs */}
      <div id="my-element">Content to highlight</div>
    </div>
  )
}
```

#### Adding Contextual Help

Use the `HelpTooltip` component for inline help:

```typescript
import HelpTooltip from '@/components/guidance/HelpTooltip'

<div className="flex items-center gap-2">
  <label>Field Label</label>
  <HelpTooltip 
    title="Field Explanation"
    content="Detailed description of what this field does and how to use it."
    side="right"
  />
</div>
```

#### Creating Feature Announcements

Add new features to the announcement modal:

```typescript
import FeatureAnnouncement from '@/components/guidance/FeatureAnnouncement'
import { Bell, MessageSquare, TrendingUp } from 'lucide-react'

<FeatureAnnouncement
  version="1.1.0"
  features={[
    {
      id: 'webhook-tracking',
      title: 'Webhook-based Message Tracking',
      description: 'Real-time acknowledgment tracking via webhooks from Twilio and SendGrid.',
      icon: <Bell className="h-5 w-5" />,
      link: {
        text: 'Learn more',
        href: '/docs/webhooks'
      }
    },
    {
      id: 'improved-ui',
      title: 'Enhanced SMS Icon',
      description: 'Updated SMS channel icon for better visual clarity.',
      icon: <MessageSquare className="h-5 w-5" />
    }
  ]}
/>
```

## Tour Configuration

### Tour Behavior

Tours are configured with these defaults:

- **Animate**: Smooth transitions between steps
- **Show Progress**: Display "X of Y" progress indicator
- **Overlay**: Dark overlay to focus attention
- **Allow Close**: Users can exit with ESC or close button
- **Smooth Scroll**: Auto-scroll to highlighted elements

### Customization

Override defaults when creating tours:

```typescript
const customTour = createTour(steps, {
  animate: false,           // Disable animations
  showProgress: false,      // Hide progress indicator
  allowClose: false,        // Require completion
  overlayColor: 'rgba(0, 0, 0, 0.9)', // Darker overlay
})
```

## Styling

Tours use custom styles defined in `app/globals.css`:

- Matches Emergency Alert System theme
- Blue gradient buttons
- Rounded corners with shadows
- Responsive design

To customize:

1. Edit `.driver-popover-*` classes in `globals.css`
2. Update `baseConfig` in `lib/guidance/tours.ts`
3. Modify button styles in globals.css

## Tracking

Tour completion is tracked in localStorage:

- **Key Format**: `tour-completed-{tourId}`
- **Date Tracking**: `tour-completed-{tourId}-date`
- **New User Detection**: Checks if any tour has been completed

### Utility Functions

```typescript
import { isTourCompleted, markTourCompleted, resetTour } from '@/lib/guidance/tours'

// Check if tour completed
if (isTourCompleted(TourId.DASHBOARD)) {
  // User has seen dashboard tour
}

// Manually mark as completed
markTourCompleted(TourId.DASHBOARD)

// Reset for replay
resetTour(TourId.DASHBOARD)
```

## Best Practices

### Tour Design

1. **Keep it Short**: 4-6 steps maximum per tour
2. **Clear Titles**: Use emoji + descriptive text (e.g., "🗺️ Global Event Map")
3. **Actionable**: Focus on what users can DO, not just what things are
4. **Progressive**: Start with basics, advanced features in separate tours
5. **Test Positioning**: Ensure popovers don't cover important content

### Element Targeting

1. **Use IDs**: Add unique IDs to tour target elements
2. **Stable Selectors**: Avoid dynamic IDs or classes
3. **Visibility**: Ensure elements are visible and not behind modals
4. **Timing**: Wait for async content to load before starting tours

### Content Writing

1. **Be Concise**: 1-2 sentences per step
2. **Use Active Voice**: "Click here" not "This can be clicked"
3. **Explain Why**: Not just what, but why it matters
4. **Include Examples**: Show actual use cases

## Troubleshooting

### Tour Not Starting

- Check element exists in DOM with the correct ID
- Ensure component is mounted before tour starts
- Verify auto-start delay (default 500ms)
- Check browser console for errors

### Popover Position Wrong

- Adjust `side` property: `'top' | 'right' | 'bottom' | 'left'`
- Adjust `align` property: `'start' | 'center' | 'end'`
- Increase viewport size for better positioning
- Check for CSS z-index conflicts

### Styling Issues

- Clear browser cache (CSS may be cached)
- Check Tailwind compilation
- Verify @apply directives in globals.css
- Inspect driver.js CSS classes in DevTools

## Files Reference

```
lib/guidance/
├── tours.ts                 # Tour definitions and utilities

hooks/
├── useTour.ts              # Tour management hooks

components/guidance/
├── HelpButton.tsx          # Help menu with tour access
├── HelpTooltip.tsx         # Contextual help tooltips
└── FeatureAnnouncement.tsx # What's new modal

app/
└── globals.css             # Driver.js custom styles
```

## Dependencies

- **driver.js**: ^1.3.6 - Core tour engine
- **@radix-ui/react-dropdown-menu**: ^2.1.16 - Help button dropdown
- **@radix-ui/react-popover**: Already installed - Tooltip popovers
- **framer-motion**: Already installed - Announcement animations

## Future Enhancements

Potential additions to the guidance system:

- [ ] Context-aware tours (show relevant tour based on user's current page)
- [ ] Analytics integration (track tour completion rates)
- [ ] Video tutorials embedded in tours
- [ ] Multi-language support
- [ ] User feedback collection after tours
- [ ] Conditional steps based on user permissions
- [ ] Keyboard shortcuts guide
- [ ] Interactive playground for testing features

## Support

For questions or issues with the guidance system:

1. Check this documentation
2. Review tour definitions in `lib/guidance/tours.ts`
3. Test in browser DevTools for element targeting issues
4. Check Driver.js documentation: https://driverjs.com/

---

**Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Author**: Emergency Alert System Team
