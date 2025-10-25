import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import * as contactsService from "@/server/services/contacts.service";
import { setupRepoMocks, resetRepoMocks, testUtils, type AllRepoFakes } from "@packages/testing";
import type { ContactWithLastNote, Contact } from "@/server/db/business-schemas/contacts";

// Mock service layer (keeping existing pattern since this is API route test)
vi.mock("@/server/services/contacts.service");

// Mock the authentication handlers
vi.mock("@/lib/api", () => ({
  handleGetWithQueryAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      // Mock authentication - simulate authenticated user
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());

      // Convert string numbers to actual numbers
      if (query.page) query.page = parseInt(query.page as string, 10);
      if (query.pageSize) query.pageSize = parseInt(query.pageSize as string, 10);

      const userId = "test-user-id";

      try {
        const result = await handler(query, userId);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    };
  }),
  handleAuth: vi.fn((schema, responseSchema, handler) => {
    return async (request: Request) => {
      // Mock authentication - simulate authenticated user
      const userId = "test-user-id";

      try {
        const body = await request.json();
        const result = await handler(body, userId);

        // Handle null result (creation failure)
        if (result === null) {
          return new Response(JSON.stringify({ error: "Failed to create client" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ item: result }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    };
  }),
}));

// Factory functions for test data
function makeContactWithLastNote(
  overrides: Partial<ContactWithLastNote> = {},
): ContactWithLastNote {
  return {
    id: "contact-1",
    userId: "test-user-id",
    displayName: "John Doe",
    primaryEmail: "john@example.com",
    primaryPhone: "+1234567890",
    photoUrl: null,
    source: "manual",
    lifecycleStage: "New Client",
    clientStatus: null,
    referralSource: null,
    confidenceScore: "0.8",
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    address: null,
    healthContext: null,
    preferences: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastNote: "Recent interaction",
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-2",
    userId: "test-user-id",
    displayName: "Jane Smith",
    primaryEmail: "jane@example.com",
    primaryPhone: "+1987654321",
    photoUrl: null,
    source: "manual",
    lifecycleStage: null,
    clientStatus: null,
    referralSource: null,
    confidenceScore: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    address: null,
    healthContext: null,
    preferences: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

describe("/api/contacts API Routes", () => {
  let fakes: AllRepoFakes;
  const mockUserId = testUtils.defaultUserId;

  beforeEach(() => {
    vi.clearAllMocks();
    fakes = setupRepoMocks();
    resetRepoMocks(fakes);
  });

  describe("GET /api/contacts", () => {
    it("should return list of omni clients with default parameters", async () => {
      // Use factory to create test data
      const mockContact = makeContactWithLastNote({
        id: "contact-1",
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: "+1234567890",
        lifecycleStage: "New Client",
        lastNote: "Recent interaction",
      });

      const mockContactsResult = {
        items: [mockContact],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);

      // Create NextRequest object
      const request = new Request(
        "http://localhost:3000/api/contacts?page=1&pageSize=50&sort=displayName&order=asc",
      );

      const response = await GET(request as any);

      expect(contactsService.listContactsService).toHaveBeenCalledWith(mockUserId, {
        sort: "displayName",
        order: "asc",
        page: 1,
        pageSize: 50,
      });
      expect(response).toBeDefined();

      // Verify response structure
      const json = await response.json();
      expect(json).toEqual({
        ...mockContactsResult,
        items: mockContactsResult.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      });
    });

    it("should handle search parameter", async () => {
      const mockContactsResult = {
        items: [],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);

      // Create NextRequest object with search parameter
      const request = new Request(
        "http://localhost:3000/api/contacts?search=john&page=1&pageSize=25&sort=displayName&order=asc",
      );

      await GET(request as any);

      expect(contactsService.listContactsService).toHaveBeenCalledWith(mockUserId, {
        sort: "displayName",
        order: "asc",
        page: 1,
        pageSize: 25,
        search: "john",
      });
    });

    it("should handle service errors gracefully", async () => {
      vi.mocked(contactsService.listContactsService).mockRejectedValue(new Error("Database error"));

      // Create NextRequest object
      const request = new Request("http://localhost:3000/api/contacts?page=1&pageSize=50");

      const response = await GET(request as any);

      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toHaveProperty("error");
      expect(json).toHaveProperty("details");
    });
  });

  describe("POST /api/contacts", () => {
    it("should create a new omni client", async () => {
      const mockCreatedContact = makeContact({
        id: "contact-2",
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual",
      });

      vi.mocked(contactsService.createContactService).mockResolvedValue(mockCreatedContact);

      // Create NextRequest object with JSON body
      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
          primaryPhone: "+1987654321",
        }),
      });

      const response = await POST(request as any);

      expect(contactsService.createContactService).toHaveBeenCalledWith(mockUserId, {
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
      });
      expect(response).toBeDefined();
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json).toEqual({
        item: {
          ...mockCreatedContact,
          createdAt: mockCreatedContact.createdAt.toISOString(),
          updatedAt: mockCreatedContact.updatedAt.toISOString(),
        },
      });
    });

    it("should handle creation failure", async () => {
      vi.mocked(contactsService.createContactService).mockResolvedValue(null as any);

      // Create NextRequest object
      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Failed Contact",
        }),
      });

      const response = await POST(request as any);

      expect(contactsService.createContactService).toHaveBeenCalledWith(mockUserId, {
        displayName: "Failed Contact",
      });
      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: "Failed to create client",
      });
    });

    it("should handle service errors during creation", async () => {
      vi.mocked(contactsService.createContactService).mockRejectedValue(
        new Error("Database error"),
      );

      // Create NextRequest object
      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Error Contact",
        }),
      });

      const response = await POST(request as any);

      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: "Internal server error",
        details: "Database error",
      });
    });
  });
});
