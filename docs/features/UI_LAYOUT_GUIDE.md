# UI & Layout Architecture Guide

**Last Updated:** August 2025  
**Version:** 1.0  
**Authors:** Development Team

---

## Table of Contents

- [Overview](#overview)
- [Sidebar Layout System](#sidebar-layout-system)
- [Component Architecture](#component-architecture)
- [Recent Fixes](#recent-fixes)
- [Responsive Design](#responsive-design)
- [Customization Guide](#customization-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

This document covers the UI and layout architecture for OmniCRM, focusing on the sidebar-based layout system built with **shadcn/ui components** and **Tailwind CSS**.

### Key Design Principles

- **Mobile-first responsive design**
- **Floating sidebar** with icon collapse functionality
- **Full viewport height** utilization regardless of zoom level
- **Consistent spacing** and visual hierarchy
- **Accessibility-compliant** navigation patterns

---

## Sidebar Layout System

### Architecture Overview

The application uses a modern sidebar layout pattern with the following structure:

```txt
┌─────────────────────────────────────────────────────┐
│                    Header (64px)                    │ top-0
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Floating   │            Main Content              │
│   Sidebar    │         (SidebarInset)               │
│  (256px w)   │                                      │
│              │                                      │
│   [Header]   │  ┌─────────────────────────────────┐ │
│   [Nav]      │  │     Page Content Area           │ │
│   [Footer]   │  │                                 │ │
│              │  └─────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────┘ bottom-0
```

### Implementation Details

#### MainLayout Component

**File:** `/src/components/layout/MainLayout.tsx`

```typescript
export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  return (
    <SidebarProvider>
      <div className="flex w-full">
        <Sidebar collapsible="icon" variant="floating">
          <SidebarHeader>
            <SidebarBrandHeader />
          </SidebarHeader>
          <SidebarContent>
            <AppSidebarController />
          </SidebarContent>
          <SidebarFooter>
            <UserNav />
            <SidebarFooterControls />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-16 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <DynamicBreadcrumb />
            <MainSectionNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
```

#### Critical Height Fix

**Problem:** Sidebar was cutting off at the bottom and not maintaining full viewport height.

**Solution:** Modified the sidebar container CSS in `/src/components/ui/sidebar.tsx`:

```typescript
// Line 224 - Fixed height calculation
className={cn(
  "fixed top-16 bottom-0 z-10 hidden h-[calc(100vh-4rem)] w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
  // ... other classes
)}
```

**Key Changes:**

- `top-16` - Positions below the 64px header
- `bottom-0` - Extends to viewport bottom
- `h-[calc(100vh-4rem)]` - Height accounts for header offset
- Ensures full height regardless of zoom level

---

## Component Architecture

### Sidebar Components Structure

```txt
SidebarProvider (Context & State Management)
└── Sidebar (Main Container)
    ├── SidebarHeader
    │   └── SidebarBrandHeader (Logo/Branding)
    ├── SidebarContent
    │   └── AppSidebarController (Route-based Navigation)
    ├── SidebarFooter
    │   ├── UserNav (User Profile/Actions)
    │   └── SidebarFooterControls (Additional Controls)
    └── SidebarRail (Resize Handle)
```

### Key Component Files

1. **MainLayout** (`/src/components/layout/MainLayout.tsx`)
   - Root layout wrapper
   - Manages sidebar state
   - Contains header and main content areas

2. **Sidebar UI** (`/src/components/ui/sidebar.tsx`)
   - Core sidebar component library
   - Handles responsive behavior
   - Contains the height fix

3. **SidebarBrandHeader** (`/src/components/layout/SidebarBrandHeader.tsx`)
   - Application branding
   - Logo and title display

4. **UserNav** (`/src/components/layout/UserNav.tsx`)
   - User authentication display
   - Profile dropdown
   - Authentication actions

5. **AppSidebarController** (`/src/components/layout/AppSidebarController.tsx`)
   - Route-based navigation
   - Dynamic menu generation

---

## Recent Fixes

### Issue: Sidebar Height Cut-off

**Problem:** The floating sidebar was not extending to the full viewport height. When zooming out or on screens with different heights, the sidebar would cut off partway down the screen.

**Root Cause:** The sidebar container was using `h-svh` (screen viewport height) with a `top-16` offset, but the height calculation didn't account for the header offset.

**Fix Applied:**

```typescript
// Before (problematic)
"fixed top-16 bottom-0 z-10 hidden h-svh w-(--sidebar-width)";

// After (fixed)
"fixed top-16 bottom-0 z-10 hidden h-[calc(100vh-4rem)] w-(--sidebar-width)";
```

**Result:** Sidebar now properly extends from below the header to the bottom of the viewport on all screen sizes and zoom levels.

### User Experience Improvements

- **Floating footer revealed**: The height fix revealed additional footer components that were previously hidden
- **Consistent viewport usage**: Sidebar now utilizes the full available screen space
- **Better visual hierarchy**: Proper spacing between header, content, and footer areas

---

## Responsive Design

### Breakpoint Behavior

#### Desktop (md and above)

- **Sidebar:** Fixed position, floating style with icon collapse
- **Width:** 16rem (256px) expanded, 3rem (48px) collapsed
- **Interaction:** Click to toggle, keyboard shortcut (Cmd/Ctrl + B)

#### Mobile (below md)

- **Sidebar:** Sheet overlay that slides in from the left
- **Width:** 18rem (288px) when open
- **Interaction:** Tap trigger to open, tap outside to close

### CSS Custom Properties

```css
:root {
  --sidebar-width: 16rem;
  --sidebar-width-icon: 3rem;
  --sidebar-width-mobile: 18rem;
}
```

### State Management

The sidebar uses React Context for state management:

```typescript
interface SidebarContextProps {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}
```

---

## Customization Guide

### Changing Sidebar Width

Modify the CSS custom properties in `/src/components/ui/sidebar.tsx`:

```typescript
const SIDEBAR_WIDTH = "16rem"; // Expanded width
const SIDEBAR_WIDTH_MOBILE = "18rem"; // Mobile width
const SIDEBAR_WIDTH_ICON = "3rem"; // Collapsed width
```

### Modifying Header Height

If you need to change the header height, update both:

1. **Header component** height class
2. **Sidebar positioning** calculations

```typescript
// Update both of these together
"sticky top-16 z-40 flex h-16"; // Header height
"fixed top-16 bottom-0 z-10 hidden h-[calc(100vh-4rem)]"; // Sidebar offset
```

### Adding Custom Sidebar Content

Extend the sidebar by modifying the relevant sections in `MainLayout.tsx`:

```typescript
<SidebarContent>
  <AppSidebarController />
  {/* Add your custom content here */}
</SidebarContent>
```

---

## Troubleshooting

### Common Issues

#### Sidebar Not Full Height

**Symptoms:** Sidebar cuts off partway down the screen

**Solution:** Verify the height calculation in sidebar.tsx:

```typescript
"h-[calc(100vh-4rem)]"; // Should account for header height
```

#### Mobile Sidebar Not Working

**Symptoms:** Sidebar doesn't open on mobile devices

**Check:**

1. `useIsMobile` hook is working correctly
2. Sheet component is properly imported
3. Touch events are not being prevented

#### Content Behind Sidebar

**Symptoms:** Main content appears behind the sidebar

**Solution:** Ensure proper z-index values:

- Sidebar: `z-10`
- Header: `z-40`
- Overlays: `z-50`

#### Keyboard Shortcut Not Working

**Symptoms:** Cmd/Ctrl + B doesn't toggle sidebar

**Check:** Event listener in sidebar.tsx:

```typescript
React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      toggleSidebar();
    }
  };
  // ...
}, [toggleSidebar]);
```

### Performance Considerations

- **Transitions:** Hardware-accelerated transforms for smooth animations
- **Viewport units:** Use `vh` for consistent height calculations
- **Memory:** Sidebar state persists in localStorage via cookies

---

## Best Practices

### Layout Guidelines

1. **Maintain consistent spacing** using Tailwind's spacing scale
2. **Use semantic HTML** for accessibility
3. **Implement proper focus management** for keyboard navigation
4. **Test on multiple screen sizes** and zoom levels
5. **Ensure touch targets** are at least 44px on mobile

### Component Development

1. **Follow the existing component patterns** in `/src/components/layout/`
2. **Use TypeScript interfaces** for prop definitions
3. **Implement proper error boundaries** for layout components
4. **Test responsive behavior** across breakpoints

### Accessibility

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus visible** indicators
- **Reduced motion** support for animations

---

**Document Version:** 1.0 - Created August 2025  
**Status:** ✅ Current and Accurate  
**Next Update:** When layout system changes significantly
