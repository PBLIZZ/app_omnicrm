import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import * as dbClient from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client");

describe("/api/db-ping API Route", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      execute: vi.fn(),
    };

    vi.mocked(dbClient.getDb).mockResolvedValue(mockDb);
  });

  describe("GET /api/db-ping", () => {
    it("should return healthy status when database is accessible", async () => {
      mockDb.execute.mockResolvedValue([{ "?column?": 1 }]);

      const request = new Request("http://localhost:3000/api/db-ping");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(dbClient.getDb).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));

      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        data: {
          status: "healthy",
          timestamp: expect.any(String),
        },
      });
    });

    it("should return error when database connection fails", async () => {
      mockDb.execute.mockRejectedValue(new Error("Connection failed"));

      const request = new Request("http://localhost:3000/api/db-ping");
      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("Database connection failed");
    });

    it("should return proper content type", async () => {
      mockDb.execute.mockResolvedValue([{ "?column?": 1 }]);

      const request = new Request("http://localhost:3000/api/db-ping");
      const response = await GET(request);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("should execute a simple select query", async () => {
      mockDb.execute.mockResolvedValue([{ "?column?": 1 }]);

      const request = new Request("http://localhost:3000/api/db-ping");
      await GET(request);

      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
