"use client";

import { useState, useEffect, useRef } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { Sparkles, Send, Mic, MicOff } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

type ChatMessage = {
  type: "user" | "bot" | "tool";
  message: string;
  isFinal?: boolean;
  toolName?: string;
};

// Type definitions for OpenAI Realtime API
interface TranscriptionEvent {
  text: string;
  isFinal: boolean;
}

interface AudioChunk {
  data?: Uint8Array | ArrayBuffer;
  format?: string;
  sampleRate?: number;
}

// API response types
interface EphemeralKeyResponse {
  secret: string;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Type guards for API responses
function isEphemeralKeyResponse(obj: unknown): obj is EphemeralKeyResponse {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "secret" in obj &&
    typeof (obj as Record<string, unknown>)["secret"] === "string"
  );
}

function isToolResult(obj: unknown): obj is ToolResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "success" in obj &&
    typeof (obj as Record<string, unknown>)["success"] === "boolean"
  );
}

interface ToolInvocation {
  toolName: string;
  toolArgs: Record<string, unknown>;
}

interface ConversationError {
  message: string;
}

interface RealtimeSessionEvents {
  "audio.transcribed": (event: TranscriptionEvent) => void;
  "text.transcribed": (event: TranscriptionEvent) => void;
  "audio.output.chunk.received": (chunk: AudioChunk) => void;
  "tool.invoked": (invocation: ToolInvocation) => Promise<void>;
  "conversation.item.error": (error: ConversationError) => void;
}

interface MockRealtimeSession {
  on<K extends keyof RealtimeSessionEvents>(event: K, handler: RealtimeSessionEvents[K]): void;
  connect(options: { apiKey: string }): Promise<void>;
  disconnect(): void;
  audio: {
    player: {
      play(chunk: AudioChunk | Uint8Array): void;
    };
    mic: {
      open(): Promise<void>;
      close(): Promise<void>;
    };
  };
  text: {
    send(text: string): Promise<void>;
  };
  send(message: { type: string; toolName: string; result: string }): Promise<void>;
}

