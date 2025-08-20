import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock pino and pino-pretty before importing the log module
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock pino constructor to return our mock logger and capture redact config
let pinoConfig: any = {};
vi.mock("pino", () => {
  const mockPino = vi.fn((config: any) => {
    pinoConfig = config;
    return mockLogger;
  });
  mockPino.stdTimeFunctions = { isoTime: vi.fn() };
  return { default: mockPino };
});

vi.mock("pino-pretty", () => ({
  default: vi.fn(() => ({})),
}));

describe("log redaction configuration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("configures pino with correct redaction paths", async () => {
    await import("./log");

    // Verify pino was configured with redaction settings
    expect(pinoConfig.redact).toBeDefined();
    expect(pinoConfig.redact.censor).toBe("[redacted]");

    // Verify all sensitive paths are configured for redaction
    const redactPaths = pinoConfig.redact.paths;
    expect(redactPaths).toContain("req.headers.authorization");
    expect(redactPaths).toContain("req.headers.cookie");
    expect(redactPaths).toContain("token");
    expect(redactPaths).toContain("access_token");
    expect(redactPaths).toContain("refresh_token");
    expect(redactPaths).toContain("payload.accessToken");
    expect(redactPaths).toContain("payload.refreshToken");
  });

  it("logs messages through the configured logger", async () => {
    const { log } = await import("./log");

    const testData = {
      userId: "user-123",
      operation: "test",
    };

    log.info(testData, "Test message");
    log.warn(testData, "Warning message");
    log.error(testData, "Error message");
    log.debug(testData, "Debug message");

    expect(mockLogger.info).toHaveBeenCalledWith(testData, "Test message");
    expect(mockLogger.warn).toHaveBeenCalledWith(testData, "Warning message");
    expect(mockLogger.error).toHaveBeenCalledWith(testData, "Error message");
    expect(mockLogger.debug).toHaveBeenCalledWith(testData, "Debug message");
  });

  it("handles logging with no bindings", async () => {
    const { log } = await import("./log");

    log.info(undefined, "No bindings message");

    expect(mockLogger.info).toHaveBeenCalledWith({}, "No bindings message");
  });

  it("configures correct app metadata", async () => {
    await import("./log");

    expect(pinoConfig.base).toEqual({
      app: "omnicrm",
      env: expect.any(String),
    });
  });
});
