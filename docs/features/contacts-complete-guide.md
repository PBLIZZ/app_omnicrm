# Contacts Module - Complete Guide

**Last Updated:** October 19, 2025
**Status:** ✅ Production Implementation
**Module Name:** Contacts
**Routes:** `/contacts`, `/api/contacts`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implemented Features](#implemented-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [State Management](#state-management)
7. [AI Integration](#ai-integration)
8. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Clean Architecture Pattern

The contacts module follows a strict layered architecture as defined in `CLAUDE.md`:

```bash
┌─────────────────────────────────────────┐
│         UI Layer (React)                │
│  - ContactsPage.tsx                     │
│  - contacts-table.tsx                   │
│  - contacts-columns.tsx                 │
│  - shadcn/ui + TanStack Table           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         API Layer (REST)                │
│  - /api/contacts/*                      │
│  - handleAuth, handleGetWithQueryAuth   │
│  - Direct Response Serialization        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  - contacts.service.ts                  │
│  - Business Logic                       │
│  - Error Wrapping (AppError)            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Repository Layer                │
│  - packages/repo/src/contacts.repo.ts   │
│  - Drizzle ORM                          │
│  - Database Access                      │
└─────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Layered Architecture**: Strict separation following October 2025 refactoring patterns
2. **Type Safety Excellence**: Zero `any` types, comprehensive TypeScript coverage
3. **Standardized Handlers**: Uses `handleAuth` and `handleGetWithQueryAuth` from `@/lib/api`
4. **Direct Response Serialization**: No response envelopes, data returned directly with HTTP status codes
5. **Optimistic Updates**: TanStack React Query with rollback capabilities
6. **Zod Validation**: Comprehensive schemas in `business-schemas/contacts.ts`

---

## Implemented Features

### ✅ Core Features (Production)

#### Contact List Management

**Route:** `/contacts`

- **Advanced Data Table**: TanStack Table with sorting, filtering, pagination
- **Bulk Operations**: Multi-select with bulk delete
- **Contact Count**: Real-time total count display
- **Suggestions**: Calendar-based contact suggestions from Google Calendar

**Components:**

- `ContactsPage.tsx` - Main page orchestrator
- `contacts-table.tsx` - TanStack Table implementation
- `contacts-columns.tsx` - Column definitions with filters
- `ContactFilterDialog.tsx` - Advanced filter UI
- `ContactsSidebar.tsx` - Navigation sidebar

#### Contact Detail Pages

**Route:** `/contacts/[contactId]`

- **Notes**: Main Notes interface with rich text editor, quick note creation, and note history
- **Contact Information Card**: Display name, email, phone, tags in the header, full contact details in a tab
- **Edit Contact Dialog**: Full edit interface with validation in a TAB
- **Navigation Wrapper**: Previous/next navigation with filter context

**Components:**

- `ContactDetailsCard.tsx` - Contact information display
- `ContactDetailsNavWrapper.tsx` - Navigation with filter state
- `EditContactDialog.tsx` - Modal edit form
- `ContactHeader.tsx` - Page header with actions

#### Filter & Navigation System

**Implemented Feature:** When browsing filtered contacts, the navigation bar displays active filters with a hover card showing filter details.

**Data Flow:**

```bash
Table Filters → Table Meta → Column Click → localStorage → Navigation Bar → Hover Card
```

**Supported Filters:** Not Implemented

- Lifecycle Stage (Prospect, New Client, Core Client, etc.)
- Tags (free-form JSONB tags)
- Date Range (Created date filtering)
- Text search query

---

## API Endpoints

### Endpoint Structure

```bash
/api/contacts/
├── GET /                         # List contacts with pagination
├── POST /                        # Create new contact
├── GET /count                    # Get total contact count
├── GET /suggestions              # Get calendar-based suggestions
├── POST /suggestions             # Create contacts from suggestions
├── POST /bulk-delete             # Bulk delete contacts
└── [contactId]/
    ├── GET /                     # Get contact by ID
    ├── PATCH /                   # Update contact
    └── DELETE /                  # Delete contact

/api/notes/                       # Notes are separate module
├── GET /                         # List notes
├── POST /                        # Create note
└── [noteId]/
    ├── GET /                     # Get note
    ├── PATCH /                   # Update note
    └── DELETE /                  # Delete note

/api/data-intelligence/ai-insights/  # AI insights (separate module)
├── GET /                         # List insights (filter by subjectType='contact')
├── POST /                        # Create insight
└── [aiInsightId]/
    ├── GET /                     # Get insight
    ├── PATCH /                   # Update insight
    └── DELETE /                  # Delete insight
```

### API Response Formats

**Important:** Responses return data directly with HTTP status codes.

#### GET /api/contacts

**Request:**

```bash
GET /api/contacts?page=1&pageSize=20&search=john&lifecycleStage[]=prospect
```

**Response (200 OK):**

```typescript
{
  items: [
    {
      id: "uuid",
      userId: "uuid",
      displayName: "John Doe",
      primaryEmail: "john@example.com",
      primaryPhone: "+1234567890",
      photoUrl: null,
      source: "manual",
      lifecycleStage: "prospect",
      clientStatus: null,
      tags: ["yoga", "wellness"],
      // ... other fields
      lastNote: "Recent note text preview",  // Service enrichment
      createdAt: "2025-01-15T10:30:00Z",
      updatedAt: "2025-01-15T10:30:00Z"
    }
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 45,
    totalPages: 3,
    hasNext: true,
    hasPrev: false
  }
}
```

#### Error Responses

**Validation Error (400):**

```typescript
{
  error: "Validation failed",
  details: [
    {
      code: "invalid_type",
      expected: "string",
      received: "undefined",
      path: ["displayName"],
      message: "Required"
    }
  ]
}
```

**Authentication Error (401):**

```typescript
{
  error: "unauthorized"
}
```

**Not Found (404):**

```typescript
{
  error: "Contact not found"
}
```

### Request/Response Schemas

All schemas defined in `src/server/db/business-schemas/contacts.ts`:

- `GetContactsQuerySchema` - Query parameters for list endpoint
- `ContactListResponseSchema` - List response with pagination
- `CreateContactBodySchema` - Create request body
- `UpdateContactBodySchema` - Update request body (partial)
- `ContactSchema` - Single contact response
- `ContactWithLastNoteSchema` - Contact with note preview

---

## UI Components

### Component File Structure

```bash
src/app/(authorisedRoute)/contacts/
├── page.tsx                          # Route entry point
├── [contactId]/                      # Dynamic contact detail route
│   ├── page.tsx
│   └── _components/
└── _components/
    ├── ContactsPage.tsx              # Main page orchestrator
    ├── contacts-table.tsx            # TanStack Table implementation
    ├── contacts-columns.tsx          # Column definitions
    ├── ContactDetailsCard.tsx        # Contact info display
    ├── ContactDetailsNavWrapper.tsx  # Navigation wrapper
    ├── ContactFilterDialog.tsx       # Filter dialog
    ├── ContactHeader.tsx             # Page header
    ├── ContactsSidebar.tsx           # Sidebar navigation
    ├── EditContactDialog.tsx         # Edit modal
    └── types.ts                      # Shared TypeScript types
```

### Main Components

#### ContactsPage.tsx

**Purpose:** Main page orchestrator with data table

**Features:**

- TanStack Table integration
- Search functionality
- Filter state management
- Bulk selection
- Contact suggestions from calendar
- Create/edit contact dialogs

**State Management:**

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["/api/contacts", searchQuery, filters],
  queryFn: () => fetchContacts(params)
});
```

#### contacts-table.tsx

**Purpose:** TanStack Table implementation with advanced features

**Features:**

- Column sorting
- Row selection
- Pagination
- Loading states
- Empty states
- Responsive design

#### contacts-columns.tsx

**Purpose:** Column definitions for the data table

**Columns:**

- Checkbox (row selection)
- Display name (with avatar)
- Tags (badge display)
- Lifecycle stage
- Last note preview
- AI Insights (not implemented)
- Created date

## State Management

### TanStack React Query Integration

All contacts data fetching uses React Query for caching and optimistic updates.

#### Query Patterns

```typescript
// List contacts
const { data: contactsData, isLoading } = useQuery({
  queryKey: ["/api/contacts", searchQuery, page, filters],
  queryFn: async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      ...(searchQuery && { search: searchQuery }),
      // ... filter params
    });
    return await fetchGet<ContactListResponse>(`/api/contacts?${params}`);
  },
});

// Single contact
const { data: contact } = useQuery({
  queryKey: ["/api/contacts", contactId],
  queryFn: () => fetchGet<Contact>(`/api/contacts/${contactId}`),
});

// Contact count
const { data: countData } = useQuery({
  queryKey: ["/api/contacts/count", searchQuery],
  queryFn: () => fetchGet<{ count: number }>(`/api/contacts/count?search=${searchQuery}`),
});
```

#### Mutation Patterns

```typescript
// Create contact
const createMutation = useMutation({
  mutationFn: (data: CreateContactBody) =>
    fetchPost<Contact>("/api/contacts", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    toast.success("Contact created");
  },
  onError: (error) => {
    toast.error("Failed to create contact", {
      description: error.message
    });
  },
});

// Update contact
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateContactBody }) =>
    fetchPatch<Contact>(`/api/contacts/${id}`, data),
  onSuccess: (updatedContact) => {
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    queryClient.setQueryData(["/api/contacts", updatedContact.id], updatedContact);
    toast.success("Contact updated");
  },
});

// Delete contact
const deleteMutation = useMutation({
  mutationFn: (id: string) =>
    fetchDelete(`/api/contacts/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    toast.success("Contact deleted");
  },
});

