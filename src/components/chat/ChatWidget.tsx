"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": getCsrf() || "",
        },
        credentials: "same-origin",
        body: JSON.stringify({ prompt: text }),
      });

      if (res.status === 403) {
        // First unsafe call may issue CSRF cookie; retry once
        await new Promise((r) => setTimeout(r, 50));
        const retry = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": getCsrf() || "",
          },
          credentials: "same-origin",
          body: JSON.stringify({ prompt: text }),
        });
        await handleResponse(retry);
      } else {
        await handleResponse(res);
      }
    } catch (e) {
      toast.error("Chat failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setIsTyping(false);
    }
  }

  async function handleResponse(res: Response) {
    if (res.status === 401) {
      toast.error("Please sign in to chat");
      return;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      toast.error("Chat error", { description: errText });
      return;
    }
    const data = (await res.json()) as { text?: string };
    const replyText = data?.text ?? "";
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: replyText,
        timestamp: Date.now(),
      },
    ]);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          aria-label="Open chat assistant"
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          ✨
        </Button>
      ) : (
        <Card className="w-96 h-[520px] p-0 overflow-hidden chat-interface-enter">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-medium">AI Assistant</div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>

          <CardContent className="p-0 h-full">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <div>{m.content}</div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:0.3s]" />
                    <span className="ml-2">AI is typing…</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t p-3">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Type a message"
                    placeholder="Type a message…"
                    className="flex-1 border rounded-md px-3 py-2 text-sm"
                  />
                  <Button onClick={sendMessage} disabled={!input.trim() || isTyping}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
