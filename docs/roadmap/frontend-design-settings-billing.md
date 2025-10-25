# Frontend Design: Settings & Billing Interface - Current Implementation

**Date:** October 24, 2025 (Updated from August 12, 2025)
**Project:** OmniCRM Settings & Billing Module
**Status:** ✅ IMPLEMENTED (with documented gaps)

---

## Document Status & Purpose

**This document has been updated to reflect the ACTUAL current implementation** rather than proposed future architecture. It serves as:

1. Documentation of what EXISTS in the codebase
2. Identification of gaps between original design and implementation
3. Reference for future enhancements

### Implementation Status Overview

| Feature | Status | Location |
|---------|--------|----------|
| Settings Navigation | ✅ Implemented | `/settings/_components/SettingsSidebar.tsx` |
| Account Page | ✅ Implemented | `/settings/account/page.tsx` |
| Google Integrations | ✅ Implemented | Gmail & Calendar only |
| Gmail Direct Sync | ✅ Implemented | Simplified - no job polling |
| Theme Toggle | ✅ Implemented | Global header (not settings page) |
| Tags Management | ✅ Implemented | `/settings/tags/page.tsx` (not linked) |
| Billing Page | ❌ Not Implemented | Navigation link exists but no page |
| Notifications Page | ❌ Not Implemented | Navigation link exists but no page |
| Drive Integration | ❌ Not Implemented | Backend exists, no UI settings |
| WhatsApp Integration | ❌ Never Implemented | Removed from design |
| OpenAI Integration | ❌ Never Implemented | Removed from design |

---

## Overview

The settings interface implements a modern, modular architecture using shadcn/ui components with Next.js 15 App Router. The system provides:

1. **Sidebar Navigation** - Persistent settings menu with integration status indicators
2. **Account Management** - User profile with auto-populated data from Supabase Auth
3. **Google Integrations** - Direct OAuth connections for Gmail and Calendar
4. **Simplified Gmail Sync** - Direct sync endpoint (no complex job polling)
5. **Theme Management** - Global header toggle for light/dark/system themes
6. **Tags System** - Wellness-focused semantic tagging (5 categories)

### Key Design Principles (Implemented)

✅ **Modular Component Architecture** - Focused components in `_components/` directories
✅ **Toast-Based Notifications** - Sonner toast system replaces alert() calls
✅ **shadcn/ui Integration** - Consistent design system across all settings
✅ **Auto-populated User Data** - Pulls from Supabase Auth, no manual entry
✅ **Direct Sync Pattern** - Simple POST to sync endpoint, immediate completion

---

## Current Architecture

### 1. Settings Layout Structure

**Main Layout:** `/app/(authorisedRoute)/settings/layout.tsx` uses MainLayout with SettingsSidebar

**Current Navigation Structure:**

```typescript
// /src/app/(authorisedRoute)/settings/_components/SettingsSidebar.tsx
const settingsNavItems = [
  { title: "Account", href: "/settings/account", icon: User },
  { title: "Billing", href: "/settings/billing", icon: CreditCard },      // ⚠️ No page
  { title: "Notifications", href: "/settings/notifications", icon: Bell }, // ⚠️ No page
  { title: "Intake Form", href: "/settings/onboarding", icon: FileText },
];

// Missing from navigation but exists:
// - Tags (/settings/tags) - Full implementation, just needs nav link
```

**Integrations Section (In Sidebar):**

```typescript
<SidebarGroup>
  <SidebarGroupLabel>Integrations</SidebarGroupLabel>
  <SidebarMenu>
    {/* Gmail - Shows connection status, connect button if disconnected */}
    <SidebarMenuItem>
      <Mail /> Gmail
      {syncStatus?.gmail?.connected ? "Connected" : <button>Connect</button>}
    </SidebarMenuItem>

    {/* Calendar - Shows connection status */}
    <SidebarMenuItem>
      <CalendarIcon /> Calendar
      {syncStatus?.calendar?.connected ? "Connected" : <a>Connect</a>}
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarGroup>
```

---

## 2. Account Settings (ACTUAL IMPLEMENTATION)

**Location:** `/app/(authorisedRoute)/settings/account/page.tsx`

### User Data Auto-Population

**✅ IMPLEMENTED:** User information is automatically fetched from Supabase Auth, NOT manually entered or pulled from Google API.

