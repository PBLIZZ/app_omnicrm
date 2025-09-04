declare module '@openai/agents/realtime' {
  export class RealtimeAgent {
    constructor(options: {
      name?: string;
      instructions?: string;
      tools?: any[];
    });
  }

  export class RealtimeSession {
    constructor(agent?: RealtimeAgent);
    on(event: string, handler: (...args: any[]) => void): void;
    connect(options: { apiKey: string }): Promise<void>;
    disconnect(): void;
    audio: {
      player: { play: (chunk: any) => void };
      mic: { open(): Promise<void>; close(): Promise<void> };
    };
    text: { send(text: string): Promise<void> };
    send(message: any): Promise<void>;
  }
}
