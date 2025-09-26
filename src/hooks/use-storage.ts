import { useQuery, QueryKey } from "@tanstack/react-query";
import { get, post, buildUrl } from "@/lib/api";

export interface GetFileUrlResponse {
  signedUrl: string | null;
  error?: string;
  details?: string;
}

export async function getFileUrl(filePath: string): Promise<GetFileUrlResponse> {
  try {
    const url = buildUrl("/api/storage/file-url", { filePath });
    return await get<GetFileUrlResponse>(url);
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
): ReturnType<typeof useQuery<GetFileUrlResponse, Error, GetFileUrlResponse, QueryKey>> {
  const enabled = Boolean(filePath) && (options?.enabled ?? true);
  const key: QueryKey = ["storage", "file-url", filePath ?? ""];
  return useQuery({
    queryKey: key,
    queryFn: () => getFileUrl(filePath as string),
    enabled,
    staleTime: options?.staleTime ?? 55 * 60 * 1000, // default 55 minutes
  });
}

export interface GetUploadUrlArgs {
  fileName: string;
  contentType: string;
  folderPath?: string;
  bucket?: string; // default "contacts"
}

export interface GetUploadUrlResponse {
  signedUrl: string | null;
  path: string;
  error?: string;
  details?: string;
}

export async function getUploadUrl(args: GetUploadUrlArgs): Promise<GetUploadUrlResponse> {
  try {
    return await post<GetUploadUrlResponse>("/api/storage/upload-url", args);
  } catch (error) {
    return {
      signedUrl: null,
      path: args.folderPath ? `${args.folderPath}/${args.fileName}` : args.fileName,
      error: error instanceof Error ? error.message : "Failed to get upload URL",
    };
  }
}
