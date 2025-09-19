/**
 * Centralized Query Key Factory
 *
 * Provides consistent, typed query keys for React Query to ensure proper
 * cache invalidation and prevent key mismatches across hooks.
 *
 * Pattern: Use hierarchical keys with specific types for each category.
 * This enables targeted invalidation (e.g., all google keys, just calendar, etc.)
 */

export const queryKeys = {
  // Google service queries
  google: {
    all: ["google"] as const,
    status: () => ["google", "status"] as const,

    // Calendar queries
    calendar: {
      all: ["google", "calendar"] as const,
      status: () => ["google", "calendar", "status"] as const,
      events: () => ["google", "calendar", "events"] as const,
      sync: () => ["google", "calendar", "sync"] as const,
    },

    // Gmail queries
    gmail: {
      all: ["google", "gmail"] as const,
      status: () => ["google", "gmail", "status"] as const,
      messages: () => ["google", "gmail", "messages"] as const,
      sync: () => ["google", "gmail", "sync"] as const,
    },
  },

  // Calendar-specific queries (legacy support)
  calendar: {
    all: ["calendar"] as const,
    events: () => ["calendar", "events"] as const,
    clients: () => ["calendar", "clients"] as const,
  },

  // OmniConnect dashboard
  omniConnect: {
    all: ["omniConnect"] as const,
    dashboard: () => ["omniConnectDashboard"] as const,
  },

  // Contacts and related data
  contacts: {
    all: ["contacts"] as const,
    list: () => ["/api/contacts-new"] as const,
    byId: (id: string) => ["contacts", id] as const,
    notes: (contactId: string) => ["contacts", contactId, "notes"] as const,
  },

  // Client management
  clients: {
    all: ["clients"] as const,
    list: () => ["/api/omni-clients"] as const,
  },

  // Chat and messaging
  chat: {
    all: ["chat"] as const,
    messages: (threadId: string) => ["chat", "messages", threadId] as const,
  },

  // Jobs and processing
  jobs: {
    all: ["jobs"] as const,
    status: () => ["jobs", "status"] as const,
    byBatch: (batchId: string) => ["jobs", "batch", batchId] as const,
  },
} as const;

/**
 * Query key utilities for common invalidation patterns
 */
export const queryKeyUtils = {
  /**
   * Invalidate all Google-related queries
   */
  invalidateGoogle: () => ({ queryKey: queryKeys.google.all }),

  /**
   * Invalidate all calendar queries (both google.calendar and legacy calendar)
   */
  invalidateCalendar: () => [
    { queryKey: queryKeys.google.calendar.all },
    { queryKey: queryKeys.calendar.all },
  ],

  /**
   * Invalidate all Gmail queries
   */
  invalidateGmail: () => ({ queryKey: queryKeys.google.gmail.all }),

  /**
   * Invalidate all contact-related queries
   */
  invalidateContacts: () => [
    { queryKey: queryKeys.contacts.all },
    { queryKey: queryKeys.clients.all },
  ],

  /**
   * Invalidate after sync operations (refresh status and data)
   */
  invalidateAfterSync: (service: 'calendar' | 'gmail') => [
    { queryKey: queryKeys.google.status() },
    service === 'calendar'
      ? { queryKey: queryKeys.google.calendar.all }
      : { queryKey: queryKeys.google.gmail.all },
    { queryKey: queryKeys.omniConnect.dashboard() },
  ],
} as const;

/**
 * Type-safe query key builder for dynamic keys
 */
export type QueryKey =
  | ReturnType<typeof queryKeys.google.status>
  | ReturnType<typeof queryKeys.google.calendar.status>
  | ReturnType<typeof queryKeys.google.calendar.events>
  | ReturnType<typeof queryKeys.google.gmail.status>
  | ReturnType<typeof queryKeys.google.gmail.messages>
  | ReturnType<typeof queryKeys.calendar.events>
  | ReturnType<typeof queryKeys.calendar.clients>
  | ReturnType<typeof queryKeys.omniConnect.dashboard>
  | ReturnType<typeof queryKeys.contacts.list>
  | ReturnType<typeof queryKeys.clients.list>
  | ReturnType<typeof queryKeys.contacts.byId>
  | ReturnType<typeof queryKeys.contacts.notes>
  | ReturnType<typeof queryKeys.chat.messages>;