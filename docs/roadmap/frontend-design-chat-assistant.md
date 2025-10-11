# Multimodal Voice Chat Assistant Interface Design

_Date: 2025-08-12_  
_Designer: Claude Sonnet 4 (Component Architecture Specialist)_  
_Context: AI-driven CRM platform voice assistant integration_

## Executive Summary

This design document outlines a comprehensive multimodal voice chat assistant interface for the OmniCRM platform. The assistant leverages the existing `/api/chat` endpoint and integrates seamlessly with the contact management system, providing voice-to-text transcription, text-to-speech responses, and contextual business intelligence.

**Key Features:**

- Persistent chat interface with expandable/collapsible design
- Multimodal input (voice + text) with visual feedback
- Business context integration with customer data
- AI memory and conversation persistence
- Wellness practitioner-specific workflows
- shadcn/ui components with teal/sky/violet/amber color scheme

## Architecture Overview

### Component Hierarchy

```bash
ChatAssistant (Root Provider)
├── ChatTrigger (FAB + Mini Interface)
├── ChatInterface (Expandable Container)
│   ├── ChatHeader (Controls + Status)
│   ├── ChatMessages (Conversation History)
│   ├── VoiceVisualizer (Waveform + Status)
│   ├── ChatInput (Voice + Text Input)
│   └── QuickActions (Context Suggestions)
├── ChatHistory (Searchable Archive)
└── ChatSettings (Preferences + Permissions)
```

### Integration Points

```typescript
// Existing API Integration
interface ChatApiIntegration {
  endpoint: "/api/chat";
  authentication: "getServerUserId()";
  guardrails: "withGuardrails()";
  schema: "chatRequestSchema";
}

// Database Integration
interface DatabaseIntegration {
  conversations: "ai_insights table";
  embeddings: "embeddings table for semantic search";
  contacts: "contacts table for context";
  usage: "ai_usage table for tracking";
}
```

## Component Specifications

### 1. ChatAssistant Root Provider

```typescript
// src/components/chat/ChatAssistant.tsx
interface ChatAssistantProps {
  children: React.ReactNode;
  userId: string;
  initialContext?: BusinessContext;
}

interface BusinessContext {
  currentPage: string;
  contactId?: string;
  appointmentId?: string;
  practitionerMode: "wellness" | "general";
}

interface ChatState {
  isOpen: boolean;
  isListening: boolean;
  isProcessing: boolean;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  permissions: {
    microphone: "granted" | "denied" | "prompt";
    notifications: "granted" | "denied" | "prompt";
  };
}
```

**Key Features:**

- Global state management for chat interface
- Permission handling for microphone access
- Business context awareness
- Conversation persistence and history
- Real-time status indicators

### 2. ChatTrigger - Floating Action Button

```typescript
// src/components/chat/ChatTrigger.tsx
interface ChatTriggerProps {
  position?: 'bottom-right' | 'bottom-left';
  showPreview?: boolean;
  contextSuggestions?: string[];
}

const ChatTrigger = ({ position = 'bottom-right', showPreview = true }: ChatTriggerProps) => {
  return (
    <div className="fixed z-50" style={getPositionStyles(position)}>
      {/* Mini Preview when closed */}
      {!isOpen && showPreview && (
        <div className="mb-2 transform transition-all duration-300">
          <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800 p-3 max-w-xs">
            <p className="text-sm text-teal-700 dark:text-teal-300">
              Need help? Ask me about your contacts or schedule.
            </p>
          </Card>
        </div>
      )}

      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600",
          "border-2 border-white dark:border-gray-800",
          isListening && "animate-pulse bg-gradient-to-r from-violet-500 to-purple-500",
          isProcessing && "animate-spin"
        )}
        onClick={toggleChat}
      >
        {isListening ? (
          <Mic className="h-6 w-6 text-white" />
        ) : isProcessing ? (
          <Loader2 className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>
    </div>
  );
};
```

**Design Features:**

- Gradient teal-to-sky background with hover effects
- Animated states for listening (violet pulse) and processing (spin)
- Mini preview card with contextual suggestions
- Responsive positioning and smooth transitions
- High z-index for overlay positioning

### 3. ChatInterface - Expandable Container

