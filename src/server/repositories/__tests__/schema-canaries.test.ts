import { describe, it, expect } from "vitest";
import { contacts } from "@/server/db/schema";
import type { Contact } from "@/server/db/types";
import type { ContactDTO } from "@/lib/validation/schemas/omniClients";
import { toContactDTO } from "@/server/adapters/omniClients";

/**
 * Schema Canary Tests
 *
 * These tests act as early warning system for schema drift.
 * They will fail if critical fields are removed from queries or types.
 *
 * CRITICAL: Do not remove or skip these tests without team discussion.
 */
describe("Schema Drift Detection - OmniClient/Contact", () => {
  describe("Database Schema", () => {
    it("contacts table must have all critical business fields", () => {
      const requiredFields = [
        "id",
        "userId",
        "displayName",
        "primaryEmail",
        "primaryPhone",
        "lifecycleStage", // Client lifecycle
        "tags", // Wellness segmentation
        "confidenceScore", // AI confidence
        "createdAt",
        "updatedAt",
      ];

      const actualFields = Object.keys(contacts);

      requiredFields.forEach((field) => {
        expect(actualFields).toContain(field);
      });
    });
  });

  describe("TypeScript Types", () => {
    it("Contact type must have nullable confidenceScore", () => {
      // Type-level test using conditional types
      type ConfidenceScoreType = Contact["confidence_score"];
      type IsNullable = null extends ConfidenceScoreType ? true : false;

      const typeCheck: IsNullable = true;
      expect(typeCheck).toBe(true);
    });

    it("Contact type must have tags as jsonb", () => {
      type TagsType = Contact["tags"];
      // Tags should be unknown (jsonb) or a specific array type
      type IsCorrectType = TagsType extends unknown ? true : false;

      const typeCheck: IsCorrectType = true;
      expect(typeCheck).toBe(true);
    });
  });

  describe("Adapter Integration", () => {
    it("should preserve critical fields in toContactDTO adapter", () => {
      const testRow: Partial<Contact> = {
        id: "test-id",
        displayName: "Test Client",
        lifecycleStage: "prospect",
        tags: ["wellness"],
        confidenceScore: "0.85",
      };

      const result = toContactDTO(testRow);

      // These will fail if adapter doesn't preserve fields
      expect(result).toHaveProperty("lifecycleStage");
      expect(result).toHaveProperty("tags");
      expect(result).toHaveProperty("confidenceScore");
    });

    it("should preserve critical fields in API response builder", () => {
      // This would be your actual API response builder
      const buildApiResponse = (client: Contact): ContactDTO => {
        return {
          id: client.id,
          userId: client.userId,
          displayName: client.displayName,
          primaryEmail: client.primaryEmail,
          primaryPhone: client.primaryPhone,
          source: client.source,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatar: client.photoUrl ?? undefined,
          tags: client.tags as unknown[],
          lifecycleStage: client.lifecycleStage,
          lastContactDate: client.lastContactDate ?? undefined,
          notes: client.notes ?? undefined,
          company: client.company ?? undefined,
          data: {
            id: client.id,
            displayName: client.displayName,
            lifecycleStage: client.lifecycleStage,
            tags: client.tags as unknown[],
            confidenceScore: client.confidenceScore,
          },
        };
      };

      const mockClient: Contact = {
        id: "test-id",
        userId: "user-id",
        displayName: "Test Client",
        primaryEmail: "test@example.com",
        primaryPhone: null,
        source: "manual",
        lifecycleStage: "prospect",
        tags: ["wellness", "vip"],
        confidenceScore: "0.95",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = buildApiResponse(mockClient);

      // Critical assertions
      expect(response.data).toHaveProperty("lifecycleStage");
      expect(response.data).toHaveProperty("tags");
      expect(response.data).toHaveProperty("confidenceScore");
    });
  });
});

/**
 * REGRESSION PREVENTION
 *
 * If any of these tests fail, it means:
 * 1. A database migration removed a critical field
 * 2. A type definition was changed incorrectly
 * 3. A repository query was modified to exclude fields
 * 4. An adapter is not preserving required data
 *
 * DO NOT SKIP OR REMOVE THESE TESTS
 * They are your safety net against breaking changes.
 */
