import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted shared mocks/state for modules that need different behavior per-test
const { guardrailsSpy, mockProviderState } = vi.hoisted(() => {
  return {
    guardrailsSpy: vi.fn(async (_userId: string, fn: any) => {
      const r = await fn();
      return { data: r.data, creditsLeft: 7 };
    }),
    mockProviderState: {
      configured: false as boolean,
      config: { baseUrl: "", chatModel: "", embedModel: "", summaryModel: "" } as any,
      headers: {} as Record<string, string>,
    },
  };
});

vi.mock("@/server/providers/openrouter.provider", () => ({
  isOpenRouterConfigured: () => mockProviderState.configured,
  getOpenRouterConfig: () => mockProviderState.config,
  openRouterHeaders: () => mockProviderState.headers,
}));

describe("chatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // reset provider state
    mockProviderState.configured = false;
    mockProviderState.config = { baseUrl: "", chatModel: "", embedModel: "", summaryModel: "" };
    mockProviderState.headers = {};
  });

  afterEach(() => {
    // restore fetch between tests
    // @ts-expect-error allow delete for test
    delete globalThis.fetch;
  });

  it("short-circuits with fallback when OpenRouter is not configured", async () => {
    // Provider not configured (default from beforeEach)
    // Spy on fetch to ensure it is NOT called
    const fetchSpy = vi.fn();
    (globalThis as any).fetch = fetchSpy;

    const { chatService } = await import("./chat.service");

    const res = await chatService("user-1", "Hi");
    expect("error" in res).toBe(false);
    if ("error" in res) return; // type guard for TS

    expect(res.data.text).toMatch(/^AI is disabled/);
    expect(res.creditsLeft).toBe(-1);
    // Should not call fetch or guardrails in fallback mode
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(guardrailsSpy).not.toHaveBeenCalled();
  });

  it("calls OpenRouter via guardrails and returns model output using env-selected model", async () => {
    // Configure provider for this test
    mockProviderState.configured = true;
    mockProviderState.config = {
      baseUrl: "https://openrouter.ai/api/v1",
      chatModel: "my-model",
      embedModel: "embed-model",
      summaryModel: "sum-model",
    } as any;
    mockProviderState.headers = {
      Authorization: "Bearer test",
      "content-type": "application/json",
    };

    // Mock guardrails to ensure it's applied and returns creditsLeft
    vi.mock("@/server/ai/with-guardrails", () => ({ withGuardrails: guardrailsSpy }));

    // Mock fetch for OpenRouter
    const headers = new Headers({
      "x-usage-input-tokens": "10",
      "x-usage-output-tokens": "5",
      "x-usage-cost": "0.001",
    });
    globalThis.fetch = vi.fn(async (_url: string, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Hello from model" } }],
          model: "my-model",
        }),
        { status: 200, headers },
      );
    }) as unknown as typeof fetch;

    const { chatService } = await import("./chat.service");

    const res = await chatService("user-1", "What can you do?");
    expect("error" in res).toBe(false);
    if ("error" in res) return;

    expect(res.data.text).toBe("Hello from model");
    expect(res.creditsLeft).toBe(7);

    // Assert guardrails was used
    expect(guardrailsSpy).toHaveBeenCalledTimes(1);

    // Verify fetch was called with expected endpoint and payload
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((calledInit?.headers as Record<string, string>)?.["Authorization"]).toBe("Bearer test");
    const parsedBody = JSON.parse(String(calledInit?.body || "{}"));
    expect(parsedBody.model).toBe("my-model");
    expect(Array.isArray(parsedBody.messages)).toBe(true);
    expect(parsedBody.messages?.[1]?.content).toBe("What can you do?");
  });
});