// Bulk delete
const bulkDeleteMutation = useMutation({
  mutationFn: (ids: string[]) =>
    fetchPost("/api/contacts/bulk-delete", { contactIds: ids }),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    toast.success(`Deleted ${result.deletedCount} contacts`);
  },
});
```

### Cache Invalidation Strategy

- List queries invalidated after any mutation
- Individual contact queries updated optimistically
- Count query invalidated separately
- Suggestions invalidated after creating contacts from suggestions

---

### Google Calendar Integration

**Contact Suggestions:** The contacts module can generate contact suggestions from Google Calendar events.

**Endpoint:** `GET /api/contacts/suggestions`

**Creates contacts from suggestions:** `POST /api/contacts/suggestions`

**Flow:**

1. User connects Google Calendar
2. System analyzes calendar events
3. Suggests potential contacts based on attendees
4. User reviews and creates contacts

---

## Service Layer Implementation

### Available Services

From `src/server/services/contacts.service.ts`:

```typescript
// List and count
export async function listContactsService(userId, query): Promise<ContactListResponse>
export async function countContactsService(userId, search?): Promise<number>

// CRUD operations
export async function getContactByIdService(userId, contactId): Promise<Contact>
export async function createContactService(userId, data): Promise<Contact>
export async function updateContactService(userId, contactId, data): Promise<Contact>
export async function deleteContactService(userId, contactId): Promise<boolean>

