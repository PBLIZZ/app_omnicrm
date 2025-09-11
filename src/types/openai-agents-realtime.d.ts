declare module "@openai/agents/realtime" {
  // Tool interface for realtime agents
  interface RealtimeTool {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    handler?: (args: Record<string, unknown>) => unknown;
  }

  // Audio chunk interface
  interface AudioChunk {
    data: ArrayBuffer | Uint8Array;
    format?: string;
    sampleRate?: number;
  }

  // Message interface for realtime communication
  interface RealtimeMessage {
    type: string;
    content?: string;
    data?: Record<string, unknown>;
    timestamp?: number;
  }

  export class RealtimeAgent {
    constructor(options: { name?: string; instructions?: string; tools?: RealtimeTool[] });
  }

  export class RealtimeSession {
    constructor(agent?: RealtimeAgent);
    on(event: string, handler: (...args: unknown[]) => void): void;
    connect(options: { apiKey: string }): Promise<void>;
    disconnect(): void;
    audio: {
      player: { play: (chunk: AudioChunk) => void };
      mic: { open(): Promise<void>; close(): Promise<void> };
    };
    text: { send(text: string): Promise<void> };
    send(message: RealtimeMessage): Promise<void>;
  }
}
