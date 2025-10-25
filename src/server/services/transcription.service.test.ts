import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";

// Service under test (will be implemented in 1.5.3-1.5.5)
import type { TranscriptionResult } from "./transcription.service";

// Node 18+ provides global Web APIs via undici; Vitest environment includes these.

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";

describe("transcription.service (1.5.1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env["OPENAI_API_KEY"] = "test-key";
  });

  it("sends multipart/form-data with file, model, language, and response_format", async () => {
    // Arrange: create a small WebM blob to simulate a voice recording
    const webmBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
    const audioBlob = new Blob([webmBytes], { type: "audio/webm" });

    // Capture the request passed to fetch
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          // Assert URL and method
          const url = typeof input === "string" ? input : input.toString();
          expect(url).toBe(OPENAI_URL);
          expect(init?.method ?? "POST").toBe("POST");

          // Assert headers (Authorization is required; content-type should be set by FormData boundary)
          const headers = new Headers(init?.headers);
          expect(headers.get("authorization")).toBe("Bearer test-key");
          expect(headers.get("content-type")).toBeNull();

          // Assert body is FormData with required fields
          const body = init?.body as unknown;
          expect(body).toBeInstanceOf(FormData);
          const formData = body as FormData;

          // Helper to read form entries
          const entries: Array<{ key: string; value: FormDataEntryValue }> = [];
          formData.forEach((value, key) => {
            entries.push({ key, value });
          });

          const getEntry = (key: string): FormDataEntryValue | undefined =>
            entries.find((e) => e.key === key)?.value;

          // model
          expect(getEntry("model")).toBe("whisper-1");
          // language
          expect(getEntry("language")).toBe("en");
          // response_format
          expect(getEntry("response_format")).toBe("text");

          // file
          const fileEntry = getEntry("file");
          expect(fileEntry).toBeInstanceOf(File);
          const file = fileEntry as File;
          expect(file.type).toBe("audio/webm");
          expect(file.name).toBe("recording.webm");
          expect(file.size).toBeGreaterThan(0);

          // Respond with a successful transcription as plain text
          return new Response("transcribed text", {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        },
      );

    // Act: import lazily to avoid module resolution errors before implementation exists
    // The import is typed to ensure future implementation matches expectations.
    const { transcribeAudio } = await import("./transcription.service");

    const result: TranscriptionResult = await transcribeAudio("user-123", {
      audioBlob,
      filename: "recording.webm",
      language: "en",
    });

    // Assert: service returns normalized result
    expect(result.text).toBe("transcribed text");
    expect(typeof result.durationSeconds === "number" || result.durationSeconds === undefined).toBe(
      true,
    );

    // Ensure fetch was called exactly once
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("mocks Whisper API and returns successful transcription text (1.5.2)", async () => {
    // Arrange
    const audioBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" });

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("hello world from whisper", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    // Act
    const { transcribeAudio } = await import("./transcription.service");
    const result = await transcribeAudio("user-1", {
      audioBlob,
      filename: "rec.webm",
      language: "en",
    });

    // Assert
    expect(result.text).toBe("hello world from whisper");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on network failure with exponential backoff (1.5.6)", async () => {
    vi.useFakeTimers();

    const audioBlob = new Blob([new Uint8Array([9, 9, 9])], { type: "audio/webm" });

    const fetchSpy = vi
      .spyOn(global, "fetch")
      // First attempt: network failure
      .mockRejectedValueOnce(new Error("network down"))
      // Second attempt: success
      .mockResolvedValueOnce(
        new Response("second attempt ok", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      );

    const { transcribeAudio } = await import("./transcription.service");

    const promise = transcribeAudio("user-xyz", {
      audioBlob,
      filename: "retry.webm",
      language: "en",
    });

    // Advance timers to allow backoff delay to elapse
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(300); // >= first backoff step

    const result = await promise;
    expect(result.text).toBe("second attempt ok");
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("returns BAD_REQUEST AppError on invalid audio format (1.5.8)", async () => {
    const audioBlob = new Blob([new Uint8Array([0])], { type: "audio/unsupported" });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Invalid audio format", {
        status: 400,
        headers: { "content-type": "text/plain" },
      }),
    );

    const { transcribeAudio } = await import("./transcription.service");

    await expect(
      transcribeAudio("user-a", { audioBlob, filename: "bad.weird", language: "en" }),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError & { status?: number; code?: string };
      expect(e.status).toBe(400);
      // Message propagated from service safe text
      expect(String(e.message)).toContain("Invalid audio format");
      return true;
    });
  });

  it("returns SERVICE_UNAVAILABLE AppError on upstream failure (1.5.9)", async () => {
    const audioBlob = new Blob([new Uint8Array([1, 2])], { type: "audio/webm" });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Upstream error", { status: 503, headers: { "content-type": "text/plain" } }),
    );

    const { transcribeAudio } = await import("./transcription.service");

    await expect(
      transcribeAudio("user-b", { audioBlob, filename: "clip.webm", language: "en" }),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError & { status?: number; code?: string };
      expect(e.status).toBe(503);
      expect(String(e.message)).toMatch(/Transcription failed|Upstream error/);
      return true;
    });
  });
});
