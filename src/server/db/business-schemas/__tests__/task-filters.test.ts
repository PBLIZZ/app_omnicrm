import { describe, it, expect } from "vitest";
import { TaskFiltersSchema } from "../productivity";

describe("TaskFiltersSchema", () => {
  it("should handle empty query params", () => {
    const result = TaskFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it("should handle status as string and convert to array", () => {
    const result = TaskFiltersSchema.parse({ status: "todo" });
    expect(result.status).toEqual(["todo"]);
  });

  it("should handle priority as string and convert to array", () => {
    const result = TaskFiltersSchema.parse({ priority: "high" });
    expect(result.priority).toEqual(["high"]);
  });

  it('should handle hasSubtasks as string "true" and convert to boolean', () => {
    const result = TaskFiltersSchema.parse({ hasSubtasks: "true" });
    expect(result.hasSubtasks).toBe(true);
  });

  it('should handle hasSubtasks as string "false" and convert to boolean', () => {
    const result = TaskFiltersSchema.parse({ hasSubtasks: "false" });
    expect(result.hasSubtasks).toBe(false);
  });

  it("should handle hasSubtasks as boolean directly", () => {
    const result = TaskFiltersSchema.parse({ hasSubtasks: true });
    expect(result.hasSubtasks).toBe(true);
  });

  it("should handle projectId as valid UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = TaskFiltersSchema.parse({ projectId: uuid });
    expect(result.projectId).toBe(uuid);
  });

  it("should handle dueAfter as date string", () => {
    const result = TaskFiltersSchema.parse({ dueAfter: "2025-01-01" });
    expect(result.dueAfter).toBeInstanceOf(Date);
  });

  it("should handle dueBefore as date string", () => {
    const result = TaskFiltersSchema.parse({ dueBefore: "2025-12-31" });
    expect(result.dueBefore).toBeInstanceOf(Date);
  });

  it("should handle search query", () => {
    const result = TaskFiltersSchema.parse({ search: "test task" });
    expect(result.search).toBe("test task");
  });

  it("should handle complex query with multiple filters", () => {
    const result = TaskFiltersSchema.parse({
      status: "todo",
      priority: "high",
      search: "important",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      hasSubtasks: "true",
    });

    expect(result).toMatchObject({
      status: ["todo"],
      priority: ["high"],
      search: "important",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      hasSubtasks: true,
    });
  });

  it("should reject invalid UUID for projectId", () => {
    expect(() => TaskFiltersSchema.parse({ projectId: "not-a-uuid" })).toThrow();
  });

  it("should allow extra query params (not strict)", () => {
    // This should not throw even with extra params
    const result = TaskFiltersSchema.parse({
      status: "todo",
      extraParam: "should be ignored",
      anotherExtra: "123",
    });
    
    expect(result.status).toEqual(["todo"]);
    // Extra params should be filtered out by Zod
  });
});
