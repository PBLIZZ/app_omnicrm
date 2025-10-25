/**
 * Small helper to simulate/await transcription latency.
 * Extracted for easy mocking in unit tests.
 */
export async function waitForTranscription(): Promise<void> {
  // Default minimal delay; tests can mock this function
  await new Promise((resolve) => setTimeout(resolve, 250));
}
