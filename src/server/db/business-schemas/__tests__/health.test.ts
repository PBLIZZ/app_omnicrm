/**
 * Health Check Schemas Tests
 */

import { describe, it, expect } from "vitest";
import {
  HealthResponseSchema,
  DbPingResponseSchema,
  GoogleSignInQuerySchema,
} from "../health";

describe("Health Check Schemas", () => {
  describe("HealthResponseSchema", () => {
    it("should validate with required ts field", () => {
      const input = { ts: "2024-01-01T00:00:00Z" };
      const result = HealthResponseSchema.parse(input);
      expect(result.ts).toBe("2024-01-01T00:00:00Z");
    });

    it("should validate with optional db field", () => {
      const input = { ts: "2024-01-01T00:00:00Z", db: true };
      const result = HealthResponseSchema.parse(input);
      expect(result.db).toBe(true);
    });

    it("should reject missing ts field", () => {
      expect(() => HealthResponseSchema.parse({})).toThrow();
    });

    it("should accept db as false", () => {
      const input = { ts: "2024-01-01", db: false };
      const result = HealthResponseSchema.parse(input);
      expect(result.db).toBe(false);
    });
  });

  describe("DbPingResponseSchema", () => {
    it("should validate complete response", () => {
      const input = {
        status: "healthy" as const,
        timestamp: "2024-01-01T00:00:00Z",
      };
      const result = DbPingResponseSchema.parse(input);
      expect(result.status).toBe("healthy");
      expect(result.timestamp).toBe("2024-01-01T00:00:00Z");
    });

    it("should require status field", () => {
      const input = { timestamp: "2024-01-01" };
      expect(() => DbPingResponseSchema.parse(input)).toThrow();
    });

    it("should require timestamp field", () => {
      const input = { status: "healthy" };
      expect(() => DbPingResponseSchema.parse(input)).toThrow();
    });

    it("should only accept literal 'healthy'", () => {
      const input = { status: "unhealthy", timestamp: "2024-01-01" };
      expect(() => DbPingResponseSchema.parse(input)).toThrow();
    });
  });

  describe("GoogleSignInQuerySchema", () => {
    it("should validate with redirectTo", () => {
      const input = { redirectTo: "/dashboard" };
      const result = GoogleSignInQuerySchema.parse(input);
      expect(result.redirectTo).toBe("/dashboard");
    });

    it("should validate without redirectTo", () => {
      const result = GoogleSignInQuerySchema.parse({});
      expect(result.redirectTo).toBeUndefined();
    });

    it("should accept empty redirectTo string", () => {
      const result = GoogleSignInQuerySchema.parse({ redirectTo: "" });
      expect(result.redirectTo).toBe("");
    });

    it("should accept URL with query params", () => {
      const input = { redirectTo: "/dashboard?tab=contacts&filter=active" };
      const result = GoogleSignInQuerySchema.parse(input);
      expect(result.redirectTo).toBe("/dashboard?tab=contacts&filter=active");
    });
  });
});
