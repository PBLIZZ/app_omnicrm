import { useQuery, QueryKey } from "@tanstack/react-query";

export interface GetFileUrlResponse {
  signedUrl: string | null;
  error?: string;
  details?: string;
}

// Define API error response type
interface ApiErrorResponse {
  error?: string;
  details?: string;
}

// Type guard for API error response
function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === "object" && payload !== null && ("error" in payload || "details" in payload)
  );
}

export async function getFileUrl(filePath: string): Promise<GetFileUrlResponse> {
  const url = new URL(
    "/api/storage/file-url",
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  url.searchParams.set("filePath", filePath);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const errorResponse = isApiErrorResponse(payload) ? payload : {};
    const result: GetFileUrlResponse = {
      signedUrl: null,
      error: errorResponse.error ?? `http_error_${res.status}`,
    };
    if (errorResponse.details) {
      result.details = errorResponse.details;
    }
    return result;
  }
  return (await res.json()) as GetFileUrlResponse;
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
  const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const res = await fetch(new URL("/api/storage/upload-url", base).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const errorResponse = isApiErrorResponse(payload) ? payload : {};
    const result: GetUploadUrlResponse = {
      signedUrl: null,
      path: args.folderPath ? `${args.folderPath}/${args.fileName}` : args.fileName,
      error: errorResponse.error ?? `http_error_${res.status}`,
    };
    if (errorResponse.details) {
      result.details = errorResponse.details;
    }
    return result;
  }
  return (await res.json()) as GetUploadUrlResponse;
}
