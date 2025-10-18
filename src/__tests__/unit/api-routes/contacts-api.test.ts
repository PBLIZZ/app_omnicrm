/**
 * API Route Tests: Contacts Module
 *
 * Tests all Contacts API endpoints with comprehensive coverage of:
 * - Request validation and sanitization
 * - Authentication and authorization
 * - Error handling and edge cases
 * - Response format consistency
 * - Business logic validation
 *
 * Coverage Target: 80%+
 *
 * Routes Tested:
 * - GET /api/contacts - List contacts with pagination
 * - POST /api/contacts - Create new contact
 * - GET /api/contacts/[contactId] - Get single contact with notes
 * - PUT /api/contacts/[contactId] - Update contact
 * - DELETE /api/contacts/[contactId] - Delete contact
 * - GET /api/contacts/count - Get contact count
 * - POST /api/contacts/bulk-delete - Bulk delete contacts
 * - GET /api/contacts/suggestions - Get contact suggestions
 * - POST /api/contacts/suggestions - Create contacts from suggestions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getContacts, POST as createContact } from "@/app/api/contacts/route";
import {
  GET as getContactById,
  PUT as updateContact,
  DELETE as deleteContact,
} from "@/app/api/contacts/[contactId]/route";
import { GET as getContactCount } from "@/app/api/contacts/count/route";
import { POST as bulkDeleteContacts } from "@/app/api/contacts/bulk-delete/route";
import {
  GET as getContactSuggestions,
  POST as createFromSuggestions,
} from "@/app/api/contacts/suggestions/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";
import { testUtils } from "@packages/testing";

// Helper function to create valid mock contact data
function createMockContact(overrides: Partial<any> = {}) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    userId: "123e4567-e89b-12d3-a456-426614174001",
    displayName: "John Doe",
    primaryEmail: "john@example.com",
    primaryPhone: "+1234567890",
    photoUrl: "https://example.com/photo.jpg",
    source: "manual",
    lifecycleStage: "New Client",
    tags: ["test"],
    confidenceScore: "0.8",
    dateOfBirth: "1990-01-01",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "+1234567891",
    clientStatus: "active",
    referralSource: "website",
    address: {},
    healthContext: {},
    preferences: {},
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    lastNote: null,
    ...overrides,
  };
}

// Mock authentication
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

// Mock contacts service
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn(),
  createContactService: vi.fn(),
  getContactWithNotesService: vi.fn().mockImplementation(() => {
    console.log("getContactWithNotesService mock called");
    return Promise.resolve({
      id: "contact-123",
      userId: "test-user-id",
      displayName: "Test Contact",
      primaryEmail: "test@example.com",
      primaryPhone: "+1234567890",
      photoUrl: "https://example.com/photo.jpg",
      source: "manual",
      lifecycleStage: "New Client",
      tags: ["test"],
      confidenceScore: "0.8",
      dateOfBirth: "1990-01-01",
      emergencyContactName: "Jane Doe",
      emergencyContactPhone: "+1234567891",
      clientStatus: "active",
      referralSource: "website",
      address: {},
      healthContext: {},
      preferences: {},
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      notes: [
        {
          id: "123e4567-e89b-12d3-a456-426614174003",
          userId: "test-user-id",
          contactId: "contact-123",
          contentRich: null,
          contentPlain: "Test note",
          tags: [],
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        },
      ],
    });
  }),
  updateContactService: vi.fn(),
  deleteContactService: vi.fn(),
  countContactsService: vi.fn(),
  deleteContactsBulk: vi.fn(),
  getContactSuggestionsService: vi.fn(),
  createContactsFromSuggestionsService: vi.fn(),
}));

describe("Contacts API Routes - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/contacts", () => {
    it("should return list of contacts with pagination", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValueOnce({
        items: [createMockContact()],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const request = new Request("http://localhost:3000/api/contacts?page=1&pageSize=10");

      const response = await getContacts(request);
      const data = await response.json();

      if (response.status !== 200) {
        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
      }

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("pagination");
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].displayName).toBe("John Doe");
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts");

      const response = await getContacts(request);
      expect(response.status).toBe(401);
    });

    it("should support search query parameter", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");

      const request = new Request("http://localhost:3000/api/contacts?search=john");

      await getContacts(request);

      expect(listContactsService).toHaveBeenCalledWith(
        testUtils.defaultUserId,
        expect.objectContaining({ search: "john" }),
      );
    });

    it("should handle empty results", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValueOnce({
        items: [],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      const request = new Request("http://localhost:3000/api/contacts");

      const response = await getContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe("POST /api/contacts", () => {
    it("should create new contact", async () => {
      const { createContactService } = await import("@/server/services/contacts.service");
      vi.mocked(createContactService).mockResolvedValueOnce(
        createMockContact({
          id: "123e4567-e89b-12d3-a456-426614174002",
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
        }),
      );

      const contactData = {
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
      };

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(contactData),
      });

      const response = await createContact(request);
      const data = await response.json();

      if (response.status !== 200) {
        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
      }

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id");
      expect(data.displayName).toBe("Jane Smith");
      expect(data.primaryEmail).toBe("jane@example.com");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        primaryEmail: "test@example.com",
        // Missing required displayName
      };

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await createContact(request);
      expect(response.status).toBe(400);
    });

    it("should validate email format", async () => {
      const invalidData = {
        displayName: "Test User",
        primaryEmail: "not-an-email",
      };

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await createContact(request);
      expect(response.status).toBe(400);
    });

    it("should handle malformed JSON", async () => {
      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "invalid json {",
      });

      const response = await createContact(request);
      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Test" }),
      });

      const response = await createContact(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/contacts/[contactId]", () => {
    it("should return contact by id with notes", async () => {
      const { getContactWithNotesService } = await import("@/server/services/contacts.service");
      vi.mocked(getContactWithNotesService).mockResolvedValueOnce({
        ...createMockContact({
          id: "contact-123",
          displayName: "Test Contact",
          primaryEmail: "test@example.com",
        }),
        notes: [
          {
            id: "123e4567-e89b-12d3-a456-426614174003",
            userId: testUtils.defaultUserId,
            contactId: "contact-123",
            contentRich: null,
            contentPlain: "Test note",
            piiEntities: [],
            tags: [],
            sourceType: "typed",
            createdAt: new Date("2024-01-01T00:00:00Z"),
            updatedAt: new Date("2024-01-01T00:00:00Z"),
          },
        ],
      });

      const request = new Request("http://localhost:3000/api/contacts/contact-123");
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await getContactById(request, context);
      const data = await response.json();

      if (response.status !== 200) {
        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
      }

      expect(response.status).toBe(200);
      expect(data.id).toBe("contact-123");
      expect(data).toHaveProperty("notes");
      expect(Array.isArray(data.notes)).toBe(true);
    });

    it("should return 404 for non-existent contact", async () => {
      const { getContactWithNotesService } = await import("@/server/services/contacts.service");
      vi.mocked(getContactWithNotesService).mockRejectedValueOnce(new Error("Contact not found"));

      const request = new Request("http://localhost:3000/api/contacts/non-existent");
      const context = makeRouteContext({ contactId: "non-existent" });

      const response = await getContactById(request, context);
      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts/contact-123");
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await getContactById(request, context);
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/contacts/[contactId]", () => {
    it("should update contact", async () => {
      const { updateContactService } = await import("@/server/services/contacts.service");
      vi.mocked(updateContactService).mockResolvedValueOnce(
        createMockContact({
          id: "contact-123",
          displayName: "Updated Name",
          primaryEmail: "updated@example.com",
        }),
      );

      const updateData = {
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      };

      const request = new Request("http://localhost:3000/api/contacts/contact-123", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await updateContact(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.displayName).toBe("Updated Name");
      expect(data.primaryEmail).toBe("updated@example.com");
    });

    it("should return 404 for non-existent contact", async () => {
      const { updateContactService } = await import("@/server/services/contacts.service");
      vi.mocked(updateContactService).mockRejectedValueOnce(new Error("Contact not found"));

      const request = new Request("http://localhost:3000/api/contacts/non-existent", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Test" }),
      });
      const context = makeRouteContext({ contactId: "non-existent" });

      const response = await updateContact(request, context);
      expect(response.status).toBe(404);
    });

    it("should validate update data", async () => {
      const invalidData = {
        primaryEmail: "not-an-email",
      };

      const request = new Request("http://localhost:3000/api/contacts/contact-123", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await updateContact(request, context);
      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts/contact-123", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Test" }),
      });
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await updateContact(request, context);
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/contacts/[contactId]", () => {
    it("should delete contact", async () => {
      const { deleteContactService } = await import("@/server/services/contacts.service");
      vi.mocked(deleteContactService).mockResolvedValueOnce(true);

      const request = new Request("http://localhost:3000/api/contacts/contact-123", {
        method: "DELETE",
      });
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await deleteContact(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("deleted");
      expect(data.deleted).toBe(1);
    });

    it("should return 0 deleted when contact not found", async () => {
      const { deleteContactService } = await import("@/server/services/contacts.service");
      vi.mocked(deleteContactService).mockResolvedValueOnce(false);

      const request = new Request("http://localhost:3000/api/contacts/non-existent", {
        method: "DELETE",
      });
      const context = makeRouteContext({ contactId: "non-existent" });

      const response = await deleteContact(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBe(0);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts/contact-123", {
        method: "DELETE",
      });
      const context = makeRouteContext({ contactId: "contact-123" });

      const response = await deleteContact(request, context);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/contacts/count", () => {
    it("should return contact count", async () => {
      const { countContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(countContactsService).mockResolvedValueOnce(42);

      const request = new Request("http://localhost:3000/api/contacts/count");

      const response = await getContactCount(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("count");
      expect(data.count).toBe(42);
    });

    it("should support search filter in count", async () => {
      const { countContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(countContactsService).mockResolvedValueOnce(5);

      const request = new Request("http://localhost:3000/api/contacts/count?search=john");

      await getContactCount(request);

      expect(countContactsService).toHaveBeenCalledWith(testUtils.defaultUserId, "john");
    });

    it("should return 0 for empty database", async () => {
      const { countContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(countContactsService).mockResolvedValueOnce(0);

      const request = new Request("http://localhost:3000/api/contacts/count");

      const response = await getContactCount(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(0);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts/count");

      const response = await getContactCount(request);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/contacts/bulk-delete", () => {
    it("should delete multiple contacts", async () => {
      const { deleteContactsBulk } = await import("@/server/services/contacts.service");
      vi.mocked(deleteContactsBulk).mockResolvedValueOnce({
        deleted: 3,
        errors: [],
      });

      const bulkData = {
        contactIds: ["contact-1", "contact-2", "contact-3"],
      };

      const request = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bulkData),
      });

      const response = await bulkDeleteContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("deleted");
      expect(data.deleted).toBe(3);
      expect(data.errors).toEqual([]);
    });

    it("should validate contactIds array", async () => {
      const invalidData = {
        contactIds: "not-an-array",
      };

      const request = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await bulkDeleteContacts(request);
      expect(response.status).toBe(400);
    });

    it("should require at least one contact ID", async () => {
      const invalidData = {
        contactIds: [],
      };

      const request = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await bulkDeleteContacts(request);
      expect(response.status).toBe(400);
    });

    it("should report partial failures", async () => {
      const { deleteContactsBulk } = await import("@/server/services/contacts.service");
      vi.mocked(deleteContactsBulk).mockResolvedValueOnce({
        deleted: 2,
        errors: [{ id: "contact-3", error: "Not found" }],
      });

      const bulkData = {
        contactIds: ["contact-1", "contact-2", "contact-3"],
      };

      const request = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bulkData),
      });

      const response = await bulkDeleteContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBe(2);
      expect(data.errors).toHaveLength(1);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactIds: ["test"] }),
      });

      const response = await bulkDeleteContacts(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/contacts/suggestions", () => {
    it("should return contact suggestions", async () => {
      const { getContactSuggestionsService } = await import("@/server/services/contacts.service");
      vi.mocked(getContactSuggestionsService).mockResolvedValueOnce([
        {
          id: "suggestion-1",
          name: "Suggested Contact",
          email: "suggested@example.com",
        },
      ]);

      const request = new Request("http://localhost:3000/api/contacts/suggestions");

      const response = await getContactSuggestions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("suggestions");
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions).toHaveLength(1);
    });

    it("should return empty array when no suggestions", async () => {
      const { getContactSuggestionsService } = await import("@/server/services/contacts.service");
      vi.mocked(getContactSuggestionsService).mockResolvedValueOnce([]);

      const request = new Request("http://localhost:3000/api/contacts/suggestions");

      const response = await getContactSuggestions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual([]);
    });
  });

  describe("POST /api/contacts/suggestions", () => {
    it("should create contacts from suggestions", async () => {
      const { createContactsFromSuggestionsService } = await import(
        "@/server/services/contacts.service"
      );
      vi.mocked(createContactsFromSuggestionsService).mockResolvedValueOnce({
        contacts: [
          createMockContact({ id: "contact-1", displayName: "New Contact 1" }),
          createMockContact({ id: "contact-2", displayName: "New Contact 2" }),
        ],
        createdCount: 2,
      });

      const suggestionData = {
        suggestionIds: ["suggestion-1", "suggestion-2"],
      };

      const request = new Request("http://localhost:3000/api/contacts/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(suggestionData),
      });

      const response = await createFromSuggestions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("created");
      expect(data.created).toHaveLength(2);
      expect(data.message).toContain("2 contacts");
    });

    it("should validate suggestionIds array", async () => {
      const invalidData = {
        suggestionIds: [],
      };

      const request = new Request("http://localhost:3000/api/contacts/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await createFromSuggestions(request);
      expect(response.status).toBe(400);
    });

    it("should limit maximum suggestion IDs", async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `suggestion-${i}`);
      const invalidData = {
        suggestionIds: tooManyIds,
      };

      const request = new Request("http://localhost:3000/api/contacts/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const response = await createFromSuggestions(request);
      expect(response.status).toBe(400);
    });
  });
});
