import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Note } from "@/server/db/schema";

interface UseNotesInfiniteOptions {
  contactId: string;
  pageSize?: number;
}

interface PaginatedNotesResponse {
  notes: Note[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useNotesInfinite({ contactId, pageSize = 10 }: UseNotesInfiniteOptions) {
  return useInfiniteQuery({
    queryKey: ["/api/notes/paginated", contactId, pageSize],
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedNotesResponse> => {
      const response = await apiClient.get<PaginatedNotesResponse>(
        `/api/notes/paginated?contactId=${contactId}&page=${pageParam}&pageSize=${pageSize}`,
      );
      return response;
    },
    getNextPageParam: (lastPage: PaginatedNotesResponse) => {
      return lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!contactId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 35 * 60 * 1000, // 35 minutes
  });
}
