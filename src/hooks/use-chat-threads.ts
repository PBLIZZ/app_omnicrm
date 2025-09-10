import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ThreadsResponse {
  threads: ChatThread[];
}

export function useChatThreads(): {
  threads: ChatThread[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<{ data: ChatThread[] | undefined; error: Error | null }>;
} {
  const { data, isLoading, isFetching, isError, refetch } = useQuery<ChatThread[]>({
    queryKey: ["chat", "threads"],
    queryFn: async (): Promise<ChatThread[]> => {
      const json = await apiClient.get<ThreadsResponse>("/api/chat/threads");
      return json.threads ?? [];
    },
    staleTime: 30_000,
  });

  return {
    threads: data ?? [],
    isLoading,
    isFetching,
    isError,
    refetch: () =>
      refetch().then((result) => ({
        data: result.data,
        error: result.error,
      })),
  };
}
