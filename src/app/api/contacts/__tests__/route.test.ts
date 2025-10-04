import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import * as contactsService from "@/server/services/contacts.service";
import * as contactsAdapters from "@/server/adapters/contacts";
import * as authUser from "@/server/auth/user";
import {
  setupRepoMocks,
  resetRepoMocks,
  makeOmniClientWithNotes,
  makeOmniClient,
  testUtils,
  type AllRepoFakes,
} from "@packages/testing";

// Mock service layer (keeping existing pattern since this is API route test)
vi.mock("@/server/services/contacts.service");
vi.mock("@/server/adapters/contacts");
vi.mock("@/server/auth/user");

describe("/api/contacts API Routes", () => {
  let fakes: AllRepoFakes;
  const mockUserId = testUtils.defaultUserId;

  beforeEach(() => {
    vi.clearAllMocks();
    fakes = setupRepoMocks();
    resetRepoMocks(fakes);

    // Mock authentication
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  describe("GET /api/contacts", () => {
    it("should return list of omni clients with default parameters", async () => {
      // Use factory to create test data
      const contactListItem = {
        id: "contact-1",
        userId: mockUserId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: "+1234567890",
        source: "manual" as const,
        lifecycleStage: "New Client" as const,
        tags: null,
        confidenceScore: "0.8",
        photoUrl: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        lastNote: "Recent interaction",
      };

      const mockContactsResult = {
        items: [contactListItem],
        total: 1,
      };

      const mockOmniClient = makeOmniClientWithNotes({
        id: "contact-1",
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: "+1234567890",
        lifecycleStage: "New Client" as const,
        lastNote: "Recent interaction",
      });

      const mockContacts = [mockOmniClient];

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);
      vi.mocked(contactsAdapters.toContactsWithNotes).mockReturnValue(mockContacts as any);

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
      expect(contactsAdapters.toContactsWithNotes).toHaveBeenCalledWith(mockContactsResult.items);
      expect(response).toBeDefined();

      // Verify response structure
      const json = await response.json();
      expect(json).toEqual({
        items: mockContacts,
        total: 1,
        nextCursor: null,
      });
    });

    it("should handle search parameter", async () => {
      const mockContactsResult = { items: [], total: 0 };
      const mockContacts: ReturnType<typeof makeOmniClientWithNotes>[] = [];

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);
      vi.mocked(contactsAdapters.toContactsWithNotes).mockReturnValue(mockContacts as any);

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
      expect(json).toEqual({
        error: "Failed to fetch omni clients",
        details: "Database error",
      });
    });
  });

  describe("POST /api/contacts", () => {
    it("should create a new omni client", async () => {
      const mockCreatedContact = {
        id: "contact-2",
        userId: mockUserId,
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        photoUrl: null,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
        lastNote: null,
      };

      const mockOmniClient = makeOmniClient({
        id: "contact-2",
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual" as const,
      });

      // Mock the adapter to return the service-compatible type
      vi.mocked(contactsAdapters.fromOmniClientInput).mockReturnValue({
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      vi.mocked(contactsService.createContactService).mockResolvedValue(mockCreatedContact);
      vi.mocked(contactsAdapters.toOmniClient).mockReturnValue(mockOmniClient as any);

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

      expect(contactsAdapters.fromOmniClientInput).toHaveBeenCalledWith({
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual",
      });
      expect(contactsService.createContactService).toHaveBeenCalledWith(mockUserId, {
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      expect(contactsAdapters.toOmniClient).toHaveBeenCalledWith(mockCreatedContact);
      expect(response).toBeDefined();
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json).toEqual({ item: mockOmniClient });
    });

    it("should handle creation failure", async () => {
      // Mock the adapter to return the service-compatible type
      vi.mocked(contactsAdapters.fromOmniClientInput).mockReturnValue({
        displayName: "Failed Contact",
        primaryEmail: null,
        primaryPhone: null,
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      vi.mocked(contactsService.createContactService).mockResolvedValue(null);

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
        primaryEmail: null,
        primaryPhone: null,
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: "Failed to create client",
      });
    });

    it("should handle service errors during creation", async () => {
      // Mock the adapter to return the service-compatible type
      vi.mocked(contactsAdapters.fromOmniClientInput).mockReturnValue({
        displayName: "Error Contact",
        primaryEmail: null,
        primaryPhone: null,
        source: "manual" as const,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
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
        error: "Failed to create omni client",
        details: "Database error",
      });
    });
  });
});
