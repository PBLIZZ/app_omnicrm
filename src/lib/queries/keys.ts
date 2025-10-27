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
      clients: () => ["google", "calendar", "clients"] as const,
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
    all: ["/api/contacts"] as const,
    list: (filters?: { search?: string; page?: number; pageSize?: number }) =>
      ["/api/contacts", filters] as const,
    detail: (id: string) => ["/api/contacts", "detail", id] as const,
    byId: (id: string) => ["/api/contacts", id] as const,
    notes: (contactId: string) => ["/api/contacts", contactId, "notes"] as const,
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

  // OmniMomentum Inbox
  inbox: {
    all: ["inbox"] as const,
    list: (filters?: object) => ["inbox", "list", filters] as const,
    stats: () => ["inbox", "stats"] as const,
    unprocessed: (limit?: number) => ["inbox", "unprocessed", limit] as const,
    byId: (id: string) => ["inbox", id] as const,
  },

  // Wellness Zones
  zones: {
    all: ["zones"] as const,
    list: (withStats?: boolean) => ["zones", "list", withStats] as const,
    byId: (id: number) => ["zones", id] as const,
    byName: (name: string) => ["zones", "name", name] as const,
  },

  // OmniMomentum - Hierarchical Task Management
  momentum: {
    all: ["momentum"] as const,

    project: (projectId: string) => ["momentum", "project", projectId] as const,

    // Tasks (Hierarchical)
    tasks: (filters?: { projectId?: string; parentTaskId?: string }) =>
      ["momentum", "tasks", filters] as const,
    task: (taskId: string) => ["momentum", "task", taskId] as const,
    taskWithSubtasks: (taskId: string) => ["momentum", "task", taskId, "subtasks"] as const,

    // Special queries
    pendingTasks: () => ["momentum", "tasks", "pending-approval"] as const,
    todaysFocus: () => ["momentum", "today-focus"] as const,
    stats: () => ["momentum", "stats"] as const,
  },

  // Tasks - Direct access for use-tasks hook
  tasks: {
    all: ["tasks"] as const,
    list: (filters?: Record<string, unknown>, sort?: Record<string, unknown>, search?: string) =>
      ["tasks", "list", filters, sort, search] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    byId: (id: string) => ["tasks", id] as const,
  },

  // Wellness - Habits and Pulse tracking
  wellness: {
    all: ["wellness"] as const,

    // Habits
    habits: {
      all: ["wellness", "habits"] as const,
      list: (filters?: { isActive?: boolean }) => ["wellness", "habits", "list", filters] as const,
      byId: (habitId: string) => ["wellness", "habits", habitId] as const,
      streak: (habitId: string) => ["wellness", "habits", habitId, "streak"] as const,
      analytics: (habitId: string, days?: number) =>
        ["wellness", "habits", habitId, "analytics", days] as const,
      completions: (habitId?: string, startDate?: string, endDate?: string) =>
        ["wellness", "habits", "completions", { habitId, startDate, endDate }] as const,
    },

    // Pulse logs
    pulse: {
      all: ["wellness", "pulse"] as const,
      list: (limit?: number) => ["wellness", "pulse", "list", limit] as const,
      byDate: (date: string) => ["wellness", "pulse", "date", date] as const,
      analytics: (period?: "week" | "month" | "quarter") =>
        ["wellness", "pulse", "analytics", period] as const,
    },

    // Overall wellness summary
    summary: () => ["wellness", "summary"] as const,
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
  invalidateContacts: () => ({ queryKey: queryKeys.contacts.all }),

  /**
   * Invalidate after sync operations (refresh status and data)
   */
  invalidateAfterSync: (service: "calendar" | "gmail") => [
    { queryKey: queryKeys.google.status() },
    service === "calendar"
      ? { queryKey: queryKeys.google.calendar.all }
      : { queryKey: queryKeys.google.gmail.all },
    { queryKey: queryKeys.omniConnect.dashboard() },
  ],

  /**
   * Invalidate all inbox-related queries
   */
  invalidateInbox: () => ({ queryKey: queryKeys.inbox.all }),

  /**
   * Invalidate all zones-related queries
   */
  invalidateZones: () => ({ queryKey: queryKeys.zones.all }),

  /**
   * Invalidate after inbox processing (refresh inbox and stats)
   */
  invalidateAfterInboxUpdate: () => [{ queryKey: queryKeys.inbox.all }],

  /**
   * Invalidate all momentum-related queries
   */
  invalidateMomentum: () => ({ queryKey: queryKeys.momentum.all }),

  /**
   * Invalidate after momentum task operations (refresh tasks and stats)
   */
  invalidateAfterMomentumUpdate: () => [{ queryKey: queryKeys.momentum.all }],

  /**
   * Invalidate all wellness-related queries
   */
  invalidateWellness: () => ({ queryKey: queryKeys.wellness.all }),

  /**
   * Invalidate all habit-related queries
   */
  invalidateHabits: () => ({ queryKey: queryKeys.wellness.habits.all }),

  /**
   * Invalidate all pulse-related queries
   */
  invalidatePulse: () => ({ queryKey: queryKeys.wellness.pulse.all }),

  /**
   * Invalidate after wellness activity (refresh habits, pulse, and summary)
   */
  invalidateAfterWellnessUpdate: () => [
    { queryKey: queryKeys.wellness.habits.all },
    { queryKey: queryKeys.wellness.pulse.all },
    { queryKey: queryKeys.wellness.summary() },
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
  | ReturnType<typeof queryKeys.contacts.byId>
  | ReturnType<typeof queryKeys.contacts.notes>
  | ReturnType<typeof queryKeys.chat.messages>
  | ReturnType<typeof queryKeys.inbox.list>
  | ReturnType<typeof queryKeys.inbox.stats>
  | ReturnType<typeof queryKeys.inbox.unprocessed>
  | ReturnType<typeof queryKeys.inbox.byId>
  | ReturnType<typeof queryKeys.zones.list>
  | ReturnType<typeof queryKeys.zones.byId>
  | ReturnType<typeof queryKeys.zones.byName>;
