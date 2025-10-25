/**
 * MSW Request Handlers
 *
 * Define mock responses for API endpoints.
 * These handlers can be overridden in individual tests as needed.
 */

import { http, HttpResponse } from "msw";
import type { ContactListResponse } from "@/server/db/business-schemas/contacts";
import type { Zone } from "@/server/db/schema";

/**
 * Default mock data for zones
 */
const mockZones: Zone[] = [
  {
    id: 1,
    name: "Personal Wellness",
    color: "#10b981",
    iconName: "heart",
  },
  {
    id: 2,
    name: "Self Care",
    color: "#f59e0b",
    iconName: "sparkles",
  },
  {
    id: 3,
    name: "Client Care",
    color: "#3b82f6",
    iconName: "users",
  },
];

interface ZoneWithStats extends Zone {
  projectCount: number;
  taskCount: number;
  activeTaskCount: number;
}

const mockZonesWithStats: ZoneWithStats[] = [
  {
    id: 1,
    name: "Personal Wellness",
    color: "#10b981",
    iconName: "heart",
    projectCount: 3,
    taskCount: 15,
    activeTaskCount: 8,
  },
  {
    id: 2,
    name: "Self Care",
    color: "#f59e0b",
    iconName: "sparkles",
    projectCount: 2,
    taskCount: 10,
    activeTaskCount: 5,
  },
  {
    id: 3,
    name: "Client Care",
    color: "#3b82f6",
    iconName: "users",
    projectCount: 5,
    taskCount: 25,
    activeTaskCount: 12,
  },
];

/**
 * Default mock data for contacts
 */
