import { handleAuth } from "@/lib/api";
import { OAuthStartQuerySchema, GmailTestResponseSchema } from "@/server/db/business-schemas";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";
import { z } from "zod";

export const POST = handleAuth(
  OAuthStartQuerySchema,
  GmailTestResponseSchema,
  async (_data, userId): Promise<z.infer<typeof GmailTestResponseSchema>> => {
    try {
      // Test Gmail connection
      const isConnected = await GoogleGmailService.testConnection(userId);

      return {
        isConnected,
        message: isConnected ? "Gmail connection successful" : "Gmail connection failed",
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof GmailAuthError) {
        return {
          isConnected: false,
          message: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        };
      }
      throw error; // Re-throw to let handleAuth handle it
    }
  },
);
