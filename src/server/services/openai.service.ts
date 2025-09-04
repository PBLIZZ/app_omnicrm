export class OpenAIService {
  static async createEphemeralKey(): Promise<never> {
    if (!process.env['OPENAI_API_KEY']) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Note: ephemeralKeys is not available in the OpenAI SDK
    // This method needs to be implemented based on actual OpenAI API capabilities
    throw new Error("Ephemeral keys are not supported by the OpenAI SDK");
  }
}