```typescript
// Current implementation pulls from Supabase Auth
useEffect(() => {
  const getUserData = async (): Promise<void> => {
    const { user: currentUser, error } = await fetchCurrentUser();
    if (error || !currentUser) {
      toast.error("Failed to load user data");
      router.push("/");
    } else {
      setUser(currentUser);
    }
  };
  void getUserData();
}, [router]);

// Display shows Supabase user data
<div className="space-y-2">
  <p>
    <span className="font-medium text-violet-400">Email:</span> {user.email}
  </p>
  <p>
    <span className="font-medium text-violet-400">Account Created:</span>{" "}
    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
  </p>
</div>
```

### Features Implemented

✅ **Auto-populated email** from Supabase Auth
✅ **Account creation date** from user metadata
✅ **Password change** functionality
✅ **Sign out** button
✅ **GDPR data management** (export/deletion) via AccountDataManagement component

### Features NOT Implemented

❌ Profile photo upload
❌ Display name editing
❌ Phone number
❌ Bio/description
❌ Pull from Google API (uses Supabase instead)

**Design Decision:** Keep user info simple and auto-populated from Supabase Auth. No need to pull from Google API as Supabase already has the authenticated user's email and metadata.

---

## 3. Google Integrations (ACTUAL IMPLEMENTATION)

### Integration Endpoints

**✅ Gmail:**

- Connect: `POST /api/google/gmail/connect` → Returns OAuth URL
- Callback: `GET /api/google/gmail/callback` → Handles OAuth return
- Sync: `POST /api/google/gmail/sync` → Direct sync (see below)

**✅ Calendar:**

- Connect: `POST /api/google/calendar/connect` → Returns OAuth URL
- Callback: `GET /api/google/calendar/callback` → Handles OAuth return

**❌ Drive:** Backend files exist but NO settings UI (per user request)

**Status Check:** `GET /api/google/status` → Returns connection status for all services

### Gmail Sync - Simplified Direct Pattern

**Location:** `/settings/_components/GmailSyncStatusPanel.tsx`

**✅ ACTUAL IMPLEMENTATION:** Simple direct sync, NO job polling needed.

```typescript
// Direct sync mutation - completes immediately
const startSyncMutation = useMutation({
  mutationFn: async () =>
    await apiClient.post<{
      message: string;
      stats: {
        totalFound: number;
        processed: number;
        inserted: number;
        errors: number;
        batchId: string;
      };
    }>("/api/google/gmail/sync", {}, {
      showErrorToast: false,
      errorToastTitle: "Failed to start Gmail sync",
    }),
  onSuccess: (data) => {
    setSyncPhase("completed");
    setIsPolling(false);
    toast.success("Gmail sync completed!");

    // Show stats
    if (data.stats) {
      toast.info(`Processed ${data.stats.processed} emails`);
    }

    // Auto-clear after 10 seconds
    setTimeout(() => {
      setSyncPhase("idle");
    }, 10000);
  },
  onError: (error) => {
    setSyncPhase("error");
    setIsPolling(false);
    toast.error("Sync failed: " + error.message);
  },
});
```

**Code Comments Confirm Direct Sync:**

```typescript
// Line 45: "// Direct sync mode - no job polling needed"
// Line 94: "// Note: Direct sync mode - no complex job polling needed"
```

**User Flow:**

1. User clicks "Start Sync" button
2. POST to `/api/google/gmail/sync`
3. Sync completes immediately (synchronous)
4. Stats returned in response
5. Success toast shown with stats
6. Auto-clear after 10 seconds

**Comparison to Original Design:**

| Original Design (Document) | Actual Implementation |
|---------------------------|----------------------|
| POST creates background job | POST performs sync immediately |
| Poll job status endpoint | No polling needed |
| Job states: queued → running → completed | Direct states: idle → syncing → completed |
| Complex job management | Simple mutation pattern |

**Design Decision:** Keep the simplified direct sync. It's faster, simpler to understand, and adequate for typical Gmail sync volumes. No need for complex background job orchestration.

---

## 4. Theme Management (ACTUAL IMPLEMENTATION)

**Location:** `/components/ThemeToggle.tsx`
**Used In:** `/components/layout/MainLayout.tsx` (Global Header)

**✅ IMPLEMENTED:** Theme toggle is in the global header, NOT in settings page.

```typescript
// MainLayout.tsx - Line 198
<ThemeToggle mounted={mounted} theme={theme} setTheme={setTheme} />
```