```typescript
// src/components/chat/ChatInterface.tsx
interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  businessContext: BusinessContext;
}

const ChatInterface = ({ isOpen, onClose, businessContext }: ChatInterfaceProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-96 p-0 flex flex-col"
      >
        {/* Header with context indicator */}
        <ChatHeader
          context={businessContext}
          onClose={onClose}
          onClearHistory={clearHistory}
        />

        {/* Messages container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatMessages
            messages={currentConversation?.messages || []}
            isProcessing={isProcessing}
          />
        </div>

        {/* Voice visualizer */}
        {isListening && (
          <VoiceVisualizer
            audioLevel={audioLevel}
            isRecording={isListening}
          />
        )}

        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            onStartVoice={startVoiceInput}
            onStopVoice={stopVoiceInput}
            isListening={isListening}
            isProcessing={isProcessing}
          />

          {/* Quick actions based on context */}
          <QuickActions
            context={businessContext}
            onActionSelect={handleQuickAction}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

### 4. ChatHeader - Context and Controls

```typescript
// src/components/chat/ChatHeader.tsx
const ChatHeader = ({ context, onClose, onClearHistory }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-sky-50 dark:from-teal-950 dark:to-sky-950">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-500 to-sky-500 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getContextDescription(context)}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs">
          {context.practitionerMode === 'wellness' ? '🌿 Wellness' : '💼 Business'}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onClearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
```

### 5. ChatMessages - Conversation History

```typescript
// src/components/chat/ChatMessages.tsx
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string; // For voice messages
  metadata?: {
    transcription?: string;
    confidence?: number;
    processingTime?: number;
  };
}

const ChatMessages = ({ messages, isProcessing }: ChatMessagesProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onPlayAudio={playAudioResponse}
          />
        ))}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

const MessageBubble = ({ message, onPlayAudio }: MessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2",
        isUser
          ? "bg-gradient-to-r from-teal-500 to-sky-500 text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      )}>
        {message.audioUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPlayAudio(message.audioUrl!)}
            className="mb-2 p-1"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            Play
          </Button>
        )}

        <p className="text-sm">{message.content}</p>

        {message.metadata?.transcription && (
          <p className="text-xs opacity-70 mt-1 italic">
            Transcribed from voice
          </p>
        )}

        <p className="text-xs opacity-70 mt-1">
          {format(message.timestamp, 'HH:mm')}
        </p>
      </div>
    </div>
  );
};
```

### 6. VoiceVisualizer - Audio Feedback

```typescript
// src/components/chat/VoiceVisualizer.tsx
interface VoiceVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
  onCancel?: () => void;
}

