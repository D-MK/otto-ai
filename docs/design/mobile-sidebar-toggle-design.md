# Mobile Sidebar Toggle Design Plan

## Overview

This document outlines the design plan for implementing a fullscreen sidebar toggle feature for mobile views in the Notes, Settings, and other tabs. The goal is to provide users with a toggle that fills the view area with the sidebar content, allowing them to easily access and navigate sidebar content on mobile devices.

## Current State Analysis

### Existing Implementation

1. **Sidebar Behavior (Mobile)**
   - Currently uses an overlay style that slides in from the left
   - Width: 85% of screen, max-width: 350px
   - Position: Fixed, below header (60px) and above mobile nav (56px)
   - Backdrop: Semi-transparent overlay (rgba(0, 0, 0, 0.5))
   - Animation: Slide-in/out with 0.3s ease transition
   - Z-index: 100 (sidebar), 99 (backdrop)

2. **Mobile Sidebar Toggle Button**
   - Location: Fixed position, bottom-right (above mobile nav)
   - Visibility: Only shown for Settings, Notes, and Scripts tabs
   - Current behavior: Toggles sidebar overlay visibility

3. **Tabs Affected**
   - **Notes**: Has its own internal sidebar for note list
   - **Settings**: Has sidebar with settings sections (API Keys, MCP Servers, etc.)
   - **Scripts**: Has sidebar with script list
   - **Chat**: Uses sidebar for script browsing (different use case)

### User Pain Points

1. **Limited Visibility**: Sidebar only takes 85% width, making it hard to see all content
2. **Content Overlap**: Main content area is still partially visible, causing distraction
3. **No Fullscreen Mode**: Users cannot focus entirely on sidebar content
4. **Inconsistent Behavior**: Different tabs handle sidebar differently

## Proposed Solution

### Design Goals

1. **Fullscreen Toggle**: Add ability to toggle sidebar to fullscreen mode
2. **Seamless Transition**: Smooth animation between overlay and fullscreen modes
3. **Clear Visual Feedback**: Obvious toggle button and state indicators
4. **Consistent UX**: Same behavior across Notes, Settings, and Scripts tabs
5. **Accessibility**: Keyboard navigation and screen reader support

### Implementation Approach

#### Phase 1: Sidebar State Management

**New State Variables:**
- `isFullscreen`: Boolean to track fullscreen mode
- Default: `false` (overlay mode)
- Toggle between overlay and fullscreen modes

**State Flow:**
```
Collapsed (hidden) → Overlay (85% width) → Fullscreen (100% width)
```

#### Phase 2: UI Components

**1. Toggle Button Enhancement**
- **Location**: Inside sidebar header (mobile only)
- **Icon**: 
  - Overlay mode: Expand icon (⛶ or similar)
  - Fullscreen mode: Compress icon (⛶ or similar)
- **Position**: Right side of sidebar header
- **Behavior**: Toggles between overlay and fullscreen

**2. Back Button (Fullscreen Mode)**
- **Location**: Top-left of sidebar header when in fullscreen
- **Icon**: ← or ✕
- **Behavior**: Returns to overlay mode or closes sidebar

**3. Visual Indicators**
- Header shows current mode (optional text: "Fullscreen" / "Overlay")
- Smooth transition animation (0.3s ease)
- Backdrop behavior:
  - Overlay mode: Semi-transparent backdrop
  - Fullscreen mode: Solid backdrop (optional, or no backdrop)

#### Phase 3: CSS Styling

**Mobile Sidebar States:**

```css
/* Overlay Mode (Current) */
.sidebar.expanded {
  width: 85%;
  max-width: 350px;
  transform: translateX(0);
}

/* Fullscreen Mode (New) */
.sidebar.fullscreen {
  width: 100%;
  max-width: 100%;
  transform: translateX(0);
  top: 0;
  bottom: 0;
  z-index: 101; /* Above overlay mode */
}

/* Backdrop adjustments */
.sidebar-backdrop.fullscreen {
  background: rgba(0, 0, 0, 0.9); /* Darker for fullscreen */
}
```

**Responsive Breakpoints:**
- Mobile: `@media (max-width: 768px)`
- Desktop: No changes (sidebar always visible, no toggle needed)

#### Phase 4: Component Updates

**Sidebar Component (`Sidebar.tsx`)**
- Add `isFullscreen` state
- Add toggle function: `toggleFullscreen()`
- Update `toggleSidebar()` to handle both collapse/expand and fullscreen toggle
- Add fullscreen toggle button in header
- Update CSS classes based on state

**App Component (`App.tsx`)**
- No changes needed (uses existing sidebar ref)

**Notes Component (`Notes.tsx`)**
- Ensure sidebar toggle works with Notes internal sidebar
- May need coordination between main sidebar and notes sidebar

**Settings Component (`Settings.tsx`)**
- Ensure settings sections are accessible in fullscreen mode
- Verify scrolling behavior in fullscreen

## Detailed Design Specifications

### 1. Toggle Button Design

**Location**: Right side of sidebar header (mobile only)

**Visual Design:**
- Size: 40px × 40px
- Background: Transparent or subtle background
- Icon: 
  - Overlay → Fullscreen: Expand icon (⛶ or ⤢)
  - Fullscreen → Overlay: Compress icon (⛶ or ⤡)
