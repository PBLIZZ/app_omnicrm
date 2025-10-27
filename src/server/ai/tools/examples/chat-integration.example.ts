/**
 * Example: Integrating AI Tools with Chat Endpoint
 *
 * This example demonstrates how to integrate the tool-calling system
 * with an AI chat endpoint for function calling workflows.
 *
 * USAGE:
 * This is an example file showing the pattern - adapt for your specific
 * chat/assistant implementation.
 */

import { getToolRegistry } from "../registry";
import { generateText } from "@/server/ai/core/llm.service";
import type { ChatMessage } from "@/server/ai/core/llm.service";

/**
 * Example: Handle a user message with tool calling support
 */
export async function handleChatWithTools(
  userId: string,
  threadId: string,
  userMessage: string,
  options: {
    allowedCategories?: Array<"data_access" | "data_mutation" | "communication" | "analytics">;
    maxToolCalls?: number;
  } = {},
): Promise<{
  assistantMessage: string;
  toolCallsMade: Array<{ tool: string; result: unknown }>;
}> {
  const registry = getToolRegistry();
  const maxIterations = options.maxToolCalls ?? 5;
  const toolCallsMade: Array<{ tool: string; result: unknown }> = [];

  // Get available tools for this conversation
  const availableTools = registry.getLLMFunctions({
    // Only allow read operations by default for safety
    permissionLevel: "read",
  });

  // Build conversation history
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a helpful wellness CRM assistant. You have access to tools to help manage contacts, tasks, and productivity.

Available tools: ${availableTools.map((t) => t.name).join(", ")}

When the user asks questions about their contacts, tasks, or needs information from the CRM:
1. Use the appropriate tool to fetch the data
2. Present the results in a clear, conversational way
3. Offer next steps or related actions

Be proactive about using tools when the user's intent suggests they need CRM data.`,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  // Tool calling loop (allow multiple tool calls in sequence)
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Call LLM with available functions
    const response = await generateText<{
      choices: Array<{
        message: {
          role: string;
          content: string | null;
          function_call?: {
            name: string;
            arguments: string;
          };
        };
      }>;
    }>(userId, {
      model: "gpt-4",
      messages,
      // Note: In real implementation, you'd pass functions in the proper format
      // This is simplified for example purposes
      // functions: availableTools,
    });

    const assistantMessage = response.data.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error("No response from LLM");
    }

    // Check if LLM wants to call a function
    if (assistantMessage.function_call) {
      const { name: toolName, arguments: argsJson } = assistantMessage.function_call;

      // Parse arguments
      let args: unknown;
      try {
        args = JSON.parse(argsJson);
      } catch (error) {
        // If LLM gave us invalid JSON, tell it and retry
        messages.push({
          role: "assistant",
          content: `Function call error: Invalid JSON arguments`,
        });
        continue;
      }

      // Execute the tool
      const toolResult = await registry.execute(toolName, args, {
        userId,
        threadId,
        messageId: crypto.randomUUID(),
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      });

      // Record tool call
      toolCallsMade.push({
        tool: toolName,
        result: toolResult.success ? toolResult.data : toolResult.error,
      });

      // Add function result to conversation
      if (toolResult.success) {
        messages.push({
          role: "assistant",
          content: `Called ${toolName} successfully`,
        });
        messages.push({
          role: "user",
          content: `Function ${toolName} returned: ${JSON.stringify(toolResult.data)}`,
        });
      } else {
        // Tool execution failed
        messages.push({
          role: "assistant",
          content: `Called ${toolName} but it failed`,
        });
        messages.push({
          role: "user",
          content: `Function ${toolName} error: ${toolResult.error?.message}`,
        });
      }

      // Continue loop to let LLM process the result
      continue;
    }

    // No function call - LLM gave us final answer
    return {
      assistantMessage: assistantMessage.content ?? "",
      toolCallsMade,
    };
  }

  // Hit max iterations
  return {
    assistantMessage: "I'm having trouble completing this request. Please try rephrasing.",
    toolCallsMade,
  };
}

/**
 * Example: Specific workflow using tools directly
 *
 * This shows how you might use tools programmatically in a
 * predefined workflow without LLM orchestration.
 */