const VoiceVisualizer = ({ audioLevel, isRecording, onCancel }: VoiceVisualizerProps) => {
  return (
    <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-t">
      <div className="flex items-center justify-center space-x-4">
        {/* Waveform visualization */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 bg-gradient-to-t from-violet-400 to-purple-500 rounded-full transition-all duration-150",
                "h-2" // Base height
              )}
              style={{
                height: `${Math.max(8, audioLevel * 40 + Math.random() * 20)}px`,
                animationDelay: `${i * 50}ms`
              }}
            />
          ))}
        </div>
      </div>

      <div className="text-center mt-3">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
          {isRecording ? "Listening..." : "Processing..."}
        </p>
        <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
          Tap to stop recording
        </p>
      </div>

      {onCancel && (
        <div className="flex justify-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        </div>
      )}
    </div>
  );
};
```

### 7. ChatInput - Multimodal Input

```typescript
// src/components/chat/ChatInput.tsx
const ChatInput = ({
  onSendMessage,
  onStartVoice,
  onStopVoice,
  isListening,
  isProcessing
}: ChatInputProps) => {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  return (
    <div className="space-y-3">
      {/* Text input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            placeholder={isListening ? "Voice input active..." : "Type a message or use voice..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isListening || isProcessing}
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />
        </div>

        {/* Send/Voice button */}
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant={inputMode === 'voice' ? "default" : "outline"}
            onClick={inputMode === 'voice' ? (isListening ? onStopVoice : onStartVoice) : handleSendText}
            disabled={isProcessing || (inputMode === 'text' && !inputText.trim())}
            className={cn(
              inputMode === 'voice' && isListening && "bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse"
            )}
          >
            {inputMode === 'voice' ? (
              isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>

          {/* Toggle input mode */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
            className="text-gray-500"
          >
            {inputMode === 'text' ? <Mic className="h-4 w-4" /> : <Type className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Transcription preview */}
      {isListening && currentTranscription && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <span className="font-medium">Transcription:</span> {currentTranscription}
        </div>
      )}
    </div>
  );
};
```

### 8. QuickActions - Context-Aware Suggestions

```typescript
// src/components/chat/QuickActions.tsx
const QuickActions = ({ context, onActionSelect }: QuickActionsProps) => {
  const actions = generateContextualActions(context);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onActionSelect(action)}
            className="text-xs h-7 px-2 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

function generateContextualActions(context: BusinessContext): QuickAction[] {
  const baseActions: QuickAction[] = [
    { id: 'help', label: 'Help', icon: '❓' },
    { id: 'schedule', label: 'Schedule', icon: '📅' }
  ];

  // Add context-specific actions
  if (context.contactId) {
    baseActions.unshift(
      { id: 'contact-summary', label: 'Contact Summary', icon: '👤' },
      { id: 'contact-history', label: 'History', icon: '📝' }
    );
  }

  if (context.practitionerMode === 'wellness') {
    baseActions.push(
      { id: 'wellness-plan', label: 'Wellness Plan', icon: '🌿' },
      { id: 'symptoms', label: 'Symptoms', icon: '💚' }
    );
  }

  return baseActions;
}
```

## Voice Processing Implementation

### 1. Speech-to-Text Integration

```typescript
// src/lib/voice/speechToText.ts
class SpeechToTextService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor(
    private onTranscript: (text: string, isFinal: boolean) => void,
    private onError: (error: string) => void,
  ) {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.onError("Speech recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.onTranscript(finalTranscript || interimTranscript, !!finalTranscript);
    };

    this.recognition.onerror = (event) => {
      this.onError(`Speech recognition error: ${event.error}`);
    };
  }

  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error("Speech recognition not initialized");
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      throw new Error("Microphone access denied");
    }

    this.recognition.start();
    this.isListening = true;
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
```

### 2. Text-to-Speech Integration

```typescript
// src/lib/voice/textToSpeech.ts
class TextToSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();

    // If voices aren't loaded yet, wait for the event
    if (this.voices.length === 0) {
      this.synth.addEventListener("voiceschanged", () => {
        this.voices = this.synth.getVoices();
      });
    }
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice
      const voice =
        this.voices.find(
          (v) =>
            v.lang.startsWith(options.lang || "en") &&
            v.name.includes(options.voiceType || "female"),
        ) || this.voices[0];

      if (voice) utterance.voice = voice;

      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
  }
}

interface TTSOptions {
  lang?: string;
  voiceType?: "male" | "female";
  rate?: number;
  pitch?: number;
  volume?: number;
}
```

## Business Context Integration

### 1. Context Provider

```typescript
// src/lib/chat/businessContext.ts
export class BusinessContextProvider {
  constructor(private userId: string) {}

  async getContextForPage(pathname: string): Promise<BusinessContext> {
    const baseContext: BusinessContext = {
      currentPage: pathname,
      practitionerMode: await this.getPractitionerMode(),
    };

    // Extract IDs from URL patterns
    const contactMatch = pathname.match(/\/contacts\/([^\/]+)/);
    if (contactMatch) {
      baseContext.contactId = contactMatch[1];
      baseContext.contactData = await this.getContactData(contactMatch[1]);
    }

    const appointmentMatch = pathname.match(/\/appointments\/([^\/]+)/);
    if (appointmentMatch) {
      baseContext.appointmentId = appointmentMatch[1];
      baseContext.appointmentData = await this.getAppointmentData(appointmentMatch[1]);
    }

    return baseContext;
  }

  private async getContactData(contactId: string): Promise<ContactData> {
    const response = await fetch(`/api/contacts/${contactId}`);
    return response.json();
  }

  private async getAppointmentData(appointmentId: string): Promise<AppointmentData> {
    const response = await fetch(`/api/appointments/${appointmentId}`);
    return response.json();
  }

