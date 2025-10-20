import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import * as healthService from "@/server/services/health.service";

// Mock the health service
vi.mock("@/server/services/health.service");

describe("/api/health API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return system health status", async () => {
      const mockHealthResponse = {
        ts: "2024-01-01T00:00:00.000Z",
        db: true,
      };

      vi.mocked(healthService.getSystemHealthService).mockResolvedValue(mockHealthResponse);

      const request = new Request("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(healthService.getSystemHealthService).toHaveBeenCalledTimes(1);

      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        data: mockHealthResponse,
      });
    });

    it("should handle service errors gracefully", async () => {
      vi.mocked(healthService.getSystemHealthService).mockRejectedValue(
        new Error("Health check failed"),
      );

      const request = new Request("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should return proper content type", async () => {
      const mockHealthResponse = {
        ts: "2024-01-01T00:00:00.000Z",
        db: true,
      };

      vi.mocked(healthService.getSystemHealthService).mockResolvedValue(mockHealthResponse);

      const request = new Request("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });
});
