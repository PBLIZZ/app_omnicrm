// Title generation service for chat threads
import { getOpenRouterConfig, assertOpenRouterConfigured, openRouterHeaders } from "@/server/providers/openrouter.provider";
import { chatStorage } from "@/server/storage/chat.storage";

export class TitleGenerationService {
  /**
   * Generate a title based on conversation messages
   */
  static async generateTitle(messages: Array<{role: string, content: any}>): Promise<string> {
    try {
      assertOpenRouterConfigured();
      const config = getOpenRouterConfig();

      // Create a prompt that summarizes the conversation
      const conversationText = messages
        .slice(0, 6) // Use first 6 messages for context
        .map(msg => {
          const content = typeof msg.content === 'object' ? msg.content.text : msg.content;
          return `${msg.role}: ${content}`;
        })
        .join('\n');

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model: config.chatModel,
          messages: [
            {
              role: "system",
              content: "You are a title generator. Create a concise, descriptive title (3-8 words) for the following conversation. The title should capture the main topic or question. Respond with ONLY the title, no quotes or explanations."
            },
            {
              role: "user",
              content: `Generate a title for this conversation:\n\n${conversationText}`
            }
          ],
          max_tokens: 20,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error("Title generation API error:", response.status);
        return this.fallbackTitle(messages);
      }

      const data = await response.json();
      const generatedTitle = data.choices?.[0]?.message?.content?.trim();
      
      if (generatedTitle && generatedTitle.length > 3) {
        // Clean up the title
        return generatedTitle
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/\.$/, '') // Remove trailing period
          .substring(0, 60); // Limit length
      }

      return this.fallbackTitle(messages);
    } catch (error) {
      console.error("Error generating title:", error);
      return this.fallbackTitle(messages);
    }
  }

  /**
   * Create a fallback title from the first user message
   */
  private static fallbackTitle(messages: Array<{role: string, content: any}>): string {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = typeof firstUserMessage.content === 'object' 
        ? firstUserMessage.content.text 
        : firstUserMessage.content;
      
      if (content && typeof content === 'string') {
        const cleaned = content.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
        if (cleaned.length <= 40) {
          return cleaned;
        }
        
        const truncated = cleaned.substring(0, 40);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > 20) {
          return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
      }
    }
    
    return "New Chat";
  }

  /**
   * Check if a thread should have its title auto-generated
   * Returns true if the thread has 2+ messages and still has a generic title
   */
  static shouldGenerateTitle(messages: Array<{role: string, content: any}>, currentTitle: string): boolean {
    // Don't update if user has manually set a title (not generic)
    const genericTitles = ['New Chat', 'Untitled Chat'];
    const isGenericTitle = genericTitles.some(generic => currentTitle.includes(generic)) || 
                          currentTitle.endsWith('...') ||
                          currentTitle.length < 10;

    // Generate title after 2+ messages (1 user + 1 assistant minimum)
    return messages.length >= 2 && isGenericTitle;
  }

  /**
   * Automatically update thread title if conditions are met
   */
  static async autoUpdateThreadTitle(threadId: string, userId: string): Promise<string | null> {
    try {
      // Get thread and messages
      const thread = await chatStorage.getThread(threadId, userId);
      if (!thread) return null;

      const messages = await chatStorage.getMessages(threadId, userId);
      
      if (this.shouldGenerateTitle(messages, thread.title ?? "New Chat")) {
        const newTitle = await this.generateTitle(messages);
        
        // Update thread title in database
        await chatStorage.updateThreadTitle(threadId, userId, newTitle);
        
        return newTitle;
      }

      return null;
    } catch (error) {
      console.error("Error in auto title update:", error);
      return null;
    }
  }
}