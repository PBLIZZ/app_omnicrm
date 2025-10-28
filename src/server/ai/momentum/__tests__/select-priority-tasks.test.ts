import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectTop3PriorityTasks } from "../select-priority-tasks";
import type { Task } from "@/server/db/schema";

vi.mock("@/server/ai/core/llm.service", () => ({
  generateText: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

const { generateText } = await import("@/server/ai/core/llm.service");

const makeTask = (id: string, name: string, priority: "low"|"medium"|"high" = "low"): Task => ({
  id,
  userId: "user-1",
  name,
  description: null,
  status: "todo",
  priority,
  dueDate: null,
  zoneUuid: null,
  projectId: null,
  parentTaskId: null,
  details: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("selectTop3PriorityTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all tasks directly when tasks length <= 3 (no LLM call)", async () => {
    const tasks = [makeTask("t1","A","high"), makeTask("t2","B","medium")];
    const result = await selectTop3PriorityTasks("user-1", tasks);

    expect(result.rankedTasks).toHaveLength(2);
    expect(result.confidenceLevel).toBe("high");
    expect(generateText).not.toHaveBeenCalled();
    expect(result.rankedTasks[0]).toMatchObject({ taskId: "t1", ranking: 1 });
  });

  it("uses LLM and validates response for >3 tasks", async () => {
    const tasks = [
      makeTask("t1","A","low"),
      makeTask("t2","B","low"),
      makeTask("t3","C","low"),
      makeTask("t4","D","low"),
    ];

    vi.mocked(generateText).mockResolvedValue({
      data: {
        rankedTasks: [
          { taskId: "t4", ranking: 1, reasoning: "Most impact", aiScore: 95 },
          { taskId: "t2", ranking: 2, reasoning: "Next impact", aiScore: 90 },
          { taskId: "t1", ranking: 3, reasoning: "Third impact", aiScore: 80 },
        ],
        summary: "Top 3 chosen",
        confidenceLevel: "high",
      },
    } as any);

    const result = await selectTop3PriorityTasks("user-1", tasks);
    expect(generateText).toHaveBeenCalled();
    expect(result.rankedTasks.map(r=>r.taskId)).toEqual(["t4","t2","t1"]);
    expect(result.summary).toBe("Top 3 chosen");
  });

  it("falls back to priority sort when LLM fails", async () => {
    const tasks = [
      makeTask("a","A","low"),
      makeTask("b","B","high"),
      makeTask("c","C","medium"),
      makeTask("d","D","high"),
    ];

    vi.mocked(generateText).mockRejectedValue(new Error("LLM down"));

    const result = await selectTop3PriorityTasks("user-1", tasks);
    // Should pick highs first then medium
    expect(result.confidenceLevel).toBe("low");
    expect(result.rankedTasks.map(r=>r.taskId)).toEqual(["b","d","c"]);
    // Reasoning text from fallback
    expect(result.rankedTasks[0].reasoning).toContain("fallback");
  });
});