# OmniConnect Components Documentation

This document provides a comprehensive overview of all components in the OmniConnect module, their usage status, and architectural explanations.

## Component Inventory

### 🟢 ACTIVE COMPONENTS (Currently Used)

#### Core Layout & Navigation

- **`ConnectPage.tsx`** - Main page component that orchestrates the entire OmniConnect dashboard
- **`ConnectHeader.tsx`** - Header component with navigation and action buttons
- **`ConnectErrorBanner.tsx`** - Error display banner for connection issues
- **`ConnectSidebar.tsx`** - Sidebar navigation for OmniConnect views (floating design)

#### Dashboard Cards (Top Row)

- **`ConnectIntelligenceDashboardCard.tsx`** - Email Intelligence Hub card (50% width)
- **`TemplateAutomationCard.tsx`** - Template and automation features card (25% width)
- **`ConnectConnectionStatusCard.tsx`** - Gmail connection status with sync controls (25% width)

#### Gmail Integration & Sync

- **`GmailConnectionPrompt.tsx`** - Initial OAuth connection interface
- **`GmailSyncSetup.tsx`** - Post-OAuth sync configuration and initial import UI
- **`GmailSyncTestCard.tsx`** - Sync testing and validation component

#### Main Content Views (Tabbed)

- **`EmailsView.tsx`** - Email preview and management interface
- **`IntelligenceView.tsx`** - AI insights and intelligence dashboard
- **`ConnectSemanticSearchView.tsx`** - Semantic search functionality for emails

#### Data Types

- **`types.ts`** - TypeScript interfaces and type definitions

### 🔴 INACTIVE COMPONENTS (Not Currently Used)

#### Analytics (Future Feature)

- **`analytics/AIInsightsCard.tsx`** - Advanced AI insights card (planned feature)
- **`analytics/CategorizationStatusCard.tsx`** - Email categorization status (planned feature)
- **`analytics/WeeklyIntelligenceSummaryCard.tsx`** - Weekly summary analytics (planned feature)

#### Legacy/Deprecated Components

- **`ConnectDashboardOverview.tsx`** - Old dashboard layout (replaced by ConnectPage.tsx)
- **`ConnectSettingsPanel.tsx`** - Settings panel (functionality moved to direct sync)
- **`GmailEmailPreview.tsx`** - Individual email preview (replaced by EmailsView.tsx)
- **`GmailSyncPreview.tsx`** - Sync preview (replaced by direct sync approach)
- **`TemplateLibraryView.tsx`** - Template library interface (planned feature)

## Architecture Overview

### Gmail Sync Logic

#### Previous Architecture (Deprecated)

- Background job-based sync with settings/preferences
- Multi-step setup with preview and approval workflow
- Complex job queue processing

#### Current Architecture (Active)

The Gmail sync system has been completely redesigned for simplicity and speed:

1. **OAuth Flow**: `GmailConnectionPrompt` → Gmail OAuth → `callback/route.ts`
2. **Redirect to Sync Setup**: OAuth callback redirects to `?step=gmail-sync`
3. **Direct Sync UI**: `GmailSyncSetup` shows sync explanation and "Start Email Import" button
4. **Direct Processing**: `/api/google/gmail/sync-direct` processes emails immediately
5. **Parallel Import**: 5 parallel batches of 20 emails each for maximum speed
6. **No Filtering**: Imports ALL email categories (inbox, promotions, social, etc.)
7. **Real-time Feedback**: Progress tracking and completion stats

#### Key Benefits

- **5x faster** than sequential processing
- **No background jobs** for initial sync
- **Complete email history** with no filtering
- **Immediate results** with real-time progress
- **Incremental sync** via "Sync Now" button (30-day lookback)

### Sidebar Architecture

The sidebar system uses a **floating design** with the following structure:

#### Layout Hierarchy

```txt
MainLayout.tsx (Root)
└── SidebarProvider (Floating variant)
    ├── Sidebar (Fixed positioning, full height)
    │   ├── SidebarHeader (Brand + toggle)
    │   ├── SidebarContent (Navigation)
    │   └── SidebarFooter (User controls)
    └── SidebarInset (Main content area)
        ├── Header (Breadcrumbs)
        └── Content (Page content)
```

#### Critical CSS Fix Applied

Fixed sidebar height calculation to ensure full viewport coverage:

```css
/* Fixed positioning with header offset */
"fixed top-16 bottom-0 z-10 h-[calc(100vh-4rem)]"
```

#### Responsive Behavior

- **Desktop**: Fixed floating sidebar with icon collapse
- **Mobile**: Sheet-based overlay sidebar
- **Collapsible**: Icon-only mode with hover expansion

