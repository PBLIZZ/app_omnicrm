// Enhanced Claude chat service with memory and tool capabilities
import { getAnthropicClient, assertAnthropicConfigured, ANTHROPIC_MODEL } from "@/server/providers/anthropic.provider";
import { chatStorage } from "@/server/storage/chat.storage";
import { DatabaseQueryService } from "./database-query.service";
import type { DatabaseQueryData, SearchContactsData, ContactNamesData, FilterContactsData } from "./database-query.service";
import { TitleGenerationService } from "./title-generation.service";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export class ClaudeChatService {
  /**
   * Process a chat message with full conversation memory and tool capabilities
   */
  static async streamingChat(userId: string, message: string, threadId: string): Promise<ReadableStream> {
    assertAnthropicConfigured();
    const client = getAnthropicClient();
    
    // Type guard for message content
    const extractContentText = (content: unknown): string => {
      if (typeof content === 'string') return content;
      if (content && typeof content === 'object' && 'text' in content) {
        return typeof content.text === 'string' ? content.text : '';
      }
      return '';
    };

    // Get full conversation history for context
    const messages = await chatStorage.getMessages(threadId, userId);
    const conversationHistory = messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: extractContentText(msg.content)
    })).filter(msg => msg.content.trim() !== '');

    // Build message array with history
    const allMessages: MessageParam[] = [
      ...conversationHistory,
      {
        role: "user",
        content: message
      }
    ];

    // System prompt for OmniCRM context
    const systemPrompt = `You are Claude, an advanced AI assistant integrated into OmniCRM, a wellness-focused CRM platform for yoga teachers, massage therapists, and holistic health professionals.

Key capabilities:
- Full conversation memory - you remember everything discussed in this thread
- Access to user's CRM data (contacts, notes, scheduling information)
- Ability to help with wellness business management
- Email composition and marketing assistance
- Scheduling and appointment management guidance

Context: This is a wellness practitioner's CRM system. Be helpful, professional, and remember the full conversation context. When users ask about their data (contacts, appointments, etc.), I can access their actual CRM information.

Current conversation context: You have full access to the conversation history above and should reference previous messages when relevant.`;

    const encoder = new TextEncoder();
    let assistantResponse = "";

    return new ReadableStream({
      async start(controller) {
        try {
          // Check if this might be a database query first
          // Also check conversation context for database-related follow-ups
          const recentMessages = conversationHistory.slice(-3).map(m => m.content).join(' ').toLowerCase();
          const isDatabaseQuery = ClaudeChatService.isDatabaseRelatedQuery(message) ||
                                  (recentMessages.includes('contacts') && message.toLowerCase().includes('names'));
          
          // console.log('Database query check:', { message, isDatabaseQuery, recentMessages });
          
          if (isDatabaseQuery) {
            // Handle database queries with context
            const queryResult = await DatabaseQueryService.processQuery(userId, message);
            let responseContent = "";
            
            if (queryResult.success && queryResult.data) {
              // Type guard to check if data has contacts array
              const hasContactsArray = (
                data: DatabaseQueryData
              ): data is (SearchContactsData | ContactNamesData | FilterContactsData) => {
                return (
                  !!data &&
                  typeof data === 'object' &&
                  'contacts' in data &&
                  Array.isArray(data.contacts)
                );
              };
              
              const hasMessage = (
                data: DatabaseQueryData
              ): data is { message: string } => {
                return (
                  !!data &&
                  typeof (data as any) === 'object' &&
                  'message' in (data as any) &&
                  typeof (data as any).message === 'string'
                );
              };
              
              if (hasContactsArray(queryResult.data)) {
                responseContent = `Found ${queryResult.data.contacts.length} contacts:\n\n`;
                queryResult.data.contacts.forEach((contact) => {
                  responseContent += `• ${contact.name}`;
                  if (contact.email) responseContent += ` (${contact.email})`;
                  if (contact.phone) responseContent += ` - ${contact.phone}`;
                  responseContent += `\n`;
                });
              } else if (hasMessage(queryResult.data)) {
                responseContent = queryResult.data.message;
              } else {
                responseContent = "Query completed successfully.";
              }
            } else {
              responseContent = queryResult.error || "Sorry, I couldn't process your database query.";
            }
            
            // Stream the database response
            await ClaudeChatService.streamResponse(controller, responseContent, encoder);
            
            // Save message and close
            await chatStorage.createMessage(threadId, userId, "assistant", { text: responseContent });
            await TitleGenerationService.autoUpdateThreadTitle(threadId, userId);
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // Use Claude for general conversation with full context
          const stream = await client.messages.create({
            model: ANTHROPIC_MODEL,
            max_tokens: 1000,
            system: systemPrompt,
            messages: allMessages,
            stream: true,
          });

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const content = chunk.delta.text;
              assistantResponse += content;
              
              // Send content chunk
              const sseData = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
          }

          // Save complete response to database
          if (assistantResponse.trim()) {
            await chatStorage.createMessage(threadId, userId, "assistant", { text: assistantResponse });
            await TitleGenerationService.autoUpdateThreadTitle(threadId, userId);
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error("Claude chat error:", error);
          const errorMessage = "I apologize, but I encountered an error processing your request. Please try again.";
          
          const sseData = JSON.stringify({ content: errorMessage });
          controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });
  }

  /**
   * Stream a response word by word for smooth UX
   */
  private static async streamResponse(controller: ReadableStreamDefaultController, content: string, encoder: TextEncoder): Promise<void> {
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      const sseData = JSON.stringify({ content: word });
      controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      
      // Small delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  /**
   * Determine if a message is likely a database query
   */
  private static isDatabaseRelatedQuery(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('how many') ||
           normalized.includes('contacts') ||
           normalized.includes('contact') ||
           normalized.includes('notes') ||
           normalized.includes('find') ||
           normalized.includes('search') ||
           normalized.includes('summary') ||
           normalized.includes('overview') ||
           normalized.includes('begin') ||
           normalized.includes('start') ||
           normalized.includes('with email') ||
           normalized.includes('with phone') ||
           normalized.includes('without') ||
           normalized.includes('names') ||
           normalized.includes('name') ||
           normalized.includes('who are') ||
           normalized.includes('show me') ||
           normalized.includes('list') ||
           normalized.includes('all my') ||
           normalized.includes('their ') ||
           // Check if asking for details about previously mentioned entities
           (normalized.length < 20 && (
             normalized.includes('their') || 
             normalized.includes('names') || 
             normalized.includes('emails') || 
             normalized.includes('phone') ||
             normalized.includes('details')
           ));
  }

  /**
   * Enhanced email composition with Claude's capabilities
   */
  static async composeEmail(userId: string, prompt: string, context?: Record<string, unknown>): Promise<string> {
    assertAnthropicConfigured();
    const client = getAnthropicClient();

    const systemPrompt = `You are a professional email copywriter specializing in wellness businesses. Create compelling, warm, and professional emails for yoga studios, massage therapists, and holistic health practitioners.

Guidelines:
- Keep tone warm but professional
- Focus on wellness and self-care benefits
- Include clear calls to action
- Use personable, inviting language
- Make emails scannable with good structure`;

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Please write an email based on this request: ${prompt}${context ? `\n\nAdditional context: ${JSON.stringify(context)}` : ''}`
        }
      ],
    });

    const firstContent = response.content?.[0];
    const emailContent = firstContent && firstContent.type === 'text' && 'text' in firstContent ? firstContent.text : '';
    return emailContent;
  }
}