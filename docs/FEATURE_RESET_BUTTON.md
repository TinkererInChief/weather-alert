# Feature: Reset Button for Custom Scenario Panel

## Overview
Added a reset button to quickly clear all inputs and start fresh in the Custom Scenario Panel.

## Visual Location

```
┌─────────────────────────────────────────┐
│ 🎛️ Custom Scenario        [🔄] [🔽]    │
│                           ↑ Reset button │
└─────────────────────────────────────────┘
```

## What Gets Reset

### Quick Form Tab
- **Name**: Cleared to empty
- **Epicenter Lat**: Reset to 35.0°
- **Epicenter Lon**: Reset to 140.0°
- **Magnitude**: Reset to 7.5
- **Depth**: Reset to 30 km
- **Fault Type**: Reset to "thrust"
- **Advanced options**: Collapsed

### AI Assistant Tab
- **Prompt**: Cleared to empty
- **Generated scenario**: Removed
- **Validation messages**: Cleared

### Validation State
- All coordinate validation cleared
- Warning messages removed
- Success indicators cleared

### Loading States
- `isGenerating`: Reset to false
- `isFixingCoordinates`: Reset to false

## User Benefits

### 🎯 Quick Start Over
No need to manually clear each field - one click resets everything

### 🧹 Clean Slate
Remove all previous inputs and generated scenarios instantly

### ⚡ Fast Workflow
Quickly try different scenarios without browser refresh

### 🔒 Safe Operation
Only resets the Custom Scenario panel, doesn't affect:
- Running simulations
- Historical scenario list
- Map view
- Other dashboard elements

## Usage

### When to Use Reset
- **After generating a scenario** you don't want
- **Before creating a new scenario** from scratch
- **When form is cluttered** with test data
- **To clear validation warnings** and start fresh

### How to Use
1. Click the **🔄 reset icon** in the panel header
2. All fields instantly clear
3. Default values restored
4. Ready for new input

## Button Behavior

### States

#### Normal State
```
Icon: 🔄
Tooltip: "Reset all fields"
Action: Clears all inputs
```

#### Disabled State
```
When: Simulation is running (disabled prop)
Visual: Grayed out
Action: No action
```

### Position
- **Location**: Panel header, right side
- **Order**: Before collapse button
- **Alignment**: Horizontal with title

## Technical Details

### Function: `handleReset()`
```typescript
const handleReset = () => {
  // Reset Quick Form
  setName('')
  setEpicenterLat(35.0)
  setEpicenterLon(140.0)
  setMagnitude([7.5])
  setDepth(30)
  setFaultType('thrust')
  setShowAdvanced(false)
  
  // Reset AI Assistant
  setAiPrompt('')
  setGeneratedScenario(null)
  
  // Reset validation state
  setCoordinateValidation({
    isValidating: false,
    isValid: true,
    isOverWater: true,
    message: undefined
  })
  
  // Reset loading states
  setIsGenerating(false)
  setIsFixingCoordinates(false)
}
```

### Default Values
| Field | Default Value | Reason |
|-------|--------------|---------|
| Lat | 35.0° | Central Japan region |
| Lon | 140.0° | Pacific Ocean |
| Magnitude | 7.5 | Moderate tsunami-generating event |
| Depth | 30 km | Typical subduction zone depth |
| Fault Type | Thrust | Most tsunamigenic type |

## UI Design

### Icon: RotateCcw
- **From**: lucide-react
- **Size**: 4x4 (16px)
- **Color**: Inherits from button style
- **Animation**: None (instant reset)

### Button Style
- **Variant**: ghost (subtle)
- **Size**: sm (small)
- **Padding**: px-2 (horizontal)
- **Height**: h-8 (32px)

### Accessibility
- `title` attribute for tooltip
- `disabled` state respects parent disabled prop
- Keyboard accessible (focusable)

## User Scenarios

### Scenario 1: Experimenting
```
User: Creates scenario with AI
User: Doesn't like result
User: Clicks reset
Result: Clean form, try again
```

### Scenario 2: Multiple Attempts
```
User: Tries manual coordinates
User: Validation fails
User: Clicks reset
User: Uses AI instead
```

### Scenario 3: Teaching/Demo
```
User: Shows feature to others
User: Creates test scenario
User: Clicks reset before next demo
Result: Clean slate for next person
```

## Edge Cases

### 1. Reset During Generation
**If AI is generating:**
- Button is disabled
- Cannot interrupt generation
- Wait for completion first

### 2. Reset After Validation Error
**If coordinates invalid:**
- Error message cleared
- Validation state reset
- Ready for new input

### 3. Reset with Unsaved Changes
**No confirmation dialog:**
- Instant reset (by design)
- User can always re-enter
- Undo not needed (simple form)

## Future Enhancements

### Possible Improvements
1. **Confirm dialog** - "Reset all fields?"
2. **Undo button** - Restore previous values
3. **Smart reset** - Only reset current tab
4. **Reset history** - Track what was reset
5. **Keyboard shortcut** - Ctrl+R or similar

### Advanced Features
1. **Save presets** - Save configurations before reset
2. **Recent scenarios** - Quick access to previous inputs
3. **Reset animation** - Visual feedback of clearing
4. **Reset options** - Choose what to reset

## Comparison with Other Reset Patterns

### This Implementation: Quick Reset
✅ One-click clear all
✅ No confirmation needed
✅ Instant action
✅ Simple UX

### Alternative: Confirmation Dialog
❌ Extra click required
✅ Prevents accidents
❌ Slower workflow
✅ More explicit

### Alternative: Per-Field Clear
❌ Multiple actions needed
✅ Granular control
❌ Time consuming
✅ Selective clearing

**Decision:** Quick reset chosen for speed and simplicity. Forms are not complex enough to need confirmation.

## Testing

### Test Cases
1. ✅ Click reset clears Quick Form inputs
2. ✅ Click reset clears AI prompt
3. ✅ Click reset removes generated scenario
4. ✅ Click reset clears validation messages
5. ✅ Reset works in collapsed state
6. ✅ Reset button disabled during simulation
7. ✅ Reset sets default values correctly
8. ✅ Reset doesn't affect Historical tab

### Manual Testing Steps
1. Fill out Quick Form completely
2. Click reset
3. Verify all fields back to defaults
4. Switch to AI tab
5. Enter prompt and generate
6. Click reset
7. Verify prompt and scenario cleared
8. Try reset while panel is collapsed
9. Verify it still works

## Files Modified

**File**: `/app/dashboard/simulate-tsunami/components/CustomScenarioPanel.tsx`

**Changes**:
- Added `RotateCcw` icon import
- Added `handleReset()` function
- Added reset button in header
- Button positioned before collapse button

## Deployment

✅ **Safe to deploy**
- No breaking changes
- Pure UI enhancement
- No backend changes needed
- No migrations required

## Summary

The reset button provides a **quick and intuitive way** to clear the Custom Scenario Panel and start fresh. It's **always accessible** in the header, **respects disabled state** during simulations, and **resets all relevant state** across both tabs.

**User Impact**: Positive - saves time and reduces friction when creating multiple scenarios.
