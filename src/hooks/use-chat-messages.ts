import { useQuery } from "@tanstack/react-query";

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
    queryKey: ["chat", "messages", threadId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!threadId) return [];
      const res = await fetch(`/api/chat/threads/${threadId}/messages`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load messages: ${res.status} ${text}`);
      }
      const json: MessageResponse = (await res.json()) as MessageResponse;
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
