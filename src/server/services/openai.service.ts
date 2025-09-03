import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  static async createEphemeralKey() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const ephemeralKey = await openai.ephemeralKeys.create(
      { expires_in: 600 }, // 10 minutes
      { apiVersion: "2024-05-24" },
    );

    return ephemeralKey;
  }
}