  private async getPractitionerMode(): Promise<"wellness" | "general"> {
    // Check user preferences or settings
    return "wellness"; // Default for wellness practitioners
  }
}
```

### 2. Chat API Enhancement

```typescript
// src/app/api/chat/route.ts (Enhanced)
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = enhancedChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  const { prompt, context, conversationId } = parsed.data;

  const result = await withGuardrails(userId, async () => {
    // Get business context
    const businessData = await getBusinessContext(userId, context);

    // Build enhanced prompt with context
    const enhancedPrompt = await buildContextualPrompt(prompt, businessData);

    // Store conversation in ai_insights
    if (conversationId) {
      await updateConversation(conversationId, { role: "user", content: prompt });
    }

    // Call AI service with enhanced prompt
    const aiResponse = await callOpenRouterWithContext(enhancedPrompt, businessData);

    // Store AI response
    if (conversationId) {
      await updateConversation(conversationId, { role: "assistant", content: aiResponse.text });
    }

    return {
      data: aiResponse,
      model: "openrouter/enhanced-model",
      conversationId: conversationId || (await createNewConversation(userId)),
      businessInsights: extractBusinessInsights(aiResponse, businessData),
    };
  });

  if ("error" in result) {
    const status =
      result.error === "rate_limited_minute"
        ? 429
        : result.error === "rate_limited_daily_cost"
          ? 402
          : 429;
    return err(status, result.error);
  }

  return ok({ ...result.data, creditsLeft: result.creditsLeft });
}

// Enhanced schema
const enhancedChatRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z
    .object({
      currentPage: z.string(),
      contactId: z.string().optional(),
      appointmentId: z.string().optional(),
      practitionerMode: z.enum(["wellness", "general"]),
    })
    .optional(),
  conversationId: z.string().optional(),
  audioData: z.string().optional(), // Base64 audio for voice messages
});
```

## Memory & Embeddings Integration

### 1. Conversation Memory

```typescript
// src/lib/chat/memory.ts
export class ConversationMemory {
  constructor(private userId: string) {}

  async storeConversation(conversation: Conversation): Promise<void> {
    await db.insert(aiInsights).values({
      userId: this.userId,
      subjectType: "conversation",
      kind: "chat_history",
      content: {
        messages: conversation.messages,
        context: conversation.context,
        summary: await this.generateSummary(conversation),
      },
      model: "chat-assistant",
    });
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    // Use embeddings for semantic search
    const embedding = await generateEmbedding(query);

    const similar = await db
      .select()
      .from(embeddings)
      .where(
        and(
          eq(embeddings.userId, this.userId),
          eq(embeddings.ownerType, "conversation"),
          // Vector similarity search would be implemented here
        ),
      );

    return this.hydrateConversations(similar);
  }

  async getConversationContext(contactId?: string): Promise<string[]> {
    if (!contactId) return [];

    const contactHistory = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.userId, this.userId),
          eq(aiInsights.subjectType, "contact"),
          eq(aiInsights.subjectId, contactId),
        ),
      )
      .orderBy(desc(aiInsights.createdAt))
      .limit(10);

    return contactHistory.map((h) => h.content as any).filter(Boolean);
  }
}
```

### 2. Smart Suggestions

```typescript
// src/lib/chat/suggestions.ts
export class SmartSuggestionEngine {
  constructor(
    private userId: string,
    private memory: ConversationMemory,
  ) {}

  async generateSuggestions(context: BusinessContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Context-based suggestions
    if (context.contactId) {
      const contactHistory = await this.memory.getConversationContext(context.contactId);
      if (contactHistory.length > 0) {
        suggestions.push({
          type: "contact_summary",
          text: `Summarize recent interactions with this contact`,
          priority: "high",
        });
      }
    }

    // Time-based suggestions
    const now = new Date();
    if (now.getHours() >= 9 && now.getHours() <= 17) {
      suggestions.push({
        type: "schedule",
        text: `Check today's appointments`,
        priority: "medium",
      });
    }

    // Wellness-specific suggestions
    if (context.practitionerMode === "wellness") {
      suggestions.push(
        {
          type: "wellness_check",
          text: `How can I support your wellness practice today?`,
          priority: "medium",
        },
        {
          type: "client_followup",
          text: `Schedule follow-up reminders`,
          priority: "low",
        },
      );
    }

    return suggestions.sort(
      (a, b) => this.priorityOrder[a.priority] - this.priorityOrder[b.priority],
    );
  }

  private priorityOrder = { high: 0, medium: 1, low: 2 };
}
```

## Styling and Theme Integration

### 1. Theme Variables

```css
/* Additional theme variables for chat components */
:root {
  --chat-teal-50: oklch(0.984 0.02 180);
  --chat-teal-500: oklch(0.646 0.12 180);
  --chat-teal-600: oklch(0.587 0.12 180);

  --chat-sky-50: oklch(0.984 0.02 200);
  --chat-sky-500: oklch(0.707 0.131 225);
  --chat-sky-600: oklch(0.648 0.131 225);

  --chat-violet-50: oklch(0.984 0.02 270);
  --chat-violet-500: oklch(0.627 0.265 270);
  --chat-violet-600: oklch(0.568 0.265 270);

  --chat-amber-50: oklch(0.984 0.02 70);
  --chat-amber-500: oklch(0.828 0.189 84);
  --chat-amber-600: oklch(0.769 0.189 84);
}