**Component Implementation:**

```typescript
// ThemeToggle.tsx
export function ThemeToggle({ mounted, theme, setTheme }: ThemeToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Monitor />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Theme Options:**

- 🌞 **Light** - Bright theme for daytime use
- 🌙 **Dark** - Dark theme for night/low-light
- 💻 **System** - Follows OS preference

**Location in Header:**

```
[Sidebar Toggle] [Breadcrumbs] ............. [AI Bot] [Rapid Note] [Theme Toggle]
```

**Design Decision:** ✅ KEEP theme toggle in global header. It's a frequently accessed setting that benefits from being in the persistent header rather than buried in settings. This follows common UX patterns (GitHub, VS Code, etc.).

**Settings Page Implementation:**
The main `/settings/page.tsx` has a "System" tab with a dark mode switch (lines 493-500), but this is part of a larger demo/prototype tabs interface. The actual functional theme toggle is in the header.

**Recommendation:** Remove the dark mode switch from settings page "System" tab to avoid confusion. Single source of truth should be the header toggle.

---

## 5. Tags Management System (ACTUAL IMPLEMENTATION)

**Location:** `/app/(authorisedRoute)/settings/tags/page.tsx`
**Status:** ✅ Fully implemented but ⚠️ NOT linked in navigation

### Wellness Tag System

**5 Categories with 60 Pre-defined Tags:**

```sql
-- Database seeding via supabase/sql/wellness_tags_seed.sql
1. services_modalities (14 tags)
   - Yoga, Massage, Meditation, Pilates, Reiki, etc.

2. client_demographics (11 tags)
   - Senior, Young Adult, Professional, Parent, Student, etc.

3. schedule_attendance (10 tags)
   - Regular Attendee, Weekend Warrior, Early Bird, etc.

4. health_wellness (11 tags)
   - Stress Relief, Weight Loss, Flexibility, Pain Management, etc.

5. emotional_mental (14 tags)
   - Mindfulness, Mental Health, Spiritual Growth, etc.
```

### UI Implementation

**Features Implemented:**

- ✅ Tag creation with category selection
- ✅ Color picker for custom tag colors
- ✅ Category-based grouping display
- ✅ Usage count tracking
- ✅ Search/filter functionality
- ⚠️ Edit function has TODO comment (line 64)
- ⚠️ Delete function has TODO comment (line 171)

**Backend API:** Fully functional at `/api/tags`

- GET - List all tags for user
- POST - Create new tag
- PUT - Update tag (implemented)
- DELETE - Delete tag (implemented)

**Issue:** The page exists and works but isn't linked in SettingsSidebar navigation.

**Fix Needed:**

```typescript
// Add to settingsNavItems in SettingsSidebar.tsx
{ title: "Tags", href: "/settings/tags", icon: Tag }
```

---

## 6. Settings Page Tabs (PROTOTYPE IMPLEMENTATION)

**Location:** `/app/(authorisedRoute)/settings/page.tsx`

**Status:** ⚠️ This is a PROTOTYPE tabs interface that overlaps with dedicated settings pages.

### Tabs Implemented

1. **Integrations Tab** - Shows Gmail, Calendar, Drive, OpenAI, WhatsApp
2. **Sync Settings Tab** - Shows auto-sync toggles + GmailSyncStatusPanel
3. **Profile Tab** - Manual profile form (conflicts with /settings/account)
4. **Notifications Tab** - Notification preferences toggles
5. **Security Tab** - Password change, 2FA toggles
6. **System Tab** - Dark mode toggle, data export buttons

### Issues with This Implementation

❌ **Duplicates /settings/account functionality** - Profile tab shows manual form, but account page auto-populates from Supabase
❌ **Shows removed integrations** - Drive (lines 193-214), OpenAI (lines 236-246), WhatsApp (lines 266-273)
❌ **Conflicting theme toggle** - System tab has dark mode switch, but header has the real toggle
❌ **Non-functional buttons** - Most buttons don't have real implementations

**Design Decision:** This appears to be an early prototype or demo interface. The real settings are in dedicated pages (/settings/account, etc.).

---

## 7. Integrations Removed from Design

Per user requirements, the following integrations are REMOVED from the settings UI:

### ❌ Google Drive

- **Backend files:** KEEP (user specified)
- **Settings UI:** REMOVE
- **Why:** Not actively used in current workflow
- **Files to update:** Remove from `/settings/page.tsx` lines 193-214

### ❌ OpenAI

- **Reason:** Not implemented in actual system
- **Files to update:** Remove from `/settings/page.tsx` lines 220-249

### ❌ WhatsApp Business

- **Reason:** Not implemented in actual system
- **Files to update:** Remove from `/settings/page.tsx` lines 251-276

### ✅ Gmail & Calendar ONLY

These are the ONLY two Google integrations that should appear in settings UI.

---

## 8. Toast Notification System (IMPLEMENTED)

**Library:** Sonner (already configured)
**Location:** Available globally via `import { toast } from "sonner"`

### Standard Toast Patterns

```typescript
// Success notifications
toast.success("Gmail connected successfully!");
toast.success("Changes saved");

