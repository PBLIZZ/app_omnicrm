import { describe, it, expect, vi, beforeEach } from "vitest";
import { log } from "../../server/lib/pino-logger";

describe("sanity", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("emits info logs", () => {
    const spy = vi.spyOn(log, "info");
    log.info({ route: "/api/health", reqId: "test" }, "health ping");
    expect(spy).toHaveBeenCalled();
  });
});
