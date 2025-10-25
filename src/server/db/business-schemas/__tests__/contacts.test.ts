/**
 * Contacts Business Schemas Tests
 *
 * Validates contact operation schemas including create, update, query,
 * list responses, and bulk operations with proper JSONB field handling.
 */

import { describe, it, expect } from "vitest";
import {
  CreateContactBodySchema,
  UpdateContactBodySchema,
  GetContactsQuerySchema,
  ContactListResponseSchema,
  ContactCountResponseSchema,
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  ContactAIInsightsResponseSchema,
} from "../contacts";

describe("Contacts Business Schemas", () => {
  describe("CreateContactBodySchema", () => {
    it("should validate minimal contact with only displayName", () => {
      const input = {
        displayName: "John Doe",
      };

      const result = CreateContactBodySchema.parse(input);

      expect(result.displayName).toBe("John Doe");
      expect(result.primaryEmail).toBeUndefined();
      expect(result.primaryPhone).toBeUndefined();
    });

    it("should validate contact with all fields", () => {
      const input = {
        displayName: "Sarah Johnson",
        primaryEmail: "sarah@example.com",
        primaryPhone: "+1-555-0123",
        photoUrl: "https://example.com/photo.jpg",
        source: "calendar_import",
        lifecycleStage: "Core Client",
        // tags: ["yoga", "regular_attendee"], // Tags field removed - now using relational tagging system
        confidenceScore: "0.85",
        dateOfBirth: "1990-01-15",
        emergencyContactName: "Mike Johnson",
        emergencyContactPhone: "+1-555-0124",
        clientStatus: "active",
        referralSource: "friend",
        address: {
          street: "123 Main St",
          city: "Seattle",
          state: "WA",
          postalCode: "98101",
          country: "USA",
        },
        healthContext: {
          conditions: ["stress"],
          medications: [],
          allergies: [],
        },
        preferences: {
          communicationMethod: "email",
        },
      };

      const result = CreateContactBodySchema.parse(input);

      expect(result.displayName).toBe("Sarah Johnson");
      expect(result.primaryEmail).toBe("sarah@example.com");
    });

    it("should require displayName", () => {
      const input = {};
      expect(() => CreateContactBodySchema.parse(input)).toThrow();
    });

    it("should reject empty displayName", () => {
      const input = { displayName: "" };
      expect(() => CreateContactBodySchema.parse(input)).toThrow();
    });

    it("should validate email format", () => {
      const validInput = {
        displayName: "Test",
        primaryEmail: "test@example.com",
      };
      expect(() => CreateContactBodySchema.parse(validInput)).not.toThrow();

      const invalidInput = {
        displayName: "Test",
        primaryEmail: "not-an-email",
      };
      expect(() => CreateContactBodySchema.parse(invalidInput)).toThrow();
    });

    // Tag validation tests removed - now using relational tagging system

    it("should validate confidenceScore as string", () => {
      const input = {
        displayName: "Test",
        confidenceScore: "0.95",
      };

      const result = CreateContactBodySchema.parse(input);
      expect(result.confidenceScore).toBe("0.95");
    });

    it("should validate address object", () => {
      const input = {
        displayName: "Test",
        address: {
          street: "123 Main St",
          city: "Seattle",
        },
      };

      const result = CreateContactBodySchema.parse(input);
      expect(result.address).toBeDefined();
    });

    it("should validate healthContext object", () => {
      const input = {
        displayName: "Test",
        healthContext: {
          conditions: ["knee pain"],
          medications: [],
        },
      };

      const result = CreateContactBodySchema.parse(input);
      expect(result.healthContext).toBeDefined();
    });

    it("should validate preferences object", () => {
      const input = {
        displayName: "Test",
        preferences: {
          communicationMethod: "email",
        },
      };

      const result = CreateContactBodySchema.parse(input);
      expect(result.preferences).toBeDefined();
    });
  });

  describe("UpdateContactBodySchema", () => {
    it("should validate empty update (all fields optional)", () => {
      const result = UpdateContactBodySchema.parse({});
      expect(result).toEqual({});
    });

    it("should validate partial updates", () => {
      const input = {
        displayName: "Updated Name",
      };

      const result = UpdateContactBodySchema.parse(input);
      expect(result.displayName).toBe("Updated Name");
    });

    it("should allow setting fields to null", () => {
      const input = {
        primaryEmail: null,
        primaryPhone: null,
      };

      const result = UpdateContactBodySchema.parse(input);
      expect(result.primaryEmail).toBeNull();
      expect(result.primaryPhone).toBeNull();
    });

    it("should reject empty displayName if provided", () => {
      const input = { displayName: "" };
      expect(() => UpdateContactBodySchema.parse(input)).toThrow();
    });

    it("should validate email format in updates", () => {
      const invalidInput = {
        primaryEmail: "not-an-email",
      };
      expect(() => UpdateContactBodySchema.parse(invalidInput)).toThrow();
    });

    it("should allow multiple field updates", () => {
      const input = {
        displayName: "New Name",
        primaryEmail: "new@example.com",
        lifecycleStage: "VIP Client",
      };

      const result = UpdateContactBodySchema.parse(input);
      expect(result.displayName).toBe("New Name");
      expect(result.primaryEmail).toBe("new@example.com");
      expect(result.lifecycleStage).toBe("VIP Client");
    });
  });

  describe("GetContactsQuerySchema", () => {
    it("should validate with defaults", () => {
      const result = GetContactsQuerySchema.parse({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sort).toBe("createdAt");
      expect(result.order).toBe("desc");
    });

    it("should validate with all parameters", () => {
      const input = {
        page: 2,
        pageSize: 50,
        sort: "displayName",
        order: "asc",
        search: "john",
        lifecycleStage: ["Core Client", "VIP Client"],
        // tags: ["yoga", "wellness"], // Tags field removed - now using relational tagging system
        source: ["calendar_import"],
        hasEmail: true,
        hasPhone: false,
        createdAfter: "2024-01-01",
        createdBefore: "2024-12-31",
      };

      const result = GetContactsQuerySchema.parse(input);

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
      expect(result.sort).toBe("displayName");
      expect(result.search).toBe("john");
      expect(result.lifecycleStage).toHaveLength(2);
      expect(result.hasEmail).toBe(true);
    });

    it("should enforce pageSize maximum of 3000", () => {
      const input = { pageSize: 3001 };
      expect(() => GetContactsQuerySchema.parse(input)).toThrow();
    });

    it("should accept pageSize up to 3000", () => {
      const result = GetContactsQuerySchema.parse({ pageSize: 3000 });
      expect(result.pageSize).toBe(3000);
    });

    it("should validate sort enum values", () => {
      const validSorts = ["displayName", "createdAt", "updatedAt"];

      validSorts.forEach((sort) => {
        const result = GetContactsQuerySchema.parse({ sort });
        expect(result.sort).toBe(sort);
      });
    });

    it("should reject invalid sort values", () => {
      const input = { sort: "invalidSort" };
      expect(() => GetContactsQuerySchema.parse(input)).toThrow();
    });

    it("should coerce string numbers to integers", () => {
      const result = GetContactsQuerySchema.parse({
        page: "3",
        pageSize: "25",
      } as any);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it("should coerce date strings to Date objects", () => {
      const result = GetContactsQuerySchema.parse({
        createdAfter: "2024-01-01",
      } as any);

      expect(result.createdAfter).toBeInstanceOf(Date);
    });
  });

  describe("ContactListResponseSchema", () => {
    it("should validate empty contact list", () => {
      const input = {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      const result = ContactListResponseSchema.parse(input);
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should require items array", () => {
      const input = {
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      expect(() => ContactListResponseSchema.parse(input)).toThrow();
    });

    it("should require pagination object", () => {
      const input = {
        items: [],
      };

      expect(() => ContactListResponseSchema.parse(input)).toThrow();
    });

    it("should validate pagination fields", () => {
      const input = {
        items: [],
        pagination: {
          page: 2,
          pageSize: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: true,
        },
      };

      const result = ContactListResponseSchema.parse(input);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  describe("ContactCountResponseSchema", () => {
    it("should validate count response", () => {
      const input = { count: 42 };
      const result = ContactCountResponseSchema.parse(input);
      expect(result.count).toBe(42);
    });

    it("should require count field", () => {
      expect(() => ContactCountResponseSchema.parse({})).toThrow();
    });

    it("should reject non-number count", () => {
      const input = { count: "42" };
      expect(() => ContactCountResponseSchema.parse(input)).toThrow();
    });

    it("should accept zero count", () => {
      const result = ContactCountResponseSchema.parse({ count: 0 });
      expect(result.count).toBe(0);
    });
  });

  describe("BulkDeleteBodySchema", () => {
    it("should validate array of UUIDs", () => {
      const input = {
        ids: ["550e8400-e29b-41d4-a716-446655440000", "650e8400-e29b-41d4-a716-446655440001"],
      };

      const result = BulkDeleteBodySchema.parse(input);
      expect(result.ids).toHaveLength(2);
    });

    it("should require at least one ID", () => {
      const input = { ids: [] };
      expect(() => BulkDeleteBodySchema.parse(input)).toThrow();
    });

    it("should enforce maximum of 100 IDs", () => {
      const ids = Array.from({ length: 101 }, (_, i) =>
        `${i}50e8400-e29b-41d4-a716-446655440000`.slice(0, 36),
      );
      const input = { ids };

      expect(() => BulkDeleteBodySchema.parse(input)).toThrow();
    });

    it("should accept exactly 100 IDs", () => {
      const ids = Array.from(
        { length: 100 },
        (_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`,
      );
      const input = { ids };

      const result = BulkDeleteBodySchema.parse(input);
      expect(result.ids).toHaveLength(100);
    });

    it("should validate UUID format for all IDs", () => {
      const input = {
        ids: ["not-a-uuid", "also-not-a-uuid"],
      };

      expect(() => BulkDeleteBodySchema.parse(input)).toThrow();
    });
  });

  describe("BulkDeleteResponseSchema", () => {
    it("should validate successful bulk delete", () => {
      const input = {
        deleted: 5,
        errors: [],
      };

      const result = BulkDeleteResponseSchema.parse(input);
      expect(result.deleted).toBe(5);
      expect(result.errors).toEqual([]);
    });

    it("should validate bulk delete with errors", () => {
      const input = {
        deleted: 3,
        errors: [
          { id: "id-1", error: "Not found" },
          { id: "id-2", error: "Permission denied" },
        ],
      };

      const result = BulkDeleteResponseSchema.parse(input);
      expect(result.deleted).toBe(3);
      expect(result.errors).toHaveLength(2);
    });

    it("should require deleted field", () => {
      const input = { errors: [] };
      expect(() => BulkDeleteResponseSchema.parse(input)).toThrow();
    });

    it("should require errors array", () => {
      const input = { deleted: 0 };
      expect(() => BulkDeleteResponseSchema.parse(input)).toThrow();
    });
  });

  describe("ContactAIInsightsResponseSchema", () => {
    it("should validate complete AI insights response", () => {
      const input = {
        insights: "Client shows consistent engagement with yoga classes",
        suggestions: ["Offer meditation classes", "Create loyalty program"],
        nextSteps: ["Schedule follow-up", "Send survey"],
        confidence: 0.85,
        keyFindings: ["Regular attendance", "High satisfaction"],
        error: false,
      };

      const result = ContactAIInsightsResponseSchema.parse(input);

      expect(result.insights).toBeTruthy();
      expect(result.suggestions).toHaveLength(2);
      expect(result.confidence).toBe(0.85);
    });

    it("should validate error response", () => {
      const input = {
        insights: "",
        suggestions: [],
        nextSteps: [],
        confidence: 0,
        keyFindings: [],
        error: true,
        errorMessage: "AI service unavailable",
      };

      const result = ContactAIInsightsResponseSchema.parse(input);
      expect(result.error).toBe(true);
      expect(result.errorMessage).toBe("AI service unavailable");
    });

    it("should enforce confidence range 0-1", () => {
      const invalidLow = {
        insights: "test",
        suggestions: [],
        nextSteps: [],
        confidence: -0.1,
        keyFindings: [],
      };
      expect(() => ContactAIInsightsResponseSchema.parse(invalidLow)).toThrow();

      const invalidHigh = {
        insights: "test",
        suggestions: [],
        nextSteps: [],
        confidence: 1.1,
        keyFindings: [],
      };
      expect(() => ContactAIInsightsResponseSchema.parse(invalidHigh)).toThrow();
    });

    it("should accept confidence boundaries", () => {
      const min = ContactAIInsightsResponseSchema.parse({
        insights: "test",
        suggestions: [],
        nextSteps: [],
        confidence: 0,
        keyFindings: [],
      });
      expect(min.confidence).toBe(0);

      const max = ContactAIInsightsResponseSchema.parse({
        insights: "test",
        suggestions: [],
        nextSteps: [],
        confidence: 1,
        keyFindings: [],
      });
      expect(max.confidence).toBe(1);
    });

    it("should accept optional error fields", () => {
      const result = ContactAIInsightsResponseSchema.parse({
        insights: "test",
        suggestions: [],
        nextSteps: [],
        confidence: 0.5,
        keyFindings: [],
      });

      expect(result.error).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });
  });
});
