/**
 * Admin Business Schemas Tests
 *
 * Validates all admin operation schemas for proper data validation,
 * error handling, and type safety.
 */

import { describe, it, expect } from "vitest";
import {
  EmailIntelligenceTriggerSchema,
  EmailIntelligenceResponseSchema,
  ReplayInputSchema,
  ReplayResponseSchema,
  DashboardQuerySchema,
  DashboardResponseSchema,
} from "../admin";

describe("Admin Business Schemas", () => {
  describe("EmailIntelligenceTriggerSchema", () => {
    it("should validate with default values", () => {
      const result = EmailIntelligenceTriggerSchema.parse({});
      
      expect(result.batchSize).toBe(100);
      expect(result.dryRun).toBe(false);
    });

    it("should validate with custom values", () => {
      const input = {
        batchSize: 50,
        dryRun: true,
      };
      
      const result = EmailIntelligenceTriggerSchema.parse(input);
      
      expect(result.batchSize).toBe(50);
      expect(result.dryRun).toBe(true);
    });

    it("should enforce minimum batchSize", () => {
      const input = { batchSize: 0 };
      
      expect(() => EmailIntelligenceTriggerSchema.parse(input)).toThrow();
    });

    it("should enforce maximum batchSize", () => {
      const input = { batchSize: 1001 };
      
      expect(() => EmailIntelligenceTriggerSchema.parse(input)).toThrow();
    });

    it("should reject non-integer batchSize", () => {
      const input = { batchSize: 50.5 };
      
      expect(() => EmailIntelligenceTriggerSchema.parse(input)).toThrow();
    });

    it("should accept valid boundary values", () => {
      const min = EmailIntelligenceTriggerSchema.parse({ batchSize: 1 });
      const max = EmailIntelligenceTriggerSchema.parse({ batchSize: 1000 });
      
      expect(min.batchSize).toBe(1);
      expect(max.batchSize).toBe(1000);
    });
  });

  describe("EmailIntelligenceResponseSchema", () => {
    it("should validate complete response", () => {
      const input = {
        error: "Some error message",
        timestamp: "2024-01-01T00:00:00Z",
      };
      
      const result = EmailIntelligenceResponseSchema.parse(input);
      
      expect(result.error).toBe("Some error message");
      expect(result.timestamp).toBe("2024-01-01T00:00:00Z");
    });

    it("should reject missing error field", () => {
      const input = {
        timestamp: "2024-01-01T00:00:00Z",
      };
      
      expect(() => EmailIntelligenceResponseSchema.parse(input)).toThrow();
    });

    it("should reject missing timestamp field", () => {
      const input = {
        error: "Some error",
      };
      
      expect(() => EmailIntelligenceResponseSchema.parse(input)).toThrow();
    });

    it("should accept empty error string", () => {
      const input = {
        error: "",
        timestamp: "2024-01-01T00:00:00Z",
      };
      
      const result = EmailIntelligenceResponseSchema.parse(input);
      expect(result.error).toBe("");
    });
  });

  describe("ReplayInputSchema", () => {
    it("should validate with defaults", () => {
      const result = ReplayInputSchema.parse({});
      
      expect(result.operation).toBeUndefined();
      expect(result.batchSize).toBe(100);
      expect(result.dryRun).toBe(false);
    });

    it("should validate with all fields", () => {
      const input = {
        operation: "events" as const,
        batchSize: 250,
        dryRun: true,
      };
      
      const result = ReplayInputSchema.parse(input);
      
      expect(result.operation).toBe("events");
      expect(result.batchSize).toBe(250);
      expect(result.dryRun).toBe(true);
    });

    it("should validate all operation types", () => {
      const operations = ["events", "interactions", "insights"] as const;
      
      operations.forEach((op) => {
        const result = ReplayInputSchema.parse({ operation: op });
        expect(result.operation).toBe(op);
      });
    });

    it("should reject invalid operation type", () => {
      const input = { operation: "invalid" };
      
      expect(() => ReplayInputSchema.parse(input)).toThrow();
    });

    it("should enforce batchSize constraints", () => {
      expect(() => ReplayInputSchema.parse({ batchSize: 0 })).toThrow();
      expect(() => ReplayInputSchema.parse({ batchSize: 1001 })).toThrow();
      
      // Valid boundaries
      const min = ReplayInputSchema.parse({ batchSize: 1 });
      const max = ReplayInputSchema.parse({ batchSize: 1000 });
      expect(min.batchSize).toBe(1);
      expect(max.batchSize).toBe(1000);
    });
  });

  describe("ReplayResponseSchema", () => {
    it("should validate complete response", () => {
      const input = {
        error: "Replay failed",
        timestamp: "2024-01-01T10:00:00Z",
      };
      
      const result = ReplayResponseSchema.parse(input);
      
      expect(result.error).toBe("Replay failed");
      expect(result.timestamp).toBe("2024-01-01T10:00:00Z");
    });

    it("should require both fields", () => {
      expect(() => ReplayResponseSchema.parse({ error: "test" })).toThrow();
      expect(() => ReplayResponseSchema.parse({ timestamp: "2024-01-01" })).toThrow();
    });
  });

  describe("DashboardQuerySchema", () => {
    it("should validate empty query", () => {
      const result = DashboardQuerySchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept additional properties (for future expansion)", () => {
      // Schema currently has no defined properties
      const result = DashboardQuerySchema.parse({});
      expect(result).toBeDefined();
    });
  });

  describe("DashboardResponseSchema", () => {
    it("should validate complete dashboard response", () => {
      const input = {
        gmail: {
          isConnected: true,
          status: "active",
          lastSync: "2024-01-01T00:00:00Z",
        },
        calendar: {
          isConnected: false,
          status: "disconnected",
          lastSync: null,
        },
        jobs: {
          pending: 5,
          processing: 2,
          failed: 1,
        },
        timestamp: "2024-01-01T12:00:00Z",
      };
      
      const result = DashboardResponseSchema.parse(input);
      
      expect(result.gmail.isConnected).toBe(true);
      expect(result.gmail.status).toBe("active");
      expect(result.gmail.lastSync).toBe("2024-01-01T00:00:00Z");
      expect(result.calendar.isConnected).toBe(false);
      expect(result.calendar.lastSync).toBeNull();
      expect(result.jobs.pending).toBe(5);
      expect(result.jobs.processing).toBe(2);
      expect(result.jobs.failed).toBe(1);
      expect(result.timestamp).toBe("2024-01-01T12:00:00Z");
    });

    it("should require gmail object", () => {
      const input = {
        calendar: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(input)).toThrow();
    });

    it("should require calendar object", () => {
      const input = {
        gmail: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(input)).toThrow();
    });

    it("should require jobs object", () => {
      const input = {
        gmail: { isConnected: false, status: "off", lastSync: null },
        calendar: { isConnected: false, status: "off", lastSync: null },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(input)).toThrow();
    });

    it("should validate jobs with zero counts", () => {
      const input = {
        gmail: { isConnected: false, status: "off", lastSync: null },
        calendar: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      const result = DashboardResponseSchema.parse(input);
      expect(result.jobs.pending).toBe(0);
      expect(result.jobs.processing).toBe(0);
      expect(result.jobs.failed).toBe(0);
    });

    it("should accept null lastSync values", () => {
      const input = {
        gmail: { isConnected: false, status: "inactive", lastSync: null },
        calendar: { isConnected: false, status: "inactive", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      const result = DashboardResponseSchema.parse(input);
      expect(result.gmail.lastSync).toBeNull();
      expect(result.calendar.lastSync).toBeNull();
    });

    it("should reject missing nested required fields", () => {
      const invalidGmail = {
        gmail: { isConnected: true }, // Missing status and lastSync
        calendar: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(invalidGmail)).toThrow();
    });

    it("should reject non-boolean isConnected", () => {
      const input = {
        gmail: { isConnected: "true", status: "active", lastSync: null },
        calendar: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: 0, processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(input)).toThrow();
    });

    it("should reject non-number job counts", () => {
      const input = {
        gmail: { isConnected: false, status: "off", lastSync: null },
        calendar: { isConnected: false, status: "off", lastSync: null },
        jobs: { pending: "5", processing: 0, failed: 0 },
        timestamp: "2024-01-01",
      };
      
      expect(() => DashboardResponseSchema.parse(input)).toThrow();
    });
  });
});
