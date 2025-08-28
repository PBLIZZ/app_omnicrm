// Chat service with streaming support
import { getOpenRouterConfig, assertOpenRouterConfigured, openRouterHeaders } from "@/server/providers/openrouter.provider";
import { chatStorage } from "@/server/storage/chat.storage";
import { DatabaseQueryService } from "./database-query.service";
import { TitleGenerationService } from "./title-generation.service";

interface ChatResponse {
  data: {
    message: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
    };
  };
  creditsLeft: number;
}

export async function chatService(userId: string, prompt: string): Promise<ChatResponse | { error: string }> {
  try {
    assertOpenRouterConfigured();
    const config = getOpenRouterConfig();
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: config.chatModel,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant for OmniCRM, a wellness-focused CRM platform. Help users with their questions about contacts, scheduling, and general wellness practice management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      
      if (response.status === 429) {
        return { error: "rate_limited_minute" };
      }
      if (response.status === 402) {
        return { error: "rate_limited_daily_cost" };
      }
      
      return { error: "api_error" };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return {
      data: {
        message,
        usage: data.usage,
      },
      creditsLeft: 100, // Mock credits - replace with actual credit tracking
    };
  } catch (error) {
    console.error("Chat service error:", error);
    return { error: "internal_error" };
  }
}

export async function streamingChatService(userId: string, message: string, threadId: string): Promise<ReadableStream> {
  assertOpenRouterConfigured();
  const config = getOpenRouterConfig();
  
  // Get conversation history for context
  const messages = await chatStorage.getMessages(threadId, userId);
  const conversationHistory = messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'object' ? msg.content.text : msg.content
  }));
  
  // Check if this is a database query first
  const normalizedMessage = message.toLowerCase();
  const isDatabaseQuery = 
    normalizedMessage.includes('how many') ||
    normalizedMessage.includes('contacts') ||
    normalizedMessage.includes('notes') ||
    normalizedMessage.includes('find') ||
    normalizedMessage.includes('search') ||
    normalizedMessage.includes('summary') ||
    normalizedMessage.includes('overview') ||
    normalizedMessage.includes('begin') ||
    normalizedMessage.includes('start') ||
    normalizedMessage.includes('with email') ||
    normalizedMessage.includes('with phone') ||
    normalizedMessage.includes('without') ||
    // Personal queries
    normalizedMessage.includes('tell me about') ||
    normalizedMessage.includes('who is') ||
    normalizedMessage.includes('about ') ||
    normalizedMessage.includes('information about') ||
    normalizedMessage.includes('details about') ||
    normalizedMessage.includes('profile') ||
    normalizedMessage.includes('client') ||
    normalizedMessage.includes('customer') ||
    // Check if message contains person names (basic heuristic)
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(message) || // First Last name pattern
    /\b(fischer|fisher|wilson|rossi|torres|svensson|nascimento|oconnor|chen|mendez|singh|costa|ruiz|kaur|novak|herrera|patel|rivas|blizzard)\b/i.test(normalizedMessage);

  if (isDatabaseQuery) {
    // Process database query
    const queryResult = await DatabaseQueryService.processQuery(userId, message);
    
    // Create a stream that returns the database result
    const encoder = new TextEncoder();
    let responseContent = "";
    
    if (queryResult.success) {
      if (queryResult.data.message) {
        responseContent = queryResult.data.message;
      } else if (queryResult.data.count !== undefined) {
        responseContent = queryResult.data.message;
        
        // If there are specific contacts found, show them
        if (queryResult.data.contacts && queryResult.data.contacts.length > 0) {
          responseContent += "\n\n**Contacts:**\n";
          queryResult.data.contacts.forEach((contact: any) => {
            responseContent += `• **${contact.name}**\n`;
            if (contact.email) responseContent += `  Email: ${contact.email}\n`;
            if (contact.phone) responseContent += `  Phone: ${contact.phone}\n`;
          });
        }
      } else if (queryResult.data.totalContacts !== undefined) {
        const summary = queryResult.data;
        responseContent = `**Contacts Summary:**\n\n` +
          `• Total contacts: ${summary.totalContacts}\n` +
          `• Contacts with email: ${summary.contactsWithEmail}\n` +
          `• Contacts with phone: ${summary.contactsWithPhone}\n\n`;
        
        if (summary.recentContacts.length > 0) {
          responseContent += `**Recent contacts:**\n`;
          summary.recentContacts.forEach((contact: any) => {
            responseContent += `• ${contact.name}${contact.email ? ` (${contact.email})` : ''}\n`;
          });
        }
      } else if (queryResult.data.matches !== undefined) {
        const searchData = queryResult.data;
        responseContent = `Found ${searchData.matches} matching contact${searchData.matches === 1 ? '' : 's'}:\n\n`;
        searchData.contacts.forEach((contact: any) => {
          responseContent += `• **${contact.name}**\n`;
          if (contact.email) responseContent += `  Email: ${contact.email}\n`;
          if (contact.phone) responseContent += `  Phone: ${contact.phone}\n`;
        });
      } else if (queryResult.data.totalNotes !== undefined) {
        responseContent = queryResult.data.message;
      }
    } else {
      responseContent = queryResult.error || "Sorry, I couldn't process your database query.";
    }
    
    return new ReadableStream({
      start(controller) {
        // Send the response content in chunks to simulate streaming
        const words = responseContent.split(' ');
        let wordIndex = 0;
        
        const sendChunk = () => {
          if (wordIndex < words.length) {
            const chunk = words[wordIndex] + ' ';
            const sseData = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            wordIndex++;
            setTimeout(sendChunk, 50); // Delay between words for streaming effect
          } else {
            // Save to database and check for title update
            chatStorage.createMessage(threadId, userId, "assistant", { text: responseContent })
              .then(async () => {
                // Try to auto-generate title after saving message (without sending through closed controller)
                await TitleGenerationService.autoUpdateThreadTitle(threadId, userId);
              })
              .catch(error => console.error("Error saving assistant message:", error));
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        };
        
        sendChunk();
      }
    });
  }
  
  // For non-database queries, use the regular OpenRouter API with conversation history
  const systemMessage = {
    role: "system",
    content: "You are a helpful AI assistant for OmniCRM, a wellness-focused CRM platform. Help users with their questions about contacts, scheduling, and general wellness practice management. Keep responses concise and helpful.\n\nYou have access to the user's conversation history and should remember what was discussed previously. For questions about CRM data (like 'how many contacts do I have?'), I can answer those directly with real data."
  };

  // Build messages array with history + new message
  const allMessages = [
    systemMessage,
    ...conversationHistory,
    {
      role: "user",
      content: message
    }
  ];

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: config.chatModel,
      messages: allMessages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const encoder = new TextEncoder();
  let assistantResponse = "";
  
  return new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                // Save complete assistant response to database
                if (assistantResponse.trim()) {
                  try {
                    await chatStorage.createMessage(threadId, userId, "assistant", { text: assistantResponse });
                    
                    // Try to auto-generate title after saving message (without sending through closed controller)
                    await TitleGenerationService.autoUpdateThreadTitle(threadId, userId);
                  } catch (error) {
                    console.error("Error saving assistant message:", error);
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  assistantResponse += content; // Accumulate response
                  const sseData = JSON.stringify({ content });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.error("Streaming error:", error);
      } finally {
        controller.close();
      }
    },
  });
}