import { AppError } from "@/lib/errors/app-error";

export interface TranscriptionInput {
  audioBlob: Blob;
  filename: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
}

const OPENAI_TRANSCRIPT_URL = "https://api.openai.com/v1/audio/transcriptions";

/**
 * Transcribe an audio blob using OpenAI Whisper API.
 * Minimal implementation to satisfy multipart/form-data test (1.5.1) and 1.5.3-1.5.5.
 */
export async function transcribeAudio(
  _userId: string,
  input: TranscriptionInput,
): Promise<TranscriptionResult> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new AppError("OpenAI API key not configured", "SERVICE_UNAVAILABLE", "system", true, { httpStatus: 503 });
  }

  const formData = new FormData();
  // File must be appended as a File object for boundary generation to include filename and type
  const file = new File([input.audioBlob], input.filename, { type: input.audioBlob.type });
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("language", input.language ?? "en");
  formData.append("response_format", "text");

  // Minimal retry with exponential backoff for transient network failures
  const maxAttempts = 2; // initial try + 1 retry
  const baseDelayMs = 300; // aligns with unit test expectations
  let attempt = 0;
  let response: Response | null = null;

  while (attempt < maxAttempts) {
    try {
      response = await fetch(OPENAI_TRANSCRIPT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Intentionally omit content-type so the runtime sets the multipart boundary
        },
        body: formData,
      });
      // Only retry on thrown network errors; HTTP errors are handled below
      break;
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw new AppError(
          "Failed to reach transcription service",
          "SERVICE_UNAVAILABLE",
          "system",
          false,
          error instanceof Error ? { cause: error, httpStatus: 503 } : { httpStatus: 503 },
        );
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }

  if (!response) {
    throw new AppError(
      "Failed to reach transcription service",
      "SERVICE_UNAVAILABLE",
      "system",
      false,
      { httpStatus: 503 },
    );
  }

  if (!response.ok) {
    const message = await safeReadText(response).catch(() => "");
    const status = response.status;
    const isClient = status >= 400 && status < 500;
    throw new AppError(
      message || `Transcription failed with status ${status}`,
      isClient ? "BAD_REQUEST" : "SERVICE_UNAVAILABLE",
      isClient ? "validation" : "system",
      isClient,
      { httpStatus: status },
    );
  }

  const text = await response.text();
  return { text };
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
