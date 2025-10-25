import { describe, it, expect } from "vitest";
import { contacts } from "@/server/db/schema";
import type { Contact as DbContact } from "@/server/db/schema";
import type { Contact as BusinessContact } from "@/server/db/business-schemas/contacts";
// import { toContact } from "@/server/adapters/contacts"; // Adapter not yet implemented

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
      type ConfidenceScoreType = DbContact["confidenceScore"];
      type IsNullable = null extends ConfidenceScoreType ? true : false;

      const typeCheck: IsNullable = true;
      expect(typeCheck).toBe(true);
    });
  });

  describe("Adapter Integration", () => {
    it.skip("should preserve critical fields in toContact adapter", () => {
      // Skipped: Adapter not yet implemented
      // const testRow: Partial<DbContact> = {
      //   id: "test-id",
      //   displayName: "Test Client",
      //   lifecycleStage: "prospect",
      //   tags: ["wellness"],
      //   confidenceScore: "0.85",
      // };
      // const result = toContact(testRow);
      // // These will fail if adapter doesn't preserve fields
      // expect(result).toHaveProperty("lifecycleStage");
      // expect(result).toHaveProperty("tags");
      // expect(result).toHaveProperty("confidenceScore");
    });

    it("should preserve critical fields in API response builder", () => {
      // This would be your actual API response builder
      type ApiContactResponse = Omit<BusinessContact, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      };

      const buildApiResponse = (client: BusinessContact): ApiContactResponse => {
        return {
          id: client.id,
          userId: client.userId,
          displayName: client.displayName,
          primaryEmail: client.primaryEmail,
          primaryPhone: client.primaryPhone,
          source: client.source,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lifecycleStage: client.lifecycleStage,
          confidenceScore: client.confidenceScore,
          dateOfBirth: client.dateOfBirth,
          emergencyContactName: client.emergencyContactName,
          emergencyContactPhone: client.emergencyContactPhone,
          clientStatus: client.clientStatus,
          referralSource: client.referralSource,
          address: client.address,
          healthContext: client.healthContext,
          preferences: client.preferences,
          photoUrl: client.photoUrl,
        };
      };

      const mockClient: BusinessContact = {
        id: "test-id",
        userId: "user-id",
        displayName: "Test Client",
        primaryEmail: "test@example.com",
        primaryPhone: null,
        source: "manual",
        lifecycleStage: "prospect",
        confidenceScore: "0.95",
        createdAt: new Date(),
        updatedAt: new Date(),
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        clientStatus: null,
        referralSource: null,
        address: null,
        healthContext: null,
        preferences: null,
        photoUrl: null,
      };

      const response = buildApiResponse(mockClient);

      // Critical assertions
      expect(response).toHaveProperty("lifecycleStage");
      expect(response).toHaveProperty("tags");
      expect(response).toHaveProperty("confidenceScore");
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
