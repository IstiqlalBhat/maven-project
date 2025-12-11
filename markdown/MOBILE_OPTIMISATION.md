# Mobile Optimisation

> This document was generated with AI assistance (Claude Code) 😊

This document details the mobile UI optimizations implemented in the PitchTracker application to ensure a seamless experience on mobile devices and tablets.

---

## Overview

The mobile optimization was completed in two phases, focusing on responsive design patterns, touch interactions, and performance on smaller screens.

### Files Modified

| File | Changes |
|------|---------|
| `src/app/globals.css` | Added mobile utility classes, responsive breakpoints, touch optimizations |
| `src/components/Sidebar.tsx` | Mobile header bar, slide-in drawer navigation, touch-friendly buttons |
| `src/components/ArsenalOverview.tsx` | Responsive card layouts, horizontal scrolling on mobile |
| `src/components/StatsCharts.tsx` | Chart responsiveness, mobile-friendly legends |
| `src/components/PitchComparisonCard.tsx` | Stacked layouts for narrow screens, touch-optimized controls |
| `src/components/SimilarPros.tsx` | Mobile-first card design, responsive grid |
| `src/app/stats/[pitcherId]/page.tsx` | Responsive page layout, mobile spacing |
| `src/app/compare/[pitcherId]/page.tsx` | Mobile-optimized comparison views |

---

## CSS Utilities Added

### Scrollbar Hiding

For cleaner horizontal scroll areas on mobile:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### Touch Manipulation

Prevents 300ms tap delay and enables smoother touch interactions:

```css
.touch-manipulation {
  touch-action: manipulation;
}
```

### Safe Area Support

For devices with notches (iPhone X and later):

```css
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0);
}
```

---

## Responsive Breakpoints

The application uses a mobile-first approach with these breakpoints:

| Breakpoint | Width | Target |
|------------|-------|--------|
| Default | < 640px | Mobile phones |
| `sm` | >= 640px | Large phones, small tablets |
| `md` | >= 768px | Tablets |
| `lg` | >= 1024px | Laptops, desktops |
| `xl` | >= 1280px | Large desktops |

---

## Sidebar / Navigation

### Mobile Header Bar

A fixed header bar appears on screens < 1024px:

- **Height**: 56px (reduced from 64px for more content space)
- **Background**: Semi-transparent white with blur (`bg-white/95 backdrop-blur-lg`)
- **Contents**: App logo, app name, hamburger menu button
- **Safe area**: Respects device notches with `safe-area-top`

### Slide-In Drawer

When the hamburger menu is tapped:

- **Width**: 280px slide-in panel from left
- **Overlay**: Semi-transparent backdrop (`bg-black/40`) with blur
- **Animation**: 300ms ease-in-out transition
- **Close**: Tap overlay or X button

### Desktop Sidebar

On screens >= 1024px:

- **Default width**: 256px (w-64)
- **Collapsed width**: 72px
- **Collapse toggle**: Fixed at bottom of sidebar

---

## Component-Specific Optimizations

### ArsenalOverview

**Desktop**: Grid layout with multiple cards per row

**Mobile**:
- Horizontal scroll container with snap points
- Cards maintain minimum width for readability
- Touch-friendly swipe navigation
- Hidden scrollbar for cleaner appearance

```tsx
// Horizontal scroll on mobile
<div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-3">
  {cards.map(card => (
    <div className="flex-shrink-0 w-[280px] snap-start lg:w-auto">
      {/* card content */}
    </div>
  ))}
</div>
```

### StatsCharts

**Optimizations**:
- Charts resize responsively using `maintainAspectRatio: false`
- Legend positions move to bottom on mobile
- Reduced padding and font sizes on small screens
- Touch-enabled tooltips

### PitchComparisonCard

**Mobile Layout**:
- Percentile bars stack vertically
- Stats display in 2-column grid instead of 4
- Larger touch targets for interactive elements
- Simplified labels on narrow screens

### SimilarPros

**Mobile Layout**:
- Single column card layout
- Full-width cards with adequate touch spacing
- Pitcher images scale appropriately
- Stat badges wrap gracefully

---

## Main Content Area

The `.main-content` class handles proper spacing:

```css
/* Mobile (default) */
.main-content {
  margin-left: 0;
  padding: 1rem;
  padding-top: 4.5rem; /* Account for mobile header */
  min-height: 100vh;
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .main-content {
    padding: 1.5rem;
    padding-top: 4.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .main-content {
    margin-left: 16rem; /* Sidebar width */
    padding: 2rem;
    padding-top: 2rem;
  }

  .main-content.sidebar-collapsed {
    margin-left: 4.5rem;
  }
}
```

---

## Touch Interactions

### Button Sizing

All interactive elements follow touch-friendly sizing:

- **Minimum touch target**: 44x44px (Apple HIG recommendation)
- **Button padding**: `p-2.5` minimum on mobile
- **Spacing between targets**: At least 8px

### Active States

Mobile buttons include active states for feedback:

```tsx
<button className="hover:bg-amber-100 active:bg-amber-200 touch-manipulation">
```

### Gesture Support

- **Swipe**: Horizontal scrolling in card containers
- **Tap**: All clickable elements
- **Press and hold**: Supported where appropriate

---

## Performance Considerations

### Reduced Animations

On mobile, some animations are simplified:
- Shorter transition durations (200ms vs 300ms)
- Reduced blur effects on lower-powered devices
- Simpler shadows

### Image Optimization

- Responsive images with appropriate sizes
- Lazy loading for off-screen content
- WebP format where supported

### CSS Containment

Layout containment is used where appropriate to improve rendering performance:

```css
.glass-card {
  contain: layout style;
}
```

---

## Testing

### Tested Devices/Viewports

- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- iPhone 12/13/14 Pro Max (428px)
- iPad Mini (768px)
- iPad Pro (1024px)
- Various Android devices

### Testing Tools

- Chrome DevTools Device Mode
- Safari Responsive Design Mode
- Real device testing on iOS and Android

---

## Future Improvements

- [ ] Add pull-to-refresh on dashboard
- [ ] Implement offline support with service worker
- [ ] Add haptic feedback for key interactions
- [ ] Optimize chart rendering for low-power mode
- [ ] Add landscape orientation support for tablets

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Project structure
- [DOCUMENTATION.md](DOCUMENTATION.md) - Full technical docs
