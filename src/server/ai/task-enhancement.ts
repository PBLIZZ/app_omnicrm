import { openai } from "@/server/ai/openai";

export interface TaskEnhancementRequest {
  title: string;
  dueDate?: Date;
  userContext?: {
    existingProjects?: Array<{ id: string; name: string; description?: string }>;
    existingTags?: string[];
    businessPriorities?: string[];
    userGoals?: string[];
    workspaces?: Array<{ id: string; name: string }>;
  };
}

export interface TaskEnhancementResponse {
  enhancedTitle: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  suggestedTags: string[];
  estimatedMinutes: number;
  suggestedProject?: {
    id: string;
    name: string;
    confidence: number;
  };
  suggestedWorkspace?: {
    id: string;
    name: string;
    confidence: number;
  };
  aiInsights: {
    reasoning: string;
    businessAlignment: string;
    urgencyFactors: string[];
    suggestions: string[];
  };
  subtasks?: Array<{
    title: string;
    estimatedMinutes: number;
  }>;
  confidenceLevel: number; // 0-100
}

const TASK_ENHANCEMENT_PROMPT = `
You are an AI task management assistant helping users create well-structured, actionable tasks. 

Your role is to:
1. Improve task titles to be clear, specific, and actionable
2. Write comprehensive but concise descriptions
3. Assign appropriate categories and priorities
4. Suggest relevant tags and project assignments
5. Break down complex tasks into subtasks when beneficial
6. Provide time estimates based on task complexity

Categories available:
- client-care: Tasks related to client relationships and support
- business-development: Growth, sales, marketing activities  
- administrative: Operations, documentation, compliance
- content-creation: Writing, design, media production
- personal-wellness: Self-care, learning, development

Priorities:
- urgent: Critical, time-sensitive, high-impact
- high: Important, significant business value
- medium: Standard priority, moderate impact
- low: Nice-to-have, minimal urgency

Consider:
- Business context and alignment with goals
- Task complexity and time requirements
- Dependencies and project relationships
- User's existing workload and priorities

Respond with actionable, specific improvements that help the user be more productive.
`;

