/**
 * Intelligent Inbox Processor for OmniMomentum
 *
 * This service handles the "dump everything" inbox where users can quickly capture
 * multiple tasks/thoughts and let AI automatically:
 * 1. Split bulk input into individual tasks
 * 2. Categorize by zones (Life, Business, etc.)
 * 3. Assign to projects where applicable
 * 4. Detect hierarchies (task/subtask, project/task relationships)
 * 5. Present for approval via HITL workflow
 */

import { generateText } from "@/server/ai/core/llm.service";
import { logger } from "@/lib/observability";
import { InboxProcessingContext } from "@/server/db/business-schemas";
import { z } from "zod";

// Enhanced schemas for intelligent processing
export const IntelligentTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  estimatedMinutes: z.number().nullable(),
  dueDate: z.coerce.date().nullable(),
  zoneId: z.number().int().nullable(),
  projectId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const IntelligentProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  zoneId: z.number().int().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).default("active"),
  dueDate: z.coerce.date().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const IntelligentProcessingResultSchema = z.object({
  extractedTasks: z.array(IntelligentTaskSchema),
  suggestedProjects: z.array(IntelligentProjectSchema),
  taskHierarchies: z.array(
    z.object({
      parentTaskId: z.string().uuid(),
      subtaskIds: z.array(z.string().uuid()),
      relationshipType: z.enum(["task_subtask", "project_task"]),
      confidence: z.number().min(0).max(1),
    }),
  ),
  overallConfidence: z.number().min(0).max(1),
  processingNotes: z.string(),
  requiresApproval: z.boolean(),
});

export type IntelligentTask = z.infer<typeof IntelligentTaskSchema>;
export type IntelligentProject = z.infer<typeof IntelligentProjectSchema>;
export type IntelligentProcessingResult = z.infer<typeof IntelligentProcessingResultSchema>;

/**
 * Build enhanced prompt for intelligent inbox processing
 */
function buildIntelligentProcessingPrompt(
  rawText: string,
  context: InboxProcessingContext,
): Array<{ role: "system" | "user"; content: string }> {
  const availableZones = context.zones.map((zone) => `${zone.id}: ${zone.name}`).join(", ");

  return [
    {
      role: "system" as const,
      content: `You are an advanced AI assistant that intelligently processes bulk inbox input for productivity management. Your job is to:

1. **SPLIT BULK INPUT**: Break down the raw text into individual, actionable tasks
2. **ZONE CATEGORIZATION**: Assign each task to the most appropriate zone (Life, Business, etc.)
3. **PROJECT ASSIGNMENT**: Identify when tasks belong to existing or new projects
4. **HIERARCHY DETECTION**: Determine task/subtask and project/task relationships
5. **INTELLIGENT PARSING**: Extract priorities, due dates, time estimates, and tags

Available zones: ${availableZones}

**IMPORTANT RULES:**
- Each task must be a single, actionable item
- Use existing zone IDs from the available zones list
- Create new projects only when tasks logically group together
- Detect parent-child relationships between tasks
- Assign realistic priorities and time estimates
- Extract any mentioned due dates or deadlines
- Be conservative with confidence scores - only high confidence for clear cases

**OUTPUT FORMAT:**
Return a JSON object with this exact structure:
{
  "extractedTasks": [
    {
      "id": "generated-uuid",
      "name": "Clear, actionable task name",
      "description": "Detailed description or null",
      "priority": "low|medium|high|urgent",
      "estimatedMinutes": number or null,
      "dueDate": "YYYY-MM-DD" or null,
      "zoneId": number or null,
      "projectId": "generated-uuid" or null,
      "parentTaskId": "generated-uuid" or null,
      "tags": ["tag1", "tag2"],
      "confidence": 0.0-1.0,
      "reasoning": "Why this categorization"
    }
  ],
  "suggestedProjects": [
    {
      "id": "generated-uuid",
      "name": "Project name",
      "description": "Project description or null",
      "zoneId": number or null,
      "status": "active",
      "dueDate": "YYYY-MM-DD" or null,
      "confidence": 0.0-1.0,
      "reasoning": "Why this project grouping"
    }
  ],
  "taskHierarchies": [
    {
      "parentTaskId": "generated-uuid",
      "subtaskIds": ["uuid1", "uuid2"],
      "relationshipType": "task_subtask|project_task",
      "confidence": 0.0-1.0
    }
  ],
  "overallConfidence": 0.0-1.0,
  "processingNotes": "Summary of processing decisions",
  "requiresApproval": true
}`,
    },
    {
      role: "user" as const,
      content: `Please intelligently process this inbox input and break it down into individual tasks with proper categorization:

"${rawText}"`,
    },
  ];
}

/**
 * Process inbox item with intelligent task splitting and categorization
 */
export async function processIntelligentInboxItem(
  userId: string,
  rawText: string,
  context: InboxProcessingContext,
): Promise<IntelligentProcessingResult> {
  const messages = buildIntelligentProcessingPrompt(rawText, context);

  await logger.info("Intelligent inbox processing started", {
    operation: "intelligent_inbox_processing",
    additionalData: {
      userId,
      textLength: rawText.length,
      zonesCount: context.zones.length,
    },
  });

  try {
    const response = await generateText<IntelligentProcessingResult>(userId, {
      model: "default",
      messages,
    });

    // Validate the response
    const validatedResult = IntelligentProcessingResultSchema.parse(response.data);

    await logger.info("Intelligent inbox processing completed", {
      operation: "intelligent_inbox_processing",
      additionalData: {
        userId,
        tasksExtracted: validatedResult.extractedTasks.length,
        projectsSuggested: validatedResult.suggestedProjects.length,
        hierarchiesDetected: validatedResult.taskHierarchies.length,
        overallConfidence: validatedResult.overallConfidence,
        requiresApproval: validatedResult.requiresApproval,
      },
    });

    return validatedResult;
  } catch (error) {
    await logger.error("Intelligent inbox processing failed", {
      operation: "intelligent_inbox_processing",
      additionalData: {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Return a fallback result for low confidence cases
    return {
      extractedTasks: [
        {
          id: crypto.randomUUID(),
          name: rawText.substring(0, 100) + (rawText.length > 100 ? "..." : ""),
          description: rawText.length > 100 ? rawText : null,
          priority: "medium",
          estimatedMinutes: null,
          dueDate: null,
          zoneId: context.zones[0]?.id || null,
          projectId: null,
          parentTaskId: null,
          tags: [],
          confidence: 0.3,
          reasoning: "Fallback processing due to AI error",
        },
      ],
      suggestedProjects: [],
      taskHierarchies: [],
      overallConfidence: 0.3,
      processingNotes: "Processing failed, created fallback task",
      requiresApproval: true,
    };
  }
}

/**
 * Generate UUIDs for tasks and projects
 */
export function generateTaskId(): string {
  return crypto.randomUUID();
}

export function generateProjectId(): string {
  return crypto.randomUUID();
}
