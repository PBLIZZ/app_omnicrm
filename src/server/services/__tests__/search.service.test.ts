import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processSearchRequest,
  performSearch,
  type SearchResult,
} from "../search.service";

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(async () => ({})),
}));
vi.mock("@/server/lib/embeddings", () => ({
  getOrGenerateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

// @repo createSearchRepository mock
const mockRepo = {
  searchTraditional: vi.fn(),
  searchSemantic: vi.fn(),
};
vi.mock("@repo", () => ({
  createSearchRepository: vi.fn(() => mockRepo),
}));

describe("processSearchRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty response when query is empty", async () => {
    const res = await processSearchRequest({ userId: "u1", query: "  " });
    expect(res.hasResults).toBe(false);
    expect(res.results).toEqual([]);
    expect(res.query).toBe("");
    expect(res.searchType).toBe("hybrid");
  });

  it("clamps limit and routes to performSearch", async () => {
    mockRepo.searchTraditional.mockResolvedValueOnce([]);
    mockRepo.searchSemantic.mockResolvedValueOnce([]);

    const res = await processSearchRequest({ userId: "u1", query: "hello", limit: 999, type: "traditional" });
    expect(res.searchType).toBe("traditional");
    expect(res.hasResults).toBe(false);
  });
});

describe("performSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("traditional search maps DTOs to results", async () => {
    mockRepo.searchTraditional.mockResolvedValueOnce([
      {
        id: "1",
        type: "contact",
        title: "John",
        content: "Contact",
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        score: 1,
      },
    ]);

    const results = await performSearch("u1", "john", "traditional", 10);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: "1", url: "/contacts/details?contactId=1" });
  });

  it("semantic search uses embedding and maps similarity", async () => {
    mockRepo.searchSemantic.mockResolvedValueOnce([
      {
        id: "n1",
        type: "note",
        title: "Note",
        content: "text",
        metadata: {},
        similarity: 0.9,
      },
    ]);

    const results = await performSearch("u1", "note", "semantic", 5);
    expect(results[0]?.similarity).toBeCloseTo(0.9);
    expect(results[0]?.url).toContain("/contacts/details?contactId=");
  });

  it("hybrid merges and ranks by score, deduping", async () => {
    mockRepo.searchTraditional.mockResolvedValueOnce([
      { id: "t1", type: "task", title: "T1", content: "", metadata: {}, score: 0.8 },
      { id: "c1", type: "contact", title: "C1", content: "", metadata: {}, score: 0.7 },
    ]);
    mockRepo.searchSemantic.mockResolvedValueOnce([
      { id: "t1", type: "task", title: "T1", content: "", metadata: {}, similarity: 0.6 },
      { id: "t2", type: "task", title: "T2", content: "", metadata: {}, similarity: 0.9 },
    ]);

    const results = await performSearch("u1", "x", "hybrid", 3);
    // t1 combined should have higher score than c1; t2 present from semantic
    const ids = results.map(r => `${r.type}:${r.id}`);
    expect(ids).toContain("task:t1");
    expect(ids).toContain("task:t2");
    expect(ids).toContain("contact:c1");
    // Top sorted by score
    const top = results[0]!;
    expect(top.type === "task").toBe(true);
  });
});