export async function enhanceTaskWithAI(
  request: TaskEnhancementRequest,
): Promise<TaskEnhancementResponse> {
  try {
    const { title, dueDate, userContext } = request;

    // Build context for the AI
    const contextInfo = [];
    if (userContext?.existingProjects?.length) {
      contextInfo.push(
        `Existing Projects: ${userContext.existingProjects.map((p) => `${p.name} (${p.description || "No description"})`).join(", ")}`,
      );
    }
    if (userContext?.existingTags?.length) {
      contextInfo.push(`Existing Tags: ${userContext.existingTags.join(", ")}`);
    }
    if (userContext?.businessPriorities?.length) {
      contextInfo.push(`Business Priorities: ${userContext.businessPriorities.join(", ")}`);
    }
    if (userContext?.userGoals?.length) {
      contextInfo.push(`User Goals: ${userContext.userGoals.join(", ")}`);
    }
    if (dueDate) {
      contextInfo.push(`Due Date: ${dueDate.toISOString().split("T")[0]}`);
    }

    const prompt = `
${TASK_ENHANCEMENT_PROMPT}

Context:
${contextInfo.length ? contextInfo.join("\n") : "No additional context provided"}

Original Task Title: "${title}"

Please enhance this task and provide a JSON response with the following structure:
{
  "enhancedTitle": "Improved, actionable task title",
  "description": "Detailed description with context and requirements",
  "category": "client-care|business-development|administrative|content-creation|personal-wellness",
  "priority": "low|medium|high|urgent",
  "suggestedTags": ["tag1", "tag2"],
  "estimatedMinutes": 60,
  "suggestedProject": {
    "id": "project-id-if-matches",
    "name": "project-name",
    "confidence": 85
  },
  "suggestedWorkspace": {
    "id": "workspace-id-if-relevant",
    "name": "workspace-name", 
    "confidence": 75
  },
  "aiInsights": {
    "reasoning": "Why these choices were made",
    "businessAlignment": "How this aligns with business goals",
    "urgencyFactors": ["factor1", "factor2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "subtasks": [
    {
      "title": "Subtask 1",
      "estimatedMinutes": 30
    }
  ],
  "confidenceLevel": 85
}

Only include suggestedProject if there's a strong match (confidence > 70) with an existing project.
Only include subtasks if the task is complex enough to benefit from breakdown.
Be specific and actionable in all suggestions.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a task management AI that helps users create better, more actionable tasks. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    const enhancement = JSON.parse(content) as TaskEnhancementResponse;

    // Validate and sanitize the response
    return {
      enhancedTitle: enhancement.enhancedTitle || title,
      description: enhancement.description || "",
      category: [
        "client-care",
        "business-development",
        "administrative",
        "content-creation",
        "personal-wellness",
      ].includes(enhancement.category)
        ? enhancement.category
        : "administrative",
      priority: ["low", "medium", "high", "urgent"].includes(enhancement.priority)
        ? enhancement.priority
        : "medium",
      suggestedTags: Array.isArray(enhancement.suggestedTags) ? enhancement.suggestedTags : [],
      estimatedMinutes:
        typeof enhancement.estimatedMinutes === "number" ? enhancement.estimatedMinutes : 60,
      suggestedProject:
        enhancement.suggestedProject?.confidence > 70 ? enhancement.suggestedProject : undefined,
      suggestedWorkspace:
        enhancement.suggestedWorkspace?.confidence > 70
          ? enhancement.suggestedWorkspace
          : undefined,
      aiInsights: enhancement.aiInsights || {
        reasoning: "Task enhanced with standard improvements",
        businessAlignment: "Standard task alignment",
        urgencyFactors: [],
        suggestions: [],
      },
      subtasks: Array.isArray(enhancement.subtasks) ? enhancement.subtasks : undefined,
      confidenceLevel:
        typeof enhancement.confidenceLevel === "number" ? enhancement.confidenceLevel : 75,
    };
  } catch (error) {
    console.error("Error enhancing task with AI:", error);

    // Fallback response if AI fails
    return {
      enhancedTitle: title,
      description: `Task: ${title}`,
      category: "administrative",
      priority: "medium",
      suggestedTags: [],
      estimatedMinutes: 60,
      aiInsights: {
        reasoning: "AI enhancement unavailable, using defaults",
        businessAlignment: "Standard task",
        urgencyFactors: [],
        suggestions: ["Review and refine task details manually"],
      },
      confidenceLevel: 50,
    };
  }
}

export async function suggestTaskBreakdown(
  title: string,
  description?: string,
): Promise<Array<{ title: string; estimatedMinutes: number }>> {
  try {
    const prompt = `
Break down this task into smaller, actionable subtasks:

Task: ${title}
${description ? `Description: ${description}` : ""}

Provide 3-7 specific, actionable subtasks that would help complete this main task.
Each subtask should be something that can be completed in 15-120 minutes.

Respond with JSON array:
[
  {
    "title": "Specific actionable subtask",
    "estimatedMinutes": 30
  }
]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a task breakdown specialist. Create specific, actionable subtasks. Always respond with valid JSON array.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const subtasks = JSON.parse(content);
    return Array.isArray(subtasks) ? subtasks : [];
  } catch (error) {
    console.error("Error generating subtasks:", error);
    return [];
  }
}

export async function suggestTaskTags(
  title: string,
  description: string,
  existingTags: string[] = [],
): Promise<string[]> {
  try {
    const prompt = `
Suggest 2-5 relevant tags for this task:

Task: ${title}
Description: ${description}

Existing tags in system: ${existingTags.join(", ")}

Provide tags that would help organize and find this task later.
Use existing tags when appropriate, suggest new ones only when needed.
Keep tags concise and meaningful.

Respond with JSON array of strings:
["tag1", "tag2", "tag3"]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a task organization specialist. Suggest relevant, useful tags. Always respond with valid JSON array.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const tags = JSON.parse(content);
    return Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string") : [];
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return [];
  }
}