export async function clientPreSessionWorkflow(userId: string, contactId: string): Promise<{
  contact: unknown;
  recentNotes: unknown[];
  upcomingTasks: unknown[];
  insights: unknown;
}> {
  const registry = getToolRegistry();

  // 1. Get contact details
  const contactResult = await registry.execute(
    "get_contact",
    { contact_id: contactId },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  if (!contactResult.success) {
    throw new Error(`Failed to get contact: ${contactResult.error?.message}`);
  }

  // 2. Get today's tasks related to this contact
  const tasksResult = await registry.execute(
    "search_tasks",
    { query: "", contact_id: contactId, status: "todo", limit: 5 },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  // 3. Could call more tools here...
  // - Get recent notes: search_notes
  // - Get contact insights: get_contact_insights
  // - Check calendar: get_upcoming_sessions

  return {
    contact: contactResult.data,
    recentNotes: [], // Would be populated by real tool call
    upcomingTasks: tasksResult.success ? (tasksResult.data as { tasks: unknown[] }).tasks : [],
    insights: {}, // Would be populated by real tool call
  };
}

/**
 * Example: Permission-aware tool execution
 *
 * Shows how you might restrict tools based on user context
 */
export async function handleChatWithPermissions(
  userId: string,
  userRole: "practitioner" | "admin" | "viewer",
  userMessage: string,
): Promise<string> {
  const registry = getToolRegistry();

  // Determine allowed permission level based on user role
  const permissionLevel = {
    viewer: "read" as const,
    practitioner: "write" as const,
    admin: "admin" as const,
  }[userRole];

  // Get tools user has permission for
  const allowedTools = registry.getLLMFunctions({
    permissionLevel,
  });

  // Now use only these tools in the LLM conversation
  // (implementation similar to handleChatWithTools above)

  return `User has access to ${allowedTools.length} tools based on their ${userRole} role`;
}

/**
 * Example: Cron job using tools
 *
 * Shows how background jobs can use tools for automation
 */
export async function dailyTaskDigestCronJob(userId: string): Promise<void> {
  const registry = getToolRegistry();

  // Get today's tasks
  const todayResult = await registry.execute(
    "get_today_tasks",
    { include_completed: false },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  // Get overdue tasks
  const overdueResult = await registry.execute(
    "get_overdue_tasks",
    { limit: 20 },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  if (todayResult.success && overdueResult.success) {
    const todayTasks = (todayResult.data as { tasks: unknown[] }).tasks;
    const overdueTasks = (overdueResult.data as { tasks: unknown[] }).tasks;

    // Generate and send digest email
    // (would use send_email tool when implemented)
    console.log(`Daily digest: ${todayTasks.length} today, ${overdueTasks.length} overdue`);
  }
}

/**
 * Example: Multi-step workflow with error handling
 */
export async function createClientWithInitialTask(
  userId: string,
  contactData: {
    name: string;
    email: string;
    phone?: string;
  },
  taskData: {
    title: string;
    dueDate: Date;
  },
): Promise<{ contact: unknown; task: unknown }> {
  const registry = getToolRegistry();

  // Step 1: Create contact
  const contactResult = await registry.execute(
    "create_contact",
    {
      display_name: contactData.name,
      primary_email: contactData.email,
      primary_phone: contactData.phone,
      source: "manual_entry",
      lifecycle_stage: "prospect",
    },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  if (!contactResult.success) {
    throw new Error(`Failed to create contact: ${contactResult.error?.message}`);
  }

  const contact = contactResult.data as { id: string };

  // Step 2: Create task linked to new contact
  const taskResult = await registry.execute(
    "create_task",
    {
      title: taskData.title,
      contact_id: contact.id,
      due_date: taskData.dueDate,
      priority: "high",
    },
    {
      userId,
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    },
  );

  if (!taskResult.success) {
    // Contact was created but task failed
    // Could implement rollback or compensating transaction here
    throw new Error(`Contact created but task failed: ${taskResult.error?.message}`);
  }

  return {
    contact: contactResult.data,
    task: taskResult.data,
  };
}