// Error notifications
toast.error("Failed to connect Gmail");
toast.error(`Sync failed: ${error.message}`);

// Info notifications
toast.info("Processing in background...");
toast.info(`Processed ${count} emails`);

// Warning notifications
toast.warning("Your session will expire in 5 minutes");
```

### Toast Usage in Settings

✅ **Account page** - Uses toast for save confirmations, errors
✅ **Gmail sync** - Uses toast for sync status updates
✅ **Integrations** - Uses toast for connection success/failure

❌ **No alert() calls** - All replaced with toast notifications

---

## 9. European Date Formatting

**Current Implementation:** Standard JavaScript `toLocaleDateString()`

**Example from account page:**

```typescript
{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
```

**Issues:**

- Uses browser locale (US format in US browsers: MM/DD/YYYY)
- Not consistently European (DD/MM/YYYY)

**Recommendation:** Add locale parameter for European format:

```typescript
new Date(user.created_at).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}) // Output: "24/10/2025"
```

**Utility function needed:** Create `formatEuropeanDate()` helper in `/lib/utils/date-helpers.ts`

---

## 10. Component Architecture Patterns

### Current Patterns (Following CLAUDE.md)

✅ **Layered Architecture:**

- Repository Layer: `packages/repo/src/*.repo.ts`
- Service Layer: `src/server/services/*.service.ts`
- Route Layer: `src/app/api/*/route.ts`
- Component Layer: `src/app/(authorisedRoute)/_components/*.tsx`

✅ **Error Handling:**

- Services throw `AppError` with status codes
- Routes use `handleAuth()` wrapper
- Toast notifications for user feedback

✅ **Type Safety:**

- Strict TypeScript
- No `any` types
- No non-null assertions
- Proper type guards

### Settings Component Structure

```
src/app/(authorisedRoute)/settings/
├── layout.tsx                    # Settings layout wrapper
├── page.tsx                      # Main settings (tabs prototype)
├── account/
│   └── page.tsx                  # Account settings (REAL)
├── onboarding/
│   └── page.tsx                  # Intake form settings
├── tags/
│   └── page.tsx                  # Tags management (REAL, not linked)
└── _components/
    ├── SettingsSidebar.tsx       # Navigation sidebar
    ├── GmailSyncStatusPanel.tsx  # Gmail sync UI
    └── AccountDataManagement.tsx # GDPR data export/deletion
```

---

## 11. What's Missing vs. Original Design

### Pages Not Implemented

❌ **Billing Page** (`/settings/billing`)

- Navigation link exists
- No actual page implementation
- Would need: subscription plans, payment methods, usage tracking

❌ **Notifications Page** (`/settings/notifications`)

- Navigation link exists
- No actual page implementation
- Would need: email prefs, push notifications, alert settings

### Features Not Implemented

❌ **AI Assistant Settings**

- Original design included token management
- Model selection
- Usage quotas
- Not present in current implementation

❌ **Advanced Sync Preferences**

- Original design had detailed Gmail filters
- Date range selection
- Contact matching rules
- Current implementation is simpler (direct sync, no config)

❌ **GDPR Privacy Controls (Partial)**

- Data export exists
- Data deletion exists
- But no dedicated privacy settings page
- Currently in AccountDataManagement component only

### Navigation Not Complete

⚠️ **Tags page exists but not linked**

- Fully functional at `/settings/tags`
- Just needs nav link in SettingsSidebar

---

## 12. Recommended Updates

### High Priority

1. **Remove obsolete integrations from `/settings/page.tsx`:**
   - Remove Drive integration UI (lines 193-214)
   - Remove OpenAI integration UI (lines 220-249)
   - Remove WhatsApp integration UI (lines 251-276)

2. **Add Tags to navigation:**

   ```typescript
   { title: "Tags", href: "/settings/tags", icon: Tag }
   ```

3. **Complete Tags page TODO items:**
   - Wire up Edit functionality (line 64)
   - Wire up Delete functionality (line 171)

4. **Clarify settings page architecture:**
   - Either remove tabs prototype from `/settings/page.tsx`
   - Or consolidate with dedicated pages
   - Avoid duplication between tabs and `/settings/account`

### Medium Priority

5. **Add European date formatting utility:**
   - Create `formatEuropeanDate()` helper
   - Use throughout settings pages

6. **Remove duplicate dark mode toggle:**
   - Keep in global header only
   - Remove from settings page "System" tab

7. **Document user info source:**
   - Update inline comments to clarify Supabase Auth is source
   - Not Google API

### Low Priority

8. **Consider implementing missing pages:**
   - Billing page (if needed)
   - Notifications page (if needed)
   - Or remove nav links if not planned

9. **Enhance Gmail sync feedback:**
   - Add progress percentage
   - Show sync history
   - Error details

---

## 13. File Structure (Current)

```
src/
├── app/(authorisedRoute)/
│   └── settings/
│       ├── layout.tsx
│       ├── page.tsx                          # Tabs prototype (needs cleanup)
│       ├── account/
│       │   └── page.tsx                      # ✅ Account settings
│       ├── onboarding/
│       │   └── page.tsx                      # ✅ Intake form
│       ├── tags/
│       │   └── page.tsx                      # ✅ Tags (not linked)
│       └── _components/
│           ├── SettingsSidebar.tsx           # ✅ Navigation
│           ├── GmailSyncStatusPanel.tsx      # ✅ Gmail sync
│           └── AccountDataManagement.tsx     # ✅ GDPR
│
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx                    # ✅ Global header with theme toggle
│   ├── ThemeToggle.tsx                       # ✅ Theme switcher
│   ├── TagManager.tsx                        # ✅ Tag display component
│   └── TagSelector.tsx                       # ✅ Tag selection component
│
├── lib/
│   ├── api.ts                                # ✅ API client with auth
│   └── services/client/
│       └── auth.service.ts                   # ✅ fetchCurrentUser()
│
└── server/
    └── services/
        ├── google-integration.service.ts     # ✅ Gmail/Calendar OAuth
        └── google-status.service.ts          # ✅ Connection status
```

---

## 14. API Endpoints (Current)

### Google Integration

- `POST /api/google/gmail/connect` - Start Gmail OAuth
- `GET /api/google/gmail/callback` - Handle OAuth callback
- `POST /api/google/gmail/sync` - Direct sync (no job polling)
- `POST /api/google/calendar/connect` - Start Calendar OAuth
- `GET /api/google/calendar/callback` - Handle OAuth callback
- `GET /api/google/status` - Get connection status

### Tags Management

- `GET /api/tags` - List user tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

### User Management

- Available via Supabase Auth SDK (no custom endpoints needed)

---

## 15. Testing Recommendations

### Unit Tests Needed

- [ ] TagManager component
- [ ] TagSelector component
- [ ] GmailSyncStatusPanel state transitions
- [ ] Theme toggle functionality

### Integration Tests Needed

- [ ] Gmail OAuth flow
- [ ] Gmail sync end-to-end
- [ ] Tag CRUD operations
- [ ] Account data export

### E2E Tests Needed

- [ ] Settings navigation flow
- [ ] Connect Gmail → Sync → Verify
- [ ] Create/edit/delete tags
- [ ] Theme switching persistence

---

## Conclusion

This document now accurately reflects the **current implementation** rather than a future proposal. Key takeaways:

✅ **Core Settings Work:** Account, Gmail, Calendar, Tags all functional
✅ **Simplified Sync:** Direct sync pattern is simpler and adequate
✅ **Clean Architecture:** Follows CLAUDE.md patterns consistently
⚠️ **Navigation Gaps:** Tags page needs linking
⚠️ **Prototype Cleanup:** Main settings page has obsolete demo tabs
❌ **Removed Features:** Drive, OpenAI, WhatsApp not in scope

**Next Steps:**

1. Remove obsolete integrations from settings page
2. Link Tags page in navigation
3. Complete Tags edit/delete functionality
4. Decide on billing/notifications pages
5. Add European date formatting utility
