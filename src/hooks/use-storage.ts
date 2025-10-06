import { useQuery, QueryKey } from "@tanstack/react-query";
import { get, buildUrl } from "@/lib/api";
import { type FileUrlResponse } from "@/server/db/business-schemas/storage";

export async function getFileUrl(filePath: string): Promise<FileUrlResponse> {
  try {
    const url = buildUrl("/api/storage/file-url", { filePath });
    return await get<FileUrlResponse>(url);
  } catch (error) {
    return {
      signedUrl: null,
      error: error instanceof Error ? error.message : "Failed to get file URL",
    };
  }
}

export function useFileUrl(
  filePath: string | null | undefined,
  options?: { enabled?: boolean; staleTime?: number },
): ReturnType<typeof useQuery<FileUrlResponse, Error, FileUrlResponse, QueryKey>> {
  // Only enable query if filePath is a non-empty string AND enabled option is true
  const enabled = Boolean(filePath && filePath.length > 0) && (options?.enabled ?? true);
  const key: QueryKey = ["storage", "file-url", filePath ?? ""];
  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!filePath) {
        return Promise.resolve({ signedUrl: null, error: "No file path provided" });
      }
      return getFileUrl(filePath);
    },
    enabled,
    staleTime: options?.staleTime ?? 55 * 60 * 1000, // default 55 minutes
  });
}