- Color: White (matches header)
- Hover: Slight scale or opacity change

**Accessibility:**
- `aria-label`: "Toggle fullscreen sidebar"
- `aria-expanded`: `true` when fullscreen, `false` when overlay
- Keyboard: Enter/Space to toggle

### 2. Fullscreen Mode Behavior

**Layout:**
- Sidebar takes 100% width
- Sidebar takes 100% height (top: 0, bottom: 0)
- Main content completely hidden (not just covered)
- No backdrop needed (or optional darker backdrop)

**Navigation:**
- Back button in header to return to overlay mode
- Close button (✕) to collapse sidebar entirely
- Swipe gesture support (optional, future enhancement)

**Content:**
- All sidebar content visible and scrollable
- No content clipping
- Proper padding and spacing maintained

### 3. Animation & Transitions

**Transition Properties:**
- Duration: 0.3s
- Easing: `ease-in-out`
- Properties: `width`, `transform`, `opacity`

**Animation Sequence:**
1. User clicks toggle
2. Sidebar width animates from 85% to 100%
3. Sidebar position adjusts (top: 0, bottom: 0)
4. Backdrop (if used) fades to darker
5. Toggle button icon changes

### 4. State Management

**State Variables:**
```typescript
const [isCollapsed, setIsCollapsed] = useState(true);
const [isFullscreen, setIsFullscreen] = useState(false);
```

**State Combinations:**
- `isCollapsed: true, isFullscreen: false` → Sidebar hidden
- `isCollapsed: false, isFullscreen: false` → Sidebar overlay (85% width)
- `isCollapsed: false, isFullscreen: true` → Sidebar fullscreen (100% width)

**State Transitions:**
- Toggle button: `overlay ↔ fullscreen`
- Back button: `fullscreen → overlay`
- Close button: `fullscreen → collapsed`
- Backdrop click: `overlay → collapsed` (fullscreen mode: no backdrop click)

## Implementation Checklist

### Phase 1: Core Functionality
- [ ] Add `isFullscreen` state to Sidebar component
- [ ] Add `toggleFullscreen()` function
- [ ] Update `toggleSidebar()` to handle fullscreen state
- [ ] Add fullscreen toggle button to sidebar header
- [ ] Update CSS classes for fullscreen mode

### Phase 2: Styling
- [ ] Create fullscreen CSS styles
- [ ] Add transition animations
- [ ] Update backdrop styling for fullscreen
- [ ] Ensure proper z-index layering
- [ ] Test responsive behavior

### Phase 3: UX Enhancements
- [ ] Add back button in fullscreen mode
- [ ] Update toggle button icons
- [ ] Add visual state indicators
- [ ] Ensure smooth transitions
- [ ] Test on various mobile screen sizes

### Phase 4: Testing
- [ ] Test on Notes tab
- [ ] Test on Settings tab
- [ ] Test on Scripts tab
- [ ] Test state persistence (optional)
- [ ] Test accessibility (keyboard, screen readers)
- [ ] Test on different mobile devices/browsers

### Phase 5: Documentation
- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Update README with new feature
- [ ] Create user guide (if needed)

## Technical Considerations

### Performance
- Use CSS transforms for animations (GPU-accelerated)
- Avoid layout thrashing during transitions
- Debounce rapid toggle clicks (optional)

### Accessibility
- Ensure keyboard navigation works
- Screen reader announcements for state changes
- Focus management when toggling modes
- ARIA attributes for all interactive elements

### Browser Compatibility
- Test on iOS Safari
- Test on Android Chrome
- Test on mobile Firefox
- Ensure touch events work correctly

### Edge Cases
- Very small screens (< 320px width)
- Landscape orientation
- Rapid toggling
- Multiple tabs open simultaneously

## Future Enhancements

1. **Swipe Gestures**: Swipe left/right to toggle modes
2. **State Persistence**: Remember user preference (overlay vs fullscreen)
3. **Split View**: Optional split-screen mode (sidebar + content)
4. **Animation Preferences**: User-configurable animation speed
5. **Haptic Feedback**: Vibration on toggle (mobile devices)

## User Experience Flow

### Scenario 1: Opening Sidebar in Fullscreen
1. User is on Notes tab (mobile)
2. User taps mobile sidebar toggle button (bottom-right)
3. Sidebar slides in as overlay (85% width)
4. User taps expand icon in sidebar header
5. Sidebar expands to fullscreen (100% width)
6. User can now see all sidebar content clearly

### Scenario 2: Returning from Fullscreen
1. User is viewing sidebar in fullscreen mode
2. User taps back button (←) or compress icon
3. Sidebar returns to overlay mode (85% width)
4. User can continue working with sidebar visible

### Scenario 3: Closing Sidebar
1. User is in fullscreen mode
2. User taps close button (✕)
3. Sidebar collapses completely
4. User returns to main content view

## Success Metrics

- **Usability**: Users can easily access all sidebar content
- **Efficiency**: Reduced number of taps to access sidebar items
- **Satisfaction**: Users find the fullscreen mode helpful
- **Performance**: Smooth animations without lag
- **Accessibility**: All users can use the feature

## Conclusion

This design plan provides a comprehensive approach to implementing a fullscreen sidebar toggle for mobile views. The solution addresses user pain points while maintaining consistency with the existing design system. Implementation should be done in phases to ensure quality and testability.

