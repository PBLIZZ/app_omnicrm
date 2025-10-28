/**
 * AI Tool Registry
 *
 * Central registry for all AI-callable tools.
 * Provides tool registration, discovery, validation, and execution orchestration.
 *
 * Architecture:
 * - Singleton registry pattern for global tool access
 * - Lazy loading of tool handlers
 * - Permission checking and rate limiting
 * - Credit cost tracking and quota enforcement
 * - Observability via tool_invocations table
 * - LLM-compatible function definitions
 */

import type {
  ToolDefinition,
  ToolHandler,
  RegisteredTool,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolCategory,
  PermissionLevel,
  LLMFunctionDefinition,
} from "./types";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/observability";
import { getDb } from "@/server/db/client";
import { createChatRepository } from "@repo";
import { ensureMonthlyQuota, trySpendCredit } from "@/server/ai/guardrails";

/**
 * Tool Registry
 *
 * Manages registration and execution of AI tools.
 * Thread-safe singleton pattern.
 */
export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, RegisteredTool> = new Map();
  private rateLimiters: Map<string, Map<string, { count: number; resetAt: number }>> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool with its handler
   */
  public register<TParams = unknown, TResult = unknown>(
    definition: ToolDefinition,
    handler: ToolHandler<TParams, TResult>,
  ): void {
    // Validate definition
    if (this.tools.has(definition.name)) {
      throw new AppError(
        `Tool "${definition.name}" is already registered`,
        "TOOL_ALREADY_REGISTERED",
        "validation",
        true,
        400,
      );
    }

    // Store tool
    this.tools.set(definition.name, { definition, handler });

    logger.info(`Tool registered: ${definition.name}`, {
      operation: "tool_registration",
      additionalData: {
        toolName: definition.name,
        category: definition.category,
        permissionLevel: definition.permissionLevel,
      },
    });
  }

  /**
   * Unregister a tool (primarily for testing)
   */
  public unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      this.rateLimiters.delete(toolName);
      logger.info(`Tool unregistered: ${toolName}`, {
        operation: "tool_unregistration",
        additionalData: { toolName },
      });
    }
    return removed;
  }

  /**
   * Get tool by name
   */
  public getTool(toolName: string): RegisteredTool | null {
    return this.tools.get(toolName) ?? null;
  }

  /**
   * List all registered tools
   */
  public listTools(filters?: {
    category?: ToolCategory;
    permissionLevel?: PermissionLevel;
    tags?: string[];
  }): ToolDefinition[] {
    let tools = Array.from(this.tools.values()).map((t) => t.definition);

    // Apply filters
    if (filters?.category) {
      tools = tools.filter((t) => t.category === filters.category);
    }
    if (filters?.permissionLevel) {
      tools = tools.filter((t) => t.permissionLevel === filters.permissionLevel);
    }
    if (filters?.tags && filters.tags.length > 0) {
      tools = tools.filter((t) => filters.tags?.some((tag) => t.tags.includes(tag)));
    }

    // Filter out deprecated tools
    return tools.filter((t) => !t.deprecated);
  }

  /**
   * Get LLM-compatible function definitions
   * Used when sending available tools to the LLM
   */
  public getLLMFunctions(filters?: {
    category?: ToolCategory;
    permissionLevel?: PermissionLevel;
  }): LLMFunctionDefinition[] {
    const tools = this.listTools(filters);

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Execute a tool with full orchestration
   */
  public async execute(
    toolName: string,
    params: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.getTool(toolName);

    if (!tool) {
      return {
        success: false,
        error: {
          code: "TOOL_NOT_FOUND",
          message: `Tool "${toolName}" is not registered`,
        },
        metadata: {
          latencyMs: Date.now() - startTime,
          cached: false,
          retryCount: 0,
        },
      };
    }

    const { definition, handler } = tool;

    // Check if tool is deprecated
    if (definition.deprecated) {
      await logger.warn(`Deprecated tool called: ${toolName}`, {
        operation: "tool_execution",
        additionalData: {
          toolName,
          userId: context.userId,
          deprecationMessage: definition.deprecationMessage,
        },
      });
    }

    // Check credit cost and quota
    if (definition.creditCost > 0) {
      try {
        // Ensure user has quota row for current month
        await ensureMonthlyQuota(context.userId);

        // Try to spend credits
        const creditsLeft = await trySpendCredit(context.userId);

        if (creditsLeft === null) {
          // Insufficient credits
          return {
            success: false,
            error: {
              code: "INSUFFICIENT_CREDITS",
              message: `Insufficient credits to execute tool "${toolName}". This tool costs ${definition.creditCost} credits.`,
              details: {
                toolName,
                creditCost: definition.creditCost,
              },
            },
            metadata: {
              latencyMs: Date.now() - startTime,
              cached: false,
              retryCount: 0,
            },
          };
        }

        await logger.info(`Credits spent for tool: ${toolName}`, {
          operation: "tool_credit_deduction",
          additionalData: {
            toolName,
            userId: context.userId,
            creditCost: definition.creditCost,
            creditsRemaining: creditsLeft,
          },
        });
      } catch (error) {
        // Credit system error - log but don't fail tool execution for free tools
        await logger.error("Credit check failed", {
          operation: "tool_credit_check",
          additionalData: {
            toolName,
            userId: context.userId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        // Return error for paid tools
        return {
          success: false,
          error: {
            code: "CREDIT_SYSTEM_ERROR",
            message: "Failed to check credit quota. Please try again.",
          },
          metadata: {
            latencyMs: Date.now() - startTime,
            cached: false,
            retryCount: 0,
          },
        };
      }
    }

    // Check rate limits
    const rateLimitError = this.checkRateLimit(toolName, context.userId, definition);
    if (rateLimitError) {
      return rateLimitError;
    }

    // Execute the tool
    try {
      await logger.info(`Executing tool: ${toolName}`, {
        operation: "tool_execution_start",
        additionalData: {
          toolName,
          userId: context.userId,
          threadId: context.threadId,
          messageId: context.messageId,
          requestId: context.requestId,
        },
      });

      const result = await handler(params, context);
      const latencyMs = Date.now() - startTime;

      // Record successful execution
      await this.recordInvocation({
        toolName: definition.name,
        toolVersion: definition.version,
        context,
        params,
        result,
        success: true,
        latencyMs,
      });

      await logger.info(`Tool execution succeeded: ${toolName}`, {
        operation: "tool_execution_success",
        additionalData: {
          toolName,
          userId: context.userId,
          latencyMs,
        },
      });

      return {
        success: true,
        data: result,
        metadata: {
          latencyMs,
          cached: false,
          retryCount: 0,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorCode = error instanceof AppError ? error.code : "TOOL_EXECUTION_ERROR";

      // Record failed execution
      await this.recordInvocation({
        toolName: definition.name,
        toolVersion: definition.version,
        context,
        params,
        result: null,
        success: false,
        errorCode,
        errorMessage,
        latencyMs,
      });

      await logger.error(`Tool execution failed: ${toolName}`, {
        operation: "tool_execution_error",
        additionalData: {
          toolName,
          userId: context.userId,
          error: errorMessage,
          errorCode,
          latencyMs,
        },
      });

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: error instanceof AppError ? error.details : undefined,
        },
        metadata: {
          latencyMs,
          cached: false,
          retryCount: 0,
        },
      };
    }
  }

  /**
   * Check rate limits for a tool
   */
  private checkRateLimit(
    toolName: string,
    userId: string,
    definition: ToolDefinition,
  ): ToolExecutionResult | null {
    if (!definition.rateLimit) {
      return null; // No rate limit configured
    }

    const { maxCalls, windowMs } = definition.rateLimit;
    const now = Date.now();

    // Initialize rate limiter for this tool if not exists
    if (!this.rateLimiters.has(toolName)) {
      this.rateLimiters.set(toolName, new Map());
    }

    const toolLimiters = this.rateLimiters.get(toolName);
    if (!toolLimiters) return null;

    const userLimit = toolLimiters.get(userId);

    // Check if window has expired
    if (!userLimit || now >= userLimit.resetAt) {
      // Start new window
      toolLimiters.set(userId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return null;
    }

    // Increment count
    if (userLimit.count >= maxCalls) {
      // Rate limit exceeded
      return {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Rate limit exceeded for tool "${toolName}". Max ${maxCalls} calls per ${windowMs}ms window.`,
          details: {
            maxCalls,
            windowMs,
            resetAt: userLimit.resetAt,
          },
        },
      };
    }

    userLimit.count++;
    return null;
  }

  /**
   * Record tool invocation to database
   */
  private async recordInvocation(record: {
    toolName: string;
    toolVersion: string;
    context: ToolExecutionContext;
    params: unknown;
    result: unknown;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    latencyMs: number;
  }): Promise<void> {
    try {
      const db = await getDb();
      const repo = createChatRepository(db);

      // Only record if we have a messageId
      if (!record.context.messageId) {
        return;
      }

      await repo.createToolInvocation({
        userId: record.context.userId,
        messageId: record.context.messageId,
        tool: record.toolName,
        args: record.params as Record<string, unknown>,
        result: record.success ? (record.result as Record<string, unknown>) : null,
        latencyMs: record.latencyMs,
      });
    } catch (error) {
      // Don't fail the tool execution if recording fails
      await logger.error("Failed to record tool invocation", {
        operation: "tool_invocation_recording",
        additionalData: {
          toolName: record.toolName,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Clear all tools (primarily for testing)
   */
  public clear(): void {
    this.tools.clear();
    this.rateLimiters.clear();
    logger.info("Tool registry cleared", { operation: "tool_registry_clear" });
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    toolsByPermission: Record<string, number>;
  } {
    const tools = Array.from(this.tools.values()).map((t) => t.definition);

    const toolsByCategory: Record<string, number> = {};
    const toolsByPermission: Record<string, number> = {};

    tools.forEach((tool) => {
      toolsByCategory[tool.category] = (toolsByCategory[tool.category] ?? 0) + 1;
      toolsByPermission[tool.permissionLevel] = (toolsByPermission[tool.permissionLevel] ?? 0) + 1;
    });

    return {
      totalTools: tools.length,
      toolsByCategory,
      toolsByPermission,
    };
  }
}

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  return ToolRegistry.getInstance();
}
