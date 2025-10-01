# Feature File Mapping

This document maps features to their implementation files for easy navigation and maintenance.

## Dashboard (omni-flow)

### Core Files

- **Page**: `src/app/(authorisedRoute)/omni-flow/page.tsx`
- **Main Component**: `src/app/(authorisedRoute)/omni-flow/_components/DashboardContent.tsx`
- **Data Hook**: `src/hooks/use-dashboard-data.ts`
- **Sidebar**: `src/app/(authorisedRoute)/omni-flow/_components/DashboardSidebar.tsx`

### Features

- **Google Services Card**: Shows Gmail and Calendar connection status
  - Uses `/api/google/status` endpoint
  - Displays last sync times
  - Shows connection indicators (green = connected)

- **Recent Contacts**: Lists 5 most recent contacts
  - Links to `/contacts/details/{id}` for each contact
  - Shows avatar, name, email, and creation date

## Google OAuth Integration

### Gmail Connection

- **Connect Route**: `src/app/api/google/gmail/connect/route.ts` (GET)
  - Initiates OAuth flow
  - Redirects to Google OAuth
- **Callback Route**: `src/app/api/google/gmail/callback/route.ts` (GET)
  - Handles OAuth callback
  - Stores tokens in `user_integrations` table
  - Redirects to `/omni-connect?connected=gmail`
- **Frontend Hook**: `src/hooks/use-omni-connect.ts`
- **Page**: `src/app/(authorisedRoute)/omni-connect/page.tsx`

### Calendar Connection

- **Connect Route**: `src/app/api/google/calendar/connect/route.ts` (GET)
  - Initiates OAuth flow
  - Redirects to Google OAuth
- **Callback Route**: `src/app/api/google/calendar/callback/route.ts` (GET)
  - Handles OAuth callback
  - Stores tokens in `user_integrations` table
  - Redirects to `/omni-rhythm?connected=calendar`
- **Frontend Hook**: `src/hooks/useCalendarConnection.ts`
- **Data Hook**: `src/hooks/useCalendarData.ts`
- **Page**: `src/app/(authorisedRoute)/omni-rhythm/page.tsx`

### Status Endpoint

- **Route**: `src/app/api/google/status/route.ts` (GET)
  - Returns connection status for both Gmail and Calendar
  - Checks `user_integrations` table
  - Returns `{ services: { gmail: {...}, calendar: {...} } }`

## Authentication

### Core Auth Files

- **Auth Utilities**: `src/lib/auth-simple.ts`
  - `getAuthUserId()` - Server-side auth check (uses `getUser()` for security)
  - `getSupabaseBrowser()` - Client-side Supabase client
- **Middleware**: `src/middleware.ts`
  - CSRF protection
  - Rate limiting
  - Security headers

## Contacts

### Core Contact Files

- **List Page**: `src/app/(authorisedRoute)/contacts/page.tsx`
- **Main Component**: `src/app/(authorisedRoute)/contacts/_components/ContactsPage.tsx`
- **Sidebar**: `src/app/(authorisedRoute)/contacts/_components/ContactsSidebar.tsx`
- **Table Component**: `src/app/(authorisedRoute)/contacts/_components/contacts-table.tsx`
- **Table Columns**: `src/app/(authorisedRoute)/contacts/_components/contacts-columns.tsx`
- **Detail Page**: `src/app/(authorisedRoute)/contacts/details/[id]/page.tsx`
- **Data Hook**: `src/hooks/use-contacts.ts`
- **Types**: `src/app/(authorisedRoute)/contacts/_components/types.ts`

### API Routes

- **Main Route**: `src/app/api/contacts/route.ts`
  - GET: List contacts (with pagination, search, filters)
  - POST: Create new contact
- **Avatar Route**: `src/app/api/contacts/[contactId]/avatar/route.ts`
  - GET: Retrieve contact avatar/photo
  - POST: Upload contact avatar (TODO: Complete implementation)

### Services & Schemas

- **Service**: `src/server/services/contacts.service.ts`
  - `listContactsService()` - Fetch paginated contacts
  - `createContactService()` - Create new contact
  - `getContactAvatarData()` - Get avatar data (TODO: Implement)
  - `generateAvatar()` - Generate avatar response (TODO: Implement)
- **Repository**: `@repo` (ContactsRepository)
- **Schemas**: `src/server/db/business-schemas/contacts.ts`
  - `GetContactsQuerySchema` - List query validation (max pageSize: 100)
  - `CreateContactBodySchema` - Create contact validation (omits userId)
  - `ContactSchema` - Full contact type
  - `ContactListResponseSchema` - API response format

### Features

- **Contact List**: Displays all contacts in paginated table
  - Client-side pagination (fetches up to 100 contacts)
  - Sortable columns (displayName, createdAt, updatedAt)
  - Column visibility controls
  - Bulk selection and actions
  - Avatar display with initials fallback
  
- **Add Contact**: Dialog form for creating contacts
  - Validates displayName (required), email, phone
  - Auto-injects userId from auth
  - Opens via "Add Contact" button or sidebar link
  
- **Contact Actions**: Per-row dropdown menu
  - Edit contact
  - Delete contact
  - Add note
  - AI insights
  
- **Search & Filters**: (Removed - planned for global search)

### Known Issues

- **Pagination Limit**: Schema caps pageSize at 100, need server-side pagination for larger datasets
- **Avatar Upload**: POST endpoint has placeholder, needs Supabase Storage integration
- **Missing Functions**: `getContactAvatarData()` and `generateAvatar()` not implemented

### Recent Fixes (2025-09-30)

- ✅ Removed duplicate `[id]` route directory (was causing Next.js routing conflict)
- ✅ Standardized on `[contactId]` parameter name for all contact routes
- ✅ Fixed pagination - hook now requests pageSize=100
- ✅ Fixed table responsiveness with overflow-auto
- ✅ Removed broken sidebar links (Wellness Journey, AI Insights)

## Database

### Key Tables

- **user_integrations**: Stores OAuth tokens for Google services
  - Fields: `userId`, `provider`, `service`, `accessToken`, `refreshToken`, `expiryDate`
- **contacts**: User contacts
- **calendar_events**: Synced calendar events
- **emails**: Synced Gmail messages

## Deleted Files (Clean Rebuild)

### Removed Routes

- All old `/api/google/*` routes (duplicates)
- All old `/api/gmail/*` routes (duplicates)

### Removed Services

- `src/server/services/google-oauth.service.ts`
- `src/server/services/google-integration.service.ts`
- `src/server/services/google-gmail.service.ts`
- `src/server/services/google-calendar.service.ts`
- `src/server/services/google-calendar-sync.service.ts`
- `src/server/services/gmail-sync.service.ts`
- `src/server/services/gmail-labels.service.ts`
- `src/server/services/gmail-preview.service.ts`
- `src/server/services/calendar-import.service.ts`

## API Pattern

All new Google API routes follow this clean pattern:

```bash
/api/google/{service}/{function}/route.ts
```

Examples:

- `/api/google/gmail/connect` - Start Gmail OAuth
- `/api/google/gmail/callback` - Handle Gmail OAuth callback
- `/api/google/calendar/connect` - Start Calendar OAuth
- `/api/google/calendar/callback` - Handle Calendar OAuth callback
- `/api/google/status` - Get connection status for all services
