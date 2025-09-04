import { useQuery } from "@tanstack/react-query";

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
      const res = await fetch("/api/chat/threads");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load threads: ${res.status} ${text}`);
      }
      const json: ThreadsResponse = (await res.json()) as ThreadsResponse;
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