// Enhanced queries
export async function getContactWithNotesService(userId, contactId): Promise<ContactWithNotes>
export async function findContactByEmailService(userId, email): Promise<Contact | null>

// Batch operations
export async function deleteContactsBulk(userId, contactIds): Promise<{ deletedCount: number }>
export async function createContactsBatchService(userId, contacts): Promise<Contact[]>

// Suggestions
export async function getContactSuggestionsService(userId): Promise<Array<unknown>>
export async function createContactsFromSuggestionsService(userId, suggestionIds): Promise<{ createdCount: number }>
```

### Service Layer Patterns

Following `CLAUDE.md` architecture:

```typescript
export async function createContactService(
  userId: string,
  input: CreateContactBody
): Promise<Contact> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    return await repo.createContact(userId, input);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create contact",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}
```

---

## Performance & Optimization

### Current Optimizations

1. **Pagination**: All list queries support pagination (default 20 items)
2. **Search Indexing**: Database indexes on user_id and display_name
3. **React Query Caching**: Automatic caching of all queries
4. **Memoization**: useMemo for expensive filters
5. **Lazy Loading**: Components loaded on demand

### Recommended Enhancements

**Redis Caching:**

```typescript
// Cache expensive queries
const cachedCount = await redis.get(`contacts:count:${userId}`);
if (cachedCount) return parseInt(cachedCount);
```

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

The following features were found in design documentation but are **not yet implemented**:

#### ❌ Not Implemented

1. **Contact Timeline** - Visual interaction timeline with filters
2. **Advanced Search** - Full-text search with highlighting
3. **Import/Export** - CSV import and export functionality

#### 📋 Under Consideration

1. **Contact History** - Full audit trail of changes
2. **Contact Scoring** - Automated engagement scoring

---

## References

### Related Documentation

- `CLAUDE.md` - Overall project architecture and patterns
- `docs/REFACTORING_PATTERNS_OCT_2025.md` - Layered architecture patterns
- `src/server/db/schema.ts` - Database schema definitions
- `src/server/db/business-schemas/contacts.ts` - API validation schemas
- `docs/features/contact-navigation-filters.md` - Filter navigation feature (archived)

### Source Files

**Routes:**

- `src/app/(authorisedRoute)/contacts/page.tsx`
- `src/app/api/contacts/route.ts`
- `src/app/api/contacts/[contactId]/route.ts`
- `src/app/api/contacts/suggestions/route.ts`
- `src/app/api/contacts/bulk-delete/route.ts`
- `src/app/api/contacts/count/route.ts`

**Services:**

- `src/server/services/contacts.service.ts`
- `src/server/services/contact-identities.service.ts`

**Repository:**

- `packages/repo/src/contacts.repo.ts`

**Components:**

- `src/app/(authorisedRoute)/contacts/_components/`

---

**Last Updated:** October 19, 2025
**Accuracy Verified:** October 19, 2025