## Current Page Layout

### Grid Structure

The main dashboard uses a 4-column CSS Grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <div className="lg:col-span-2">
    {" "}
    {/* 50% width */}
    <IntelligenceDashboardCard />
  </div>
  <TemplateAutomationCard /> {/* 25% width */}
  <ConnectConnectionStatusCard /> {/* 25% width */}
</div>
```

### Component Hierarchy

```txt
ConnectPage (Main container)
├── ConnectHeader (Actions & navigation)
├── ConnectErrorBanner (Error display)
├── Top Cards Grid (3 cards, 4-column layout)
│   ├── IntelligenceDashboardCard (2 columns)
│   ├── TemplateAutomationCard (1 column)
│   └── ConnectConnectionStatusCard (1 column)
└── Tabs Content Area
    ├── EmailsView (Default tab)
    ├── ConnectSemanticSearchView (Search tab)
    └── IntelligenceView (Intelligence tab)
```

### State Management

- **React Query**: Server state management with automatic caching
- **useOmniConnect**: Unified dashboard data hook
- **Local State**: UI state (refresh triggers, sync stats)
- **URL Parameters**: Tab navigation via `?view=...` and sync steps via `?step=...`

## Related Files & Dependencies

### Hooks (Active)

- **`src/hooks/use-omni-connect.ts`** - Unified dashboard data hook (replaces multiple Gmail hooks)
- **`src/hooks/use-gmail-sync.ts`** - Gmail sync status and operations
- **`src/hooks/use-gmail-ai.ts`** - AI insights loading and management

### API Routes (Active)

- **`src/app/api/google/gmail/oauth/route.ts`** - Initiate Gmail OAuth flow
- **`src/app/api/google/gmail/callback/route.ts`** - Handle OAuth callback and redirect to sync step
- **`src/app/api/google/gmail/sync-direct/route.ts`** - Direct email import (parallel processing)
- **`src/app/api/omni-connect/dashboard/route.ts`** - Unified dashboard data endpoint
- **`src/app/api/google/gmail/labels/route.ts`** - Gmail labels management
- **`src/app/api/sync/preview/gmail/route.ts`** - Email sync preview (legacy)

### Services & Utilities (Active)

- **`src/server/jobs/processors/sync.ts`** - Background job sync processor (fallback)
- **`src/server/services/gmail-api.service.ts`** - Gmail API service layer
- **`src/server/services/omni-connect-api.service.ts`** - OmniConnect data aggregation
- **`src/server/google/client.ts`** - Google API client management
- **`src/server/google/gmail.ts`** - Gmail-specific API operations
- **`src/lib/api/client.ts`** - API client utilities with CSRF protection

### Deprecated Files (Inactive)

- **`src/hooks/use-gmail-connection.ts`** - ❌ Replaced by use-omni-connect.ts
- **`src/hooks/use-gmail-emails.ts`** - ❌ Replaced by use-omni-connect.ts
- **`src/hooks/use-gmail-job-status.ts`** - ❌ Replaced by use-omni-connect.ts
- **`src/app/api/sync/initial/gmail/route.ts`** - ❌ Removed (was settings-based sync)

## API Integration

### Active Sync Endpoints

- **`/api/google/gmail/oauth`** - Initiate Gmail OAuth flow
- **`/api/google/gmail/callback`** - Handle OAuth callback and redirect to `?step=gmail-sync`
- **`/api/google/gmail/sync-direct`** - Direct email import with parallel processing

### Dashboard Data

- **`/api/omni-connect/dashboard`** - Unified dashboard state aggregation
- **`useOmniConnect`** hook provides centralized data management

## Development Guidelines

### Adding New Components

1. Create component in appropriate subfolder
2. Update this documentation
3. Add to main page imports if active
4. Follow existing TypeScript patterns

### Modifying Sync Logic

The sync system is now simplified - avoid re-adding complexity:

- Keep direct processing approach
- Maintain parallel batch processing
- No sync preferences or filtering
- Focus on speed and reliability

### UI/UX Standards

- **Left alignment** for all text and content
- **Uniform badge styling** for metrics
- **Consistent typography** (text-sm for labels)
- **Green accent** for successful states
- **Clean, minimal design** without redundant text

## Future Development

### Planned Features (Inactive Components)

- Analytics dashboard with weekly summaries
- Advanced AI insights cards
- Template library and automation
- Enhanced categorization status

### Technical Debt

- Remove deprecated components after verification
- Consolidate similar functionality
- Optimize bundle size by removing unused imports

---

_Last Updated: September 14, 2025_
_Architecture: Next.js 15 App Router with React Query_