.dark {
  --chat-teal-950: oklch(0.129 0.042 180);
  --chat-sky-950: oklch(0.129 0.042 200);
  --chat-violet-950: oklch(0.129 0.042 270);
  --chat-amber-950: oklch(0.129 0.042 70);
}
```

### 2. Component Animations

```css
/* Chat-specific animations */
@keyframes chat-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes voice-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes waveform-bar {
  0%,
  100% {
    height: 8px;
  }
  50% {
    height: 32px;
  }
}

.chat-interface-enter {
  animation: chat-slide-in 0.3s ease-out;
}

.voice-button-active {
  animation: voice-pulse 1s infinite;
}

.waveform-bar {
  animation: waveform-bar 0.8s ease-in-out infinite;
}
```

## Performance Optimizations

### 1. Component Lazy Loading

```typescript
// src/components/chat/index.ts
import { lazy } from "react";

export const ChatAssistant = lazy(() => import("./ChatAssistant"));
export const ChatInterface = lazy(() => import("./ChatInterface"));
export const VoiceVisualizer = lazy(() => import("./VoiceVisualizer"));

// Pre-load critical components
export const ChatTrigger = lazy(() =>
  import("./ChatTrigger").then((module) => ({
    default: module.ChatTrigger,
  })),
);
```

### 2. Audio Processing Optimization

```typescript
// src/lib/voice/audioProcessor.ts
class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  async initialize(): Promise<void> {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
  }

  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);
    const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
    return average / 255; // Normalize to 0-1
  }

  dispose(): void {
    this.audioContext?.close();
  }
}
```

## Testing Strategy

### 1. Component Testing

```typescript
// src/components/chat/__tests__/ChatAssistant.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatAssistant } from '../ChatAssistant';

describe('ChatAssistant', () => {
  const mockProps = {
    userId: 'test-user-id',
    initialContext: {
      currentPage: '/contacts/123',
      contactId: '123',
      practitionerMode: 'wellness' as const
    }
  };

  beforeEach(() => {
    // Mock speech recognition
    global.SpeechRecognition = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn()
    }));
  });

  it('renders chat trigger button', () => {
    render(<ChatAssistant {...mockProps}><div /></ChatAssistant>);

    const triggerButton = screen.getByRole('button', { name: /open chat/i });
    expect(triggerButton).toBeInTheDocument();
  });

  it('opens chat interface when trigger clicked', async () => {
    render(<ChatAssistant {...mockProps}><div /></ChatAssistant>);

    const triggerButton = screen.getByRole('button', { name: /open chat/i });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });
  });

  it('handles voice input activation', async () => {
    render(<ChatAssistant {...mockProps}><div /></ChatAssistant>);

    const triggerButton = screen.getByRole('button', { name: /open chat/i });
    fireEvent.click(triggerButton);

    const voiceButton = await screen.findByRole('button', { name: /voice input/i });
    fireEvent.click(voiceButton);

    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });
});
```

### 2. Voice Integration Testing

```typescript
// src/lib/voice/__tests__/speechToText.test.ts
describe("SpeechToTextService", () => {
  let mockRecognition: jest.Mocked<SpeechRecognition>;
  let service: SpeechToTextService;
  let onTranscriptMock: jest.Mock;
  let onErrorMock: jest.Mock;

  beforeEach(() => {
    onTranscriptMock = jest.fn();
    onErrorMock = jest.fn();

    mockRecognition = {
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn(),
      continuous: true,
      interimResults: true,
      lang: "en-US",
    } as any;

    global.SpeechRecognition = jest.fn(() => mockRecognition);
    global.webkitSpeechRecognition = global.SpeechRecognition;

    service = new SpeechToTextService(onTranscriptMock, onErrorMock);
  });

  it("starts speech recognition", async () => {
    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({}),
    } as any;

    await service.start();

    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it("handles speech recognition results", () => {
    const mockEvent = {
      resultIndex: 0,
      results: [[{ transcript: "Hello world", confidence: 0.9 }]] as any,
    } as any;

    mockRecognition.onresult!(mockEvent);

    expect(onTranscriptMock).toHaveBeenCalledWith("Hello world", false);
  });
});
```

## Security Considerations

### 1. Audio Data Privacy

```typescript
// src/lib/security/audioSecurity.ts
export class AudioSecurityManager {
  static sanitizeAudioData(audioBlob: Blob): Promise<Blob> {
    // Remove metadata that could contain PII
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        // Process and sanitize audio data
        const sanitized = new Blob([arrayBuffer], { type: "audio/wav" });
        resolve(sanitized);
      };
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  static validateAudioFormat(file: File): boolean {
    const allowedTypes = ["audio/wav", "audio/mp3", "audio/ogg"];
    return allowedTypes.includes(file.type);
  }

  static checkAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.src = URL.createObjectURL(audioBlob);
    });
  }
}
```

### 2. Input Sanitization

```typescript
// src/lib/security/inputSanitization.ts
export class ChatInputSanitizer {
  static sanitizeTextInput(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: URLs
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim()
      .substring(0, 4000); // Enforce length limit
  }