export function OmniBot(): JSX.Element {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const agentRef = useRef<RealtimeAgent | null>(null);

  // Initialize the agent and session
  useEffect(() => {
    // Define the tools for the agent
    const getContactsSummaryTool = {
      name: "get_contacts_summary",
      description:
        "Retrieves a summary of the user's CRM contacts, including total count, how many have emails/phones, and a list of the 5 most recently added contacts.",
      parameters: { type: "object" as const, properties: {} },
    };

    const searchContactsTool = {
      name: "search_contacts",
      description: "Searches for contacts by name, email, or phone number.",
      parameters: {
        type: "object" as const,
        properties: {
          query: {
            type: "string" as const,
            description: "The name, email, or phone number to search for.",
          },
        },
        required: ["query"],
      },
    };

    agentRef.current = new RealtimeAgent({
      name: "OmniCRM Assistant",
      instructions:
        "You are a helpful CRM assistant for wellness professionals. You can access the user's CRM data to answer questions about their contacts. Keep your responses concise and conversational.",
      tools: [getContactsSummaryTool, searchContactsTool],
    });

    const initializeSession = async (): Promise<void> => {
      try {
        const response = await fetch("/api/chat/openai-token", { method: "POST" });
        if (!response.ok) {
          throw new Error("Failed to fetch ephemeral key");
        }
        const ephemeralKeyData: unknown = await response.json();
        if (!isEphemeralKeyResponse(ephemeralKeyData)) {
          throw new Error("Invalid ephemeral key response format");
        }
        const ephemeralKey = ephemeralKeyData;

        const session = new RealtimeSession(agentRef.current!) as MockRealtimeSession;
        sessionRef.current = session;

        session.on("audio.transcribed", ({ text, isFinal }: TranscriptionEvent) => {
          setChatHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "user" && !last.isFinal) {
              const updated = [...prev];
              updated[prev.length - 1] = { ...last, message: text, isFinal };
              return updated;
            }
            return [...prev, { type: "user", message: text, isFinal }];
          });
        });

        session.on("text.transcribed", ({ text, isFinal }: TranscriptionEvent) => {
          setChatHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "bot" && !last.isFinal) {
              const updated = [...prev];
              updated[prev.length - 1] = { ...last, message: text, isFinal };
              return updated;
            }
            return [...prev, { type: "bot", message: text, isFinal }];
          });
        });

        session.on("audio.output.chunk.received", (chunk: AudioChunk) => {
          session.audio.player.play(chunk);
        });

        session.on("tool.invoked", async (toolInvocation: ToolInvocation) => {
          const { toolName, toolArgs } = toolInvocation;
          setChatHistory((prev) => [
            ...prev,
            { type: "tool", message: `Calling tool: ${toolName}...`, toolName, isFinal: false },
          ]);

          try {
            const response = await fetch("/api/chat/tools", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolName, toolArgs }),
            });

            if (!response.ok) {
              throw new Error(`Tool ${toolName} failed.`);
            }

            const resultData: unknown = await response.json();
            if (!isToolResult(resultData)) {
              throw new Error("Invalid tool result response format");
            }
            const result = resultData;

            setChatHistory((prev) => {
              const last = prev[prev.length - 1];
              if (last?.type === "tool" && last.toolName === toolName) {
                const updated = [...prev];
                updated[prev.length - 1] = {
                  ...last,
                  message: `Tool ${toolName} returned.`,
                  isFinal: true,
                };
                return updated;
              }
              return prev;
            });

            await session.send({
              type: "tool.result",
              toolName,
              result: JSON.stringify(result),
            });
          } catch (error) {
            logger.userError("Tool invocation failed", ensureError(error), {
              operation: "omni_bot.tool_invocation",
              additionalData: { toolName },
            });
            await session.send({
              type: "tool.result",
              toolName,
              result: `Error: ${(error as Error).message}`,
            });
          }
        });

        session.on("conversation.item.error", (error: ConversationError) => {
          logger.userError("Conversation error", new Error(error.message), {
            operation: "omni_bot.conversation",
            additionalData: { errorMessage: error.message },
          });
          setChatHistory((prev) => [
            ...prev,
            { type: "bot", message: `Error: ${error.message}`, isFinal: true },
          ]);
        });

        await session.connect({ apiKey: ephemeralKey.secret });
      } catch (error) {
        logger.userError("Failed to connect to assistant", ensureError(error), {
          operation: "omni_bot.session_init",
        });
        setChatHistory((prev) => [
          ...prev,
          { type: "bot", message: "Error connecting to assistant.", isFinal: true },
        ]);
      }
    };

    initializeSession().catch((error) => {
      logger.userError("Failed to initialize session", ensureError(error), {
        operation: "omni_bot.session_init_error",
      });
    });

    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  const handleMicToggle = async (): Promise<void> => {
    if (!sessionRef.current) return;

    if (isRecording) {
      await sessionRef.current.audio.mic.close();
      setIsRecording(false);
    } else {
      await sessionRef.current.audio.mic.open();
      setIsRecording(true);
    }
  };

  const handleSendText = async (): Promise<void> => {
    if (!sessionRef.current || !inputValue.trim()) return;

    setChatHistory((prev) => [...prev, { type: "user", message: inputValue, isFinal: true }]);
    await sessionRef.current.text.send(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-1">
        {chatHistory.length > 0 ? (
          <div className="space-y-4">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  msg.type === "user" ? "justify-end" : "justify-start",
                  msg.type === "tool" && "justify-center",
                )}
              >
                {msg.type === "tool" ? (
                  <div className="text-xs text-muted-foreground italic p-2 bg-muted rounded-lg">
                    {msg.message}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl p-3",
                      msg.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border border-border rounded-bl-none",
                      !msg.isFinal && "opacity-70",
                    )}
                  >
                    {msg.type === "bot" && (
                      <div className="flex items-center mb-1">
                        <Sparkles className="h-3 w-3 text-primary mr-1" />
                        <span className="text-xs font-medium text-primary">OmniBot</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center">
            <Sparkles className="h-10 w-10 text-primary/30 mx-auto mb-2" />
            <p className="text-muted-foreground">
              Press the mic to start speaking or type a message.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 mt-auto">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type your question..."
            className="flex-1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSendText()}
          />
          <Button onClick={() => void handleSendText()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => void handleMicToggle()}
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
