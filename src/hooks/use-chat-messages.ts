import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // keep raw string for transport; UI can convert to Date
}

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: { text?: string } | string;
  createdAt: string;
}

interface MessageResponse {
  messages: ApiMessage[];
}

function mapMessages(resp: MessageResponse): ChatMessage[] {
  const msgs = resp.messages ?? [];
  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    content: typeof m.content === "string" ? m.content : (m.content?.text ?? ""),
    createdAt: m.createdAt,
  }));
}

export function useChatMessages(threadId: string | null): {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<{ data: ChatMessage[] | undefined; error: Error | null }>;
} {
  const { data, isLoading, isFetching, isError, refetch } = useQuery<ChatMessage[]>({
    queryKey: queryKeys.chat.messages(threadId ?? 'none'),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!threadId) return [];
      const json = await apiClient.get<MessageResponse>(`/api/chat/threads/${threadId}/messages`);
      return mapMessages(json);
    },
    enabled: !!threadId,
    staleTime: 15_000,
  });

  return {
    messages: data ?? [],
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