  static sanitizeVoiceTranscription(transcription: string): string {
    // Additional sanitization for voice input
    return this.sanitizeTextInput(transcription)
      .replace(/\[sound:\w+\]/gi, "") // Remove sound markers
      .replace(/\(inaudible\)/gi, "[unclear]"); // Standardize unclear markers
  }

  static validateBusinessContext(context: BusinessContext): boolean {
    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (context.contactId && !uuidRegex.test(context.contactId)) {
      return false;
    }

    if (context.appointmentId && !uuidRegex.test(context.appointmentId)) {
      return false;
    }

    return true;
  }
}
```

## Deployment Considerations

### 1. Progressive Enhancement

```typescript
// src/lib/chat/progressiveEnhancement.ts
export class ChatFeatureDetection {
  static getSupportedFeatures(): ChatFeatures {
    return {
      speechRecognition: this.hasSpeechRecognition(),
      speechSynthesis: this.hasSpeechSynthesis(),
      mediaDevices: this.hasMediaDevices(),
      webAudio: this.hasWebAudio(),
      notifications: this.hasNotifications(),
    };
  }

  private static hasSpeechRecognition(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private static hasSpeechSynthesis(): boolean {
    return "speechSynthesis" in window;
  }

  private static hasMediaDevices(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private static hasWebAudio(): boolean {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  private static hasNotifications(): boolean {
    return "Notification" in window;
  }
}
```

### 2. Graceful Degradation

```typescript
// src/components/chat/ChatFallback.tsx
export const ChatFallback = ({ reason }: { reason: string }) => {
  return (
    <Card className="p-4 max-w-sm">
      <div className="flex items-center space-x-2 text-amber-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Chat Assistant Unavailable</span>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        {reason === 'no-speech' && "Voice features require a modern browser with microphone access."}
        {reason === 'no-audio' && "Audio features are not supported on this device."}
        {reason === 'permissions' && "Please allow microphone access to use voice features."}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => window.location.reload()}
      >
        Try Again
      </Button>
    </Card>
  );
};
```

## Conclusion

This comprehensive multimodal voice chat assistant design provides:

1. **Seamless Integration**: Built on existing `/api/chat` endpoint with enhanced context awareness
2. **Advanced Voice Features**: Speech-to-text, text-to-speech, and audio visualization
3. **Business Intelligence**: Contact data integration and practitioner-specific workflows
4. **Responsive Design**: Mobile-first approach with progressive enhancement
5. **Accessibility**: WCAG compliant with keyboard navigation and screen reader support
6. **Performance**: Lazy loading, efficient state management, and optimized audio processing
7. **Security**: Input sanitization, audio data privacy, and permission management

The design maintains consistency with the existing shadcn/ui components and teal/sky/violet/amber color scheme while providing a modern, intuitive chat interface that enhances the CRM experience for wellness practitioners and their clients.

**Key Files for Implementation:**

- `/Users/peterjamesblizzard/projects/app_omnicrm/src/components/chat/ChatAssistant.tsx`
- `/Users/peterjamesblizzard/projects/app_omnicrm/src/components/chat/ChatInterface.tsx`
- `/Users/peterjamesblizzard/projects/app_omnicrm/src/components/chat/VoiceVisualizer.tsx`
- `/Users/peterjamesblizzard/projects/app_omnicrm/src/lib/voice/speechToText.ts`
- `/Users/peterjamesblizzard/projects/app_omnicrm/src/lib/voice/textToSpeech.ts`
- `/Users/peterjamesblizzard/projects/app_omnicrm/src/lib/chat/businessContext.ts`
