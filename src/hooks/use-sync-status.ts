import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { type GoogleStatusResponseSchema } from "@/server/db/business-schemas/google-prefs";
import type { z } from "zod";

type GoogleStatusResponse = z.infer<typeof GoogleStatusResponseSchema>;

/**
 * Hook to fetch Google sync status
 * GET /api/google/status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: queryKeys.google.status(),
    queryFn: async (): Promise<GoogleStatusResponse> => {
      return apiClient.get<GoogleStatusResponse>(
        "/api/google/status?includeJobDetails=false&includeFreshness=true",
      );
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });
}
