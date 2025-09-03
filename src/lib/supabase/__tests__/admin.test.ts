import { describe, it, expect, beforeEach } from "vitest";
import { supaAdminGuard } from "../admin";

describe("supaAdminGuard", () => {
  beforeEach(() => {
    // Ensure tests run with NODE_ENV=test behavior (no real client)
    process.env.NODE_ENV = "test";
  });

  it("allows insert on allow-listed table (returns empty array in tests)", async () => {
    const result = await supaAdminGuard.insert("interactions", { foo: "bar" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("rejects insert on non-allow-listed table", async () => {
    await expect(supaAdminGuard.insert("users", { id: 1 })).rejects.toThrow(
      "admin_write_forbidden",
    );
  });

  it("rejects upsert and update on non-allow-listed table", async () => {
    await expect(
      supaAdminGuard.upsert("profiles", { id: 1 }, { onConflict: "id" }),
    ).rejects.toThrow("admin_write_forbidden");
    await expect(supaAdminGuard.update("profiles", { id: 1 }, { name: "x" })).rejects.toThrow(
      "admin_write_forbidden",
    );
  });
});
