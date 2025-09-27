import { handleAuth } from "@/lib/api";
import { handlePublicGet } from "@/lib/api-edge-cases";
import {
  ReplayInputSchema,
  ReplayResponseSchema,
  type ReplayResponse
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  ReplayInputSchema,
  ReplayResponseSchema,
  async (_data, _userId): Promise<ReplayResponse> => {
    return {
      error: "Temporarily disabled for build fix",
      timestamp: new Date().toISOString(),
    };
  }
);

export const GET = handlePublicGet(
  ReplayResponseSchema,
  async (): Promise<ReplayResponse> => {
    return {
      error: "Temporarily disabled for build fix",
      timestamp: new Date().toISOString(),
    };
  }
);