const mockContacts: ContactListResponse = {
  items: [
    {
      id: "contact-1",
      userId: "user-1",
      displayName: "John Doe",
      primaryEmail: "john@example.com",
      primaryPhone: null,
      photoUrl: null,
      source: "manual",
      lifecycleStage: null,
      clientStatus: null,
      referralSource: null,
      confidenceScore: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      address: {},
      healthContext: {},
      preferences: {},
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      lastNote: null,
    },
    {
      id: "contact-2",
      userId: "user-1",
      displayName: "Jane Smith",
      primaryEmail: "jane@example.com",
      primaryPhone: null,
      photoUrl: null,
      source: "manual",
      lifecycleStage: null,
      clientStatus: null,
      referralSource: null,
      confidenceScore: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      address: {},
      healthContext: {},
      preferences: {},
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      lastNote: null,
    },
  ],
  pagination: {
    total: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

const mockSuggestions = {
  suggestions: [
    {
      id: "suggestion-1",
      displayName: "Alex Johnson",
      email: "alex@example.com",
      source: "calendar",
      confidence: "high",
      eventCount: 5,
      lastEventDate: "2024-01-15",
      eventTitles: ["Team Meeting", "1:1 Sync"],
    },
  ],
};

/**
 * Default API handlers
 *
 * These provide baseline mock responses for common endpoints.
 * Individual tests can override these using server.use() for specific scenarios.
 */
export const handlers = [
  // GET /api/contacts/suggestions - Get contact suggestions
  http.get("/api/contacts/suggestions", () => {
    return HttpResponse.json(mockSuggestions);
  }),

  // GET /api/contacts/:id - Get single contact
  http.get("/api/contacts/:id", ({ params }) => {
    const { id } = params;
    const contact = mockContacts.items.find((c) => c.id === id);

    if (!contact) {
      return HttpResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return HttpResponse.json(contact);
  }),

  // POST /api/contacts - Create contact
  http.post("/api/contacts", async ({ request }) => {
    const body = await request.json();
    const newContact = {
      ...(body as Record<string, unknown>),
      id: `contact-${Date.now()}`,
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json(newContact, { status: 201 });
  }),

  // PUT /api/contacts/:id - Update contact
  http.put("/api/contacts/:id", async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const contact = mockContacts.items.find((c) => c.id === id);

    if (!contact) {
      return HttpResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const updated = {
      ...contact,
      ...(body as Record<string, unknown>),
      updatedAt: new Date(),
    };

    return HttpResponse.json(updated);
  }),

  // DELETE /api/contacts/:id - Delete contact
  http.delete("/api/contacts/:id", ({ params }) => {
    const { id } = params;
    const exists = mockContacts.items.some((c) => c.id === id);

    if (!exists) {
      return HttpResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return HttpResponse.json({ deleted: 1 });
  }),

  // POST /api/contacts/bulk-delete - Bulk delete contacts
  http.post("/api/contacts/bulk-delete", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] };
    const { ids } = body;

    return HttpResponse.json({ deleted: ids.length });
  }),

  // GET /api/omni-momentum/zones - List zones
  http.get("/api/omni-momentum/zones", ({ request }) => {
    const url = new URL(request.url);
    const withStats = url.searchParams.get("withStats") === "true";

    if (withStats) {
      return HttpResponse.json({
        success: true,
        data: {
          items: mockZonesWithStats,
          total: mockZonesWithStats.length,
        },
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        items: mockZones,
        total: mockZones.length,
      },
    });
  }),

  // GET /api/notes - List notes for contact
  http.get("/api/notes", ({ request }) => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId");

    // Mock notes data
    const mockNotes = [
      {
        id: "note-1",
        userId: "user-1",
        contactId: contactId || "contact-1",
        contentPlain: "First note about the client",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "note-2",
        userId: "user-1",
        contactId: contactId || "contact-1",
        contentPlain: "Follow-up needed",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2024-01-12"),
        updatedAt: new Date("2024-01-12"),
      },
    ];

    return HttpResponse.json({
      notes: mockNotes,
      total: mockNotes.length,
    });
  }),

  // POST /api/notes - Create note
  http.post("/api/notes", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newNote = {
      id: `note-${Date.now()}`,
      userId: "user-1",
      contactId: body["contactId"] as string,
      contentPlain: body["contentPlain"] as string,
      contentRich: body["contentRich"] || {},
      piiEntities: [],
      sourceType: body["sourceType"] || "typed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json(newNote, { status: 201 });
  }),

  // PUT /api/notes/:id - Update note
  http.put("/api/notes/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;

    const updatedNote = {
      id: id as string,
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: body["contentPlain"] as string,
      contentRich: body["contentRich"] || {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date(),
    };

    return HttpResponse.json(updatedNote);
  }),

  // DELETE /api/notes/:id - Delete note
  http.delete("/api/notes/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ deleted: true, id });
  }),

  // ===========================================================================
  // Inbox API Handlers
  // ===========================================================================

  // GET /api/omni-momentum/inbox - List inbox items or get stats
  http.get("/api/omni-momentum/inbox", ({ request }) => {
    const url = new URL(request.url);
    const statsParam = url.searchParams.get("stats");
    const statusFilters = url.searchParams.getAll("status");
    const search = url.searchParams.get("search");

    // Mock inbox items
    const mockItems = [
      {
        id: "inbox-1",
        userId: "user-1",
        rawText: "Follow up with client about proposal",
        status: "unprocessed" as const,
        createdTaskId: null,
        processedAt: null,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "inbox-2",
        userId: "user-1",
        rawText: "Schedule dentist appointment",
        status: "unprocessed" as const,
        createdTaskId: null,
        processedAt: null,
        createdAt: new Date("2024-01-11"),
        updatedAt: new Date("2024-01-11"),
      },
      {
        id: "inbox-3",
        userId: "user-1",
        rawText: "Review quarterly reports",
        status: "processed" as const,
        createdTaskId: "task-1",
        processedAt: new Date("2024-01-12"),
        createdAt: new Date("2024-01-09"),
        updatedAt: new Date("2024-01-12"),
      },
    ];

    // Return stats if requested
    if (statsParam === "true") {
      return HttpResponse.json({
        stats: {
          unprocessed: 2,
          processed: 1,
          archived: 0,
          total: 3,
        },
      });
    }

    // Filter by status if provided
    let items = mockItems;
    if (statusFilters.length > 0) {
      items = items.filter((item) => statusFilters.includes(item.status));
    }

    // Filter by search if provided
    if (search) {
      items = items.filter((item) => item.rawText.toLowerCase().includes(search.toLowerCase()));
    }

    return HttpResponse.json({
      items,
      total: items.length,
    });
  }),

  // POST /api/omni-momentum/inbox - Create inbox item or bulk process
  http.post("/api/omni-momentum/inbox", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const type = body["type"] as string;

    // Handle quick capture
    if (type === "quick_capture") {
      const data = body["data"] as {
        rawText: string;
        status?: string;
        createdTaskId?: string | null;
      };
      const newItem = {
        id: `inbox-${Date.now()}`,
        userId: "user-1",
        rawText: data.rawText,
        status: (data.status || "unprocessed") as "unprocessed" | "processed" | "archived",
        createdTaskId: data.createdTaskId || null,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return HttpResponse.json({ item: newItem }, { status: 201 });
    }

    // Handle voice capture
    if (type === "voice_capture") {
      const data = body["data"] as { audioBlob: Blob; transcript?: string };
      const newItem = {
        id: `inbox-${Date.now()}`,
        userId: "user-1",
        rawText: data.transcript || "Transcribed voice note",
        status: "unprocessed" as const,
        createdTaskId: null,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return HttpResponse.json({ item: newItem }, { status: 201 });
    }

    // Handle bulk process
    if (type === "bulk_process") {
      const data = body["data"] as { itemIds: string[]; action: string };
      const processedItems = data.itemIds.map((id) => ({
        id,
        userId: "user-1",
        rawText: "Bulk processed item",
        status: "processed" as const,
        createdTaskId: null,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return HttpResponse.json({
        result: {
          processed: processedItems,
          results: [],
        },
      });
    }

    return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
  }),

  // POST /api/omni-momentum/inbox/process - Process item with AI
  http.post("/api/omni-momentum/inbox/process", async ({ request }) => {
    const body = (await request.json()) as { itemId: string };

    return HttpResponse.json({
      result: {
        itemId: body.itemId,
        category: "task" as const,
        suggestedTitle: "Processed Task",
        suggestedDescription: "This is a processed task",
        suggestedPriority: "medium" as const,
        confidence: 0.85,
      },
    });
  }),

  // PATCH /api/omni-momentum/inbox/:id - Update inbox item
  http.patch("/api/omni-momentum/inbox/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { action: string; data?: Record<string, unknown> };

    const updatedItem = {
      id: id as string,
      userId: "user-1",
      rawText: "Updated inbox item",
      status: "processed" as const,
      createdTaskId: (body["data"]?.["createdTaskId"] as string) || null,
      processedAt: new Date(),
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date(),
    };

    return HttpResponse.json({ item: updatedItem });
  }),

  // DELETE /api/omni-momentum/inbox/:id - Delete inbox item
  http.delete("/api/omni-momentum/inbox/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ deleted: true, id });
  }),

  // ===========================================================================
  // OmniConnect Dashboard API Handler
  // ===========================================================================

  // GET /api/omni-connect/dashboard - Get unified dashboard state
  http.get("/api/omni-connect/dashboard", () => {
    const mockDashboard = {
      connection: {
        isConnected: true,
        emailCount: 150,
        contactCount: 42,
        lastSync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      emailPreview: {
        emails: [
          {
            id: "email-1",
            subject: "Meeting confirmation",
            from: "client@example.com",
            to: ["user@example.com"],
            date: new Date().toISOString(),
            snippet: "Looking forward to our meeting tomorrow...",
            hasAttachments: false,
            labels: ["INBOX"],
          },
          {
            id: "email-2",
            subject: "Project update",
            from: "team@example.com",
            to: ["user@example.com"],
            date: new Date(Date.now() - 86400000).toISOString(),
            snippet: "Here's the latest on the project...",
            hasAttachments: true,
            labels: ["INBOX", "IMPORTANT"],
          },
        ],
        range: {
          from: new Date(Date.now() - 7 * 86400000).toISOString(),
          to: new Date().toISOString(),
        },
        previewRange: {
          from: new Date(Date.now() - 7 * 86400000).toISOString(),
          to: new Date().toISOString(),
        },
      },
      jobs: {
        active: [
          {
            id: "job-1",
            kind: "gmail_sync",
            status: "running" as const,
            progress: 50,
            message: "Processing emails...",
            batchId: "batch-123",
            createdAt: new Date(Date.now() - 300000).toISOString(),
            updatedAt: new Date().toISOString(),
            totalEmails: 100,
            processedEmails: 50,
          },
        ],
        summary: {
          queued: 0,
          running: 1,
          completed: 5,
          failed: 0,
        },
        currentBatch: "batch-123",
        totalEmails: 100,
        processedEmails: 50,
      },
      syncStatus: {
        googleConnected: true,
        serviceTokens: {
          google: true,
          gmail: true,
          calendar: true,
          unified: true,
        },
        flags: {
          gmail: true,
          calendar: true,
        },
        lastSync: {
          gmail: new Date(Date.now() - 3600000).toISOString(),
          calendar: new Date(Date.now() - 7200000).toISOString(),
        },
        lastBatchId: "batch-123",
        grantedScopes: {
          gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
          calendar: ["https://www.googleapis.com/auth/calendar.readonly"],
        },
        jobs: {
          queued: 0,
          done: 5,
          error: 0,
        },
        embedJobs: {
          queued: 2,
          done: 10,
          error: 0,
        },
      },
    };

    return HttpResponse.json(mockDashboard);
  }),

  // ===========================================================================
  // Google Gmail API Handlers
  // ===========================================================================

  // POST /api/google/gmail/sync-blocking - Start blocking Gmail sync
  http.post("/api/google/gmail/sync-blocking", async () => {
    // Add a small delay to allow tests to catch the pending state
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockResult = {
      sessionId: "session-" + crypto.randomUUID(),
      success: true,
      messagesProcessed: 150,
      normalizedInteractions: 120,
      duration: 45000, // 45 seconds
      errors: [],
      message: "Gmail sync completed successfully",
      stats: {
        totalFound: 150,
        processed: 150,
        inserted: 120,
        errors: 0,
        processedJobs: 5,
        batchId: "batch-" + crypto.randomUUID(),
      },
    };

    return HttpResponse.json(mockResult, { status: 200 });
  }),

  // GET /api/sync-progress/:sessionId - Get sync progress
  http.get("/api/sync-progress/:sessionId", ({ params }) => {
    const { sessionId } = params;

    // Simulate different sync states based on sessionId
    const mockProgress = {
      sessionId: sessionId as string,
      service: "gmail" as const,
      status: "completed" as const, // Default to completed for simplicity
      progress: {
        percentage: 100,
        currentStep: "Sync completed",
        totalItems: 150,
        importedItems: 150,
        processedItems: 120,
        failedItems: 0,
      },
      timestamps: {
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
      preferences: {},
    };

    return HttpResponse.json(mockProgress);
  }),

  // ===========================================================================
  // Google Calendar API Handlers
  // ===========================================================================

  // GET /api/google/calendar/connect - OAuth connection endpoint
  http.get("/api/google/calendar/connect", () => {
    // This would normally redirect to Google OAuth, but in tests we just return success
    return HttpResponse.json(
      { success: true, message: "Redirecting to Google OAuth" },
      { status: 200 },
    );
  }),

  // POST /api/google/calendar/connect - OAuth connection endpoint
  http.post("/api/google/calendar/connect", () => {
    // This would normally handle OAuth callback, but in tests we just return success
    return HttpResponse.json(
      { success: true, message: "Calendar connected successfully" },
      { status: 200 },
    );
  }),

  // POST /api/google/calendar/sync-blocking - Start blocking Calendar sync
  http.post("/api/google/calendar/sync-blocking", async () => {
    // Add a small delay to allow tests to catch the pending state
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockResult = {
      sessionId: "session-" + crypto.randomUUID(),
      success: true,
      messagesProcessed: 25,
      normalizedInteractions: 20,
      duration: 15000, // 15 seconds
      errors: [],
      message: "Calendar sync completed successfully",
      stats: {
        totalFound: 25,
        processed: 25,
        inserted: 20,
        errors: 0,
        processedJobs: 2,
        batchId: "batch-" + crypto.randomUUID(),
      },
    };

    return HttpResponse.json(mockResult, { status: 200 });
  }),

  // POST /api/google/calendar/sync - Direct calendar sync
  http.post("/api/google/calendar/sync", async () => {
    const mockSyncResponse = {
      message: "Calendar sync completed",
      stats: {
        syncedEvents: 25,
        batchId: "batch-" + crypto.randomUUID(),
      },
    };

    return HttpResponse.json(mockSyncResponse, { status: 200 });
  }),

  // POST /api/google/calendar/refresh - Refresh calendar tokens
  http.post("/api/google/calendar/refresh", async () => {
    const mockRefreshResponse = {
      success: true,
      message: "Tokens refreshed successfully",
    };

    return HttpResponse.json(mockRefreshResponse, { status: 200 });
  }),

  // GET /api/google/calendar/events - Get calendar events
  http.get("/api/google/calendar/events", () => {
    const mockEvents = {
      isConnected: true,
      totalCount: 3,
      events: [
        {
          id: "event-1",
          title: "Client Session: Sarah Johnson",
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
          location: "Wellness Studio",
          attendees: [{ email: "sarah@example.com", name: "Sarah Johnson" }],
          eventType: "session",
          businessCategory: "client_care",
        },
        {
          id: "event-2",
          title: "Team Meeting",
          startTime: new Date(Date.now() + 172800000).toISOString(),
          endTime: new Date(Date.now() + 172800000 + 1800000).toISOString(),
          location: "Office",
          attendees: [{ email: "team@example.com", name: "Team Member" }],
        },
        {
          id: "event-3",
          title: "Massage Session: John Doe",
          startTime: new Date(Date.now() + 259200000).toISOString(),
          endTime: new Date(Date.now() + 259200000 + 5400000).toISOString(),
          location: "Therapy Room",
          attendees: [{ email: "john@example.com", name: "John Doe" }],
          eventType: "therapy",
          businessCategory: "personal_wellness",
        },
      ],
    };

    return HttpResponse.json(mockEvents);
  }),

  // GET /api/google/status - Get Google connection status
  http.get("/api/google/status", () => {
    const mockStatus = {
      services: {
        calendar: {
          connected: true,
          integration: {
            hasRefreshToken: true,
          },
          autoRefreshed: false,
          lastSync: new Date(Date.now() - 3600000).toISOString(),
        },
      },
      upcomingEventsCount: 3,
    };

    return HttpResponse.json(mockStatus);
  }),

  // GET /api/google/calendar/clients - Get calendar clients
  http.get("/api/google/calendar/clients", () => {
    const mockClients = [
      {
        id: "client-1",
        name: "John Doe",
        email: "john@example.com",
        totalSessions: 5,
        lastSessionDate: new Date(Date.now() - 86400000).toISOString(),
        totalSpent: 500,
        status: "active",
        satisfaction: 4,
        preferences: {
          preferredTimes: ["morning"],
          preferredServices: ["massage"],
          goals: ["relaxation"],
        },
      },
      {
        id: "client-2",
        name: "Jane Smith",
        email: "jane@example.com",
        totalSessions: 3,
        lastSessionDate: new Date(Date.now() - 172800000).toISOString(),
        totalSpent: 300,
        status: "active",
        satisfaction: 5,
        preferences: {
          preferredTimes: ["afternoon"],
          preferredServices: ["therapy"],
          goals: ["stress relief"],
        },
      },
    ];

    return HttpResponse.json(mockClients);
  }),

  // GET /api/contacts - Get contacts for calendar data
  http.get("/api/contacts", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "25", 10);

    // Filter by search if provided
    let items = mockContacts.items;
    if (search) {
      items = items.filter(
        (contact) =>
          contact.displayName.toLowerCase().includes(search.toLowerCase()) ||
          contact.primaryEmail?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return HttpResponse.json({
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  }),

  // ===========================================================================
  // Momentum API Handlers (Projects & Tasks)
  // ===========================================================================

  // GET /api/omni-momentum/projects - List projects
  http.get("/api/omni-momentum/projects", () => {
    const mockProjects = [
      {
        id: "project-1",
        userId: "user-1",
        zoneId: 1,
        name: "Q1 Marketing Campaign",
        description: "Launch new marketing campaign",
        status: "active" as const,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "project-2",
        userId: "user-1",
        zoneId: 2,
        name: "Website Redesign",
        description: "Redesign company website",
        status: "active" as const,
        startDate: new Date("2024-02-01"),
        endDate: null,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      },
    ];

    return HttpResponse.json(mockProjects);
  }),

  // POST /api/omni-momentum/projects - Create project
  http.post("/api/omni-momentum/projects", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newProject = {
      id: `project-${Date.now()}`,
      userId: "user-1",
      zoneId: body["zoneId"] as number,
      name: body["name"] as string,
      description: body["description"] as string,
      status: "active" as const,
      startDate: body["startDate"] ? new Date(body["startDate"] as string) : null,
      endDate: body["endDate"] ? new Date(body["endDate"] as string) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json(newProject, { status: 201 });
  }),

  // GET /api/omni-momentum/projects/:id - Get single project
  http.get("/api/omni-momentum/projects/:id", ({ params }) => {
    const { id } = params;
    const project = {
      id: id as string,
      userId: "user-1",
      zoneId: 1,
      name: "Test Project",
      description: "Test project description",
      status: "active" as const,
      startDate: new Date("2024-01-01"),
      endDate: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    return HttpResponse.json(project);
  }),

  // PUT /api/omni-momentum/projects/:id - Update project
  http.put("/api/omni-momentum/projects/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;

    const updatedProject = {
      id: id as string,
      userId: "user-1",
      zoneId: body["zoneId"] as number,
      name: body["name"] as string,
      description: body["description"] as string,
      status: body["status"] as "active" | "completed" | "on_hold",
      startDate: body["startDate"] ? new Date(body["startDate"] as string) : null,
      endDate: body["endDate"] ? new Date(body["endDate"] as string) : null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    };

    return HttpResponse.json(updatedProject);
  }),

  // DELETE /api/omni-momentum/projects/:id - Delete project
  http.delete("/api/omni-momentum/projects/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ deleted: true, id });
  }),

  // GET /api/omni-momentum/projects/:id/tasks - Get project tasks
  http.get("/api/omni-momentum/projects/:id/tasks", ({ params }) => {
    const { id } = params;
    const mockTasks = [
      {
        id: "task-1",
        userId: "user-1",
        projectId: id as string,
        name: "Design mockups",
        description: "Create design mockups",
        status: "todo" as const,
        priority: "high" as const,
        dueDate: new Date("2024-02-15"),
        parentTaskId: null,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
    ];

    return HttpResponse.json(mockTasks);
  }),

  // GET /api/omni-momentum/tasks - List tasks
  http.get("/api/omni-momentum/tasks", ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const status = url.searchParams.get("status");
    const parentTaskId = url.searchParams.get("parentTaskId");

    // Base tasks with fixed projectIds
    const mockTasks = [
      {
        id: "task-1",
        userId: "user-1",
        projectId: "project-1",
        name: "Complete documentation",
        description: "Write comprehensive docs",
        status: "todo" as const,
        priority: "high" as const,
        dueDate: new Date("2024-02-15"),
        parentTaskId: null,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "task-2",
        userId: "user-1",
        projectId: "project-1",
        name: "Review code",
        description: "Review pull requests",
        status: "in_progress" as const,
        priority: "medium" as const,
        dueDate: new Date("2024-02-20"),
        parentTaskId: null,
        createdAt: new Date("2024-01-11"),
        updatedAt: new Date("2024-01-11"),
      },
      {
        id: "task-3",
        userId: "user-1",
        projectId: "project-2",
        name: "Deploy to staging",
        description: "Deploy new version",
        status: "todo" as const,
        priority: "urgent" as const,
        dueDate: new Date("2024-02-10"),
        parentTaskId: null,
        createdAt: new Date("2024-01-12"),
        updatedAt: new Date("2024-01-12"),
      },
    ];

    let filteredTasks = mockTasks;

    if (projectId) {
      filteredTasks = filteredTasks.filter((task) => task.projectId === projectId);
    }

    if (status) {
      filteredTasks = filteredTasks.filter((task) => task.status === status);
    }

    if (parentTaskId !== null) {
      if (parentTaskId === "null") {
        filteredTasks = filteredTasks.filter((task) => task.parentTaskId === null);
      } else {
        filteredTasks = filteredTasks.filter((task) => task.parentTaskId === parentTaskId);
      }
    }

    return HttpResponse.json(filteredTasks);
  }),

  // POST /api/omni-momentum/tasks - Create task
  http.post("/api/omni-momentum/tasks", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newTask = {
      id: `task-${Date.now()}`,
      userId: "user-1",
      projectId: body["projectId"] as string,
      name: body["name"] as string,
      description: body["description"] as string,
      status: (body["status"] as string) || "todo",
      priority: (body["priority"] as string) || "medium",
      dueDate: body["dueDate"] ? new Date(body["dueDate"] as string) : null,
      parentTaskId: (body["parentTaskId"] as string) || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json(newTask, { status: 201 });
  }),

  // GET /api/omni-momentum/tasks/:id - Get single task
  http.get("/api/omni-momentum/tasks/:id", ({ params }) => {
    const { id } = params;
    const task = {
      id: id as string,
      userId: "user-1",
      projectId: "project-1",
      name: "Test Task",
      description: "Test task description",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date("2024-02-15"),
      parentTaskId: null,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    };

    return HttpResponse.json(task);
  }),

  // PUT /api/omni-momentum/tasks/:id - Update task
  http.put("/api/omni-momentum/tasks/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;

    const updatedTask = {
      id: id as string,
      userId: "user-1",
      projectId: body["projectId"] as string,
      name: body["name"] as string,
      description: body["description"] as string,
      status: body["status"] as "todo" | "in_progress" | "completed" | "pending_approval",
      priority: body["priority"] as "low" | "medium" | "high" | "urgent",
      dueDate: body["dueDate"] ? new Date(body["dueDate"] as string) : null,
      parentTaskId: (body["parentTaskId"] as string) || null,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date(),
    };

    return HttpResponse.json(updatedTask);
  }),

  // DELETE /api/omni-momentum/tasks/:id - Delete task
  http.delete("/api/omni-momentum/tasks/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ deleted: true, id });
  }),

  // POST /api/omni-momentum/tasks/:id/subtasks - Create subtask
  http.post("/api/omni-momentum/tasks/:id/subtasks", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    const newSubtask = {
      id: `task-${Date.now()}`,
      userId: "user-1",
      projectId: body["projectId"] as string,
      name: body["name"] as string,
      description: body["description"] as string,
      status: (body["status"] as string) || "todo",
      priority: (body["priority"] as string) || "medium",
      dueDate: body["dueDate"] ? new Date(body["dueDate"] as string) : null,
      parentTaskId: id as string,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return HttpResponse.json(newSubtask, { status: 201 });
  }),

  // GET /api/omni-momentum/tasks/:id/subtasks - Get subtasks
  http.get("/api/omni-momentum/tasks/:id/subtasks", ({ params }) => {
    const { id } = params;
    const mockSubtasks = [
      {
        id: "subtask-1",
        userId: "user-1",
        projectId: "project-1",
        name: "Subtask 1",
        description: "First subtask",
        status: "todo" as const,
        priority: "medium" as const,
        dueDate: new Date("2024-02-15"),
        parentTaskId: id as string,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
    ];

    return HttpResponse.json(mockSubtasks);
  }),

  // POST /api/omni-momentum/tasks/:id/approve - Approve task
  http.post("/api/omni-momentum/tasks/:id/approve", async ({ params }) => {
    const { id } = params;
    const approvedTask = {
      id: id as string,
      userId: "user-1",
      projectId: "project-1",
      name: "Approved Task",
      description: "This task has been approved",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date("2024-02-15"),
      parentTaskId: null,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date(),
    };

    return HttpResponse.json(approvedTask);
  }),

  // POST /api/omni-momentum/tasks/:id/reject - Reject task
  http.post("/api/omni-momentum/tasks/:id/reject", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { deleteTask?: boolean; reason?: string };

    if (body.deleteTask) {
      return HttpResponse.json({ success: true, deleted: true });
    }

    const rejectedTask = {
      id: id as string,
      userId: "user-1",
      projectId: "project-1",
      name: "Rejected Task",
      description: "This task has been rejected",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date("2024-02-15"),
      parentTaskId: null,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date(),
    };

    return HttpResponse.json(rejectedTask);
  }),

  // GET /api/omni-momentum/tasks/pending-approval - Get pending tasks
  http.get("/api/omni-momentum/tasks/pending-approval", () => {
    const mockPendingTasks = [
      {
        id: "pending-task-1",
        userId: "user-1",
        projectId: "project-1",
        name: "Pending Review Task",
        description: "This task needs approval",
        status: "pending_approval" as const,
        priority: "high" as const,
        dueDate: new Date("2024-02-15"),
        parentTaskId: null,
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
    ];

    return HttpResponse.json(mockPendingTasks);
  }),

  // GET /api/omni-momentum/stats - Get momentum statistics
  http.get("/api/omni-momentum/stats", () => {
    const mockStats = {
      total: 10,
      todo: 4,
      inProgress: 3,
      completed: 2,
      pendingApproval: 1,
    };

    return HttpResponse.json(mockStats);
  }),
];
