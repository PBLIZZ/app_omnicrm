# AI Tool System - Complete Implementation Guide

**Last Updated:** October 28th 2025
**Status:** Production Ready (83/140 tools built)
**For:** Developers and AI agents building tools

---

## Part 1: Quick Start (5 Minutes)

### What Is This System?

The AI Tool System is infrastructure that allows LLMs (GPT-4, Claude, etc.) to interact with the OmniPotency CRM through **typed, permission-controlled, observable functions** instead of ad-hoc prompts.

**Before:** "AI, please get Sarah's contact info" → unpredictable prompts, no logging
**After:** AI calls `get_contact({ contact_id: "123" })` → typed, logged, rate-limited

### Initialize Tools (at app startup)

```typescript
import { initializeTools } from "@/server/ai/tools";

// Call once when app starts
initializeTools();
```

### Execute a Tool

```typescript
import { getToolRegistry } from "@/server/ai/tools";

const registry = getToolRegistry();

const result = await registry.execute(
  "get_contact",
  { contact_id: "uuid-here" },
  {
    userId: "user-id",
    timestamp: new Date(),
    requestId: crypto.randomUUID(),
  },
);

if (result.success) {
  const contact = result.data;
  // Use contact...
}
```

### Give Tools to LLM

```typescript
// Get LLM-compatible function definitions
const functions = registry.getLLMFunctions({
  permissionLevel: "read", // Optional filter
});

// Pass to LLM
const response = await generateText(userId, {
  model: "gpt-4",
  messages: [{ role: "user", content: "Show me Sarah's info" }],
  functions, // LLM can now call tools
});
```

---

## Part 2: Architecture Overview

### Core Components

**1. Type System** (`src/server/ai/tools/types.ts`)

- `ToolDefinition` - Complete metadata (name, description, parameters, permissions, credit cost)
- `ToolHandler` - Function signature for execution
- `ToolExecutionContext` - Runtime context (userId, threadId, timestamp)
- `ToolExecutionResult` - Standardized success/error responses

**2. Tool Registry** (`src/server/ai/tools/registry.ts`)

- Singleton pattern for global tool access
- Tool registration and discovery
- Permission checking (read/write/admin)
- Rate limiting per tool per user
- **Credit cost checking** (integrates with `ai_quotas` table)
- Automatic observability (logs to `tool_invocations` table)

**3. Tool Implementations** (`src/server/ai/tools/implementations/`)

- Organized by domain (contacts, tasks, calendar, etc.)
- Each tool: parameter schema + definition + handler
- Pattern-based for easy replication

### Credit Cost System

**How It Works:**

- Tools declare `creditCost` (default 0 = free)
- Before execution, registry checks `ai_quotas` table
- If tool costs credits and user has insufficient quota → `INSUFFICIENT_CREDITS` error
- On success, credits deducted via `trySpendCredit()` from guardrails
- Usage logged to `ai_usage` table

**Credit Pricing:**

```typescript
creditCost: 0; // Free - CRUD operations, analytics on own data
creditCost: 5; // Low - Simple AI generation, basic research
creditCost: 10; // Medium - Advanced research, external APIs
creditCost: 15; // High - Complex analysis, medical databases
```

**Why Free for CRUD?**

- Database queries cost milliseconds/pennies
- Only LLM API calls (GPT-4, Claude) cost real money
- Research/external APIs cost credits because they call paid services

### Permission Levels

- **read**: Safe read-only operations (get, search, list)
- **write**: Create/update operations (require user consent)
- **admin**: Destructive operations (delete, bulk changes, require explicit approval)

### Rate Limiting

Tools can define per-user rate limits:

```typescript
{
  rateLimit: {
    maxCalls: 50,      // Max calls
    windowMs: 60000,   // Per 60 seconds = 50 calls/minute
  }
}
```

Registry automatically enforces limits.

### Observability

All tool executions logged to `tool_invocations` table:

- Tool name and version
- Parameters (args)
- Result or error
- Latency in milliseconds
- User, thread, message context
- Timestamp

Query tool usage:

```sql
SELECT tool, COUNT(*) as calls, AVG(latency_ms) as avg_latency
FROM tool_invocations
WHERE user_id = $1
GROUP BY tool
ORDER BY calls DESC;
```

---

## Part 3: Complete Tool Catalog

### Status Legend

- ✅ **Built** - Implemented and registered
- ⏳ **Need to Build** - Documented, ready for implementation
- 💰 **Costs Credits** - Non-zero credit cost

**Total Tools:** ~140 tools across 13 domains
**Built:** 83 tools (10 contacts + 15 tasks + 10 calendar + 8 goals/habits + 4 wellness + 6 notes + 12 gmail + 5 research + 5 compliance + 6 communication + 8 semantic search)
**To Build:** 57+ tools

---

### 📋 Contacts Domain (10 tools)

| Tool                     | Status | Permission | Cost | Description                                               |
| ------------------------ | ------ | ---------- | ---- | --------------------------------------------------------- |
| `get_contact`            | ✅     | read       | 0    | Get contact by ID                                         |
| `search_contacts`        | ✅     | read       | 0    | Search by name/email/phone                                |
| `list_contacts`          | ✅     | read       | 0    | List with lifecycle stage filters                         |
| `create_contact`         | ✅     | write      | 0    | Create new contact                                        |
| `update_contact`         | ✅     | write      | 0    | Update contact fields                                     |
| `update_lifecycle_stage` | ✅     | write      | 0    | Move through stages (prospect→new_client→core_client→VIP) |
| `get_referral_sources`   | ✅     | read       | 0    | List all referral sources                                 |
| `add_contact_tag`        | ✅     | write      | 0    | Add tag to contact                                        |
| `remove_contact_tag`     | ✅     | write      | 0    | Remove tag from contact                                   |
| `get_contact_timeline`   | ✅     | read       | 0    | Full interaction history (emails, calls, sessions, notes) |

**Use Cases:**

- "Show me Sarah's contact info" → `get_contact`
- "Find all VIP clients" → `search_contacts` or `list_contacts`
- "Add new client named John" → `create_contact`
- "Move Sarah to core client stage" → `update_lifecycle_stage`

---

### ✅ Tasks & Productivity (15 tools)

| Tool                     | Status | Permission | Cost | Description                           |
| ------------------------ | ------ | ---------- | ---- | ------------------------------------- |
| `get_today_tasks`        | ✅     | read       | 0    | Today's tasks with priority sorting   |
| `create_task`            | ✅     | write      | 0    | Create new task                       |
| `complete_task`          | ✅     | write      | 0    | Mark task done                        |
| `search_tasks`           | ✅     | read       | 0    | Search tasks by query                 |
| `get_overdue_tasks`      | ✅     | read       | 0    | Get past-due tasks                    |
| `update_task`            | ✅     | write      | 0    | Update task fields                    |
| `assign_task_to_zone`    | ✅     | write      | 0    | Move task to different zone           |
| `create_subtask`         | ✅     | write      | 0    | Add subtask under parent task         |
| `update_task_status`     | ✅     | write      | 0    | Update status (todo→in_progress→done) |
| `get_project`            | ✅     | read       | 0    | Get project by ID                     |
| `create_project`         | ✅     | write      | 0    | Create new project                    |
| `list_projects`          | ✅     | read       | 0    | List projects with filters            |
| `assign_task_to_project` | ✅     | write      | 0    | Link task to project                  |
| `get_project_tasks`      | ✅     | read       | 0    | All tasks for a project               |
| `list_zones`             | ✅     | read       | 0    | Get all available zones               |

**Use Cases:**

- "What's on my plate today?" → `get_today_tasks`
- "Create task to call John tomorrow" → `create_task`
- "Show me all tasks for the Q1 wellness project" → `get_project_tasks`

---

### 📅 Calendar & Scheduling (10 tools) ✅ COMPLETE

| Tool                    | Status | Permission | Cost | Description                                          |
| ----------------------- | ------ | ---------- | ---- | ---------------------------------------------------- |
| `get_upcoming_sessions` | ✅     | read       | 0    | Sessions in next N days                              |
| `get_event`             | ✅     | read       | 0    | Get event by ID                                      |
| `create_event`          | ✅     | write      | 0    | Schedule new session/appointment                     |
| `update_event`          | ✅     | write      | 0    | Update event details                                 |
| `delete_event`          | ✅     | admin      | 0    | Cancel event                                         |
| `check_availability`    | ✅     | read       | 0    | Find free time slots                                 |
| `add_event_attendee`    | ✅     | write      | 0    | Add attendee to event                                |
| `remove_event_attendee` | ✅     | write      | 0    | Remove attendee                                      |
| `get_session_prep`      | ✅     | read       | 0    | Context for upcoming session (contact, notes, tasks) |
| `search_events`         | ✅     | read       | 0    | Search by date range, attendee, type                 |

**Use Cases:**

- "When is my next session with Sarah?" → `get_upcoming_sessions`
- "Schedule follow-up with John next Tuesday at 2pm" → `create_event`
- "Do I have any free time Thursday afternoon?" → `check_availability`
- "Prepare me for tomorrow's session with Lisa" → `get_session_prep`

---

### 📧 Gmail Integration (12 tools) ✅ COMPLETE

| Tool                         | Status | Permission | Cost | Description                                   |
| ---------------------------- | ------ | ---------- | ---- | --------------------------------------------- |
| **Reading & Search**         |        |            |      |                                               |
| `get_email`                  | ✅     | read       | 0    | Get email by ID                               |
| `search_emails`              | ✅     | read       | 0    | Search by sender, subject, date range         |
| `list_email_threads`         | ✅     | read       | 0    | Get conversation threads                      |
| `get_emails_by_contact`      | ✅     | read       | 0    | All emails for specific contact               |
| **Grouping & Analysis**      |        |            |      |                                               |
| `group_emails_by_sender`     | ✅     | read       | 0    | Group by sender for bulk actions              |
| `group_emails_by_topic`      | ✅     | read       | 0    | AI categorization by topic                    |
| `categorize_email`           | ✅     | read       | 0    | Classify as marketing/wellness/business/other |
| **Digest Generation**        |        |            |      |                                               |
| `generate_marketing_digest`  | ✅ 💰  | read       | 5    | Weekly summary of marketing emails            |
| `generate_wellness_digest`   | ✅ 💰  | read       | 5    | Weekly wellness content summary               |
| `generate_business_digest`   | ✅ 💰  | read       | 5    | Business best practices summary               |
| `generate_general_digest`    | ✅ 💰  | read       | 5    | Summary of all other emails                   |
| `generate_weekly_digest_all` | ✅ 💰  | read       | 10   | Combined weekly digest (all categories)       |

**Use Cases:**

- "Show me all emails from Sarah" → `get_emails_by_contact`
- "Categorize this week's emails" → `group_emails_by_topic`
- "Create my weekly wellness digest" → `generate_wellness_digest` (costs 5 credits)

**Note:** Digest tools cost credits because they use LLM to summarize content.

---

### 📝 Notes Domain (6 tools) ✅ COMPLETE

| Tool                      | Status | Permission | Cost | Description                                    |
| ------------------------- | ------ | ---------- | ---- | ---------------------------------------------- |
| `search_notes`            | ✅     | read       | 0    | Search note content by keyword/contact/date    |
| `get_note`                | ✅     | read       | 0    | Get specific note by ID                        |
| `analyze_note_sentiment`  | ✅     | read       | 0    | Sentiment analysis (positive/neutral/negative) |
| `tag_note`                | ✅     | write      | 0    | Add tags to existing note                      |
| `summarize_notes`         | ✅     | read       | 0    | Summarize multiple notes for contact           |
| `rank_notes_by_relevance` | ✅     | read       | 0    | Sort notes by relevance to query               |

**⚠️ CRITICAL CONSTRAINT:**
AI can ONLY **read and analyze** notes. AI **CANNOT create** notes - only humans can create notes in the `notes` table.

**Use Cases:**

- "Search Sarah's session notes for 'anxiety'" → `search_notes`
- "What's the sentiment of my recent notes about John?" → `analyze_note_sentiment`
- "Summarize all notes for contact ABC" → `summarize_notes`

---

### 🎯 Goals & Habits (8 tools) ✅ COMPLETE

| Tool                     | Status | Permission | Cost | Description                           |
| ------------------------ | ------ | ---------- | ---- | ------------------------------------- |
| **Goals**                |        |            |      |                                       |
| `get_goal`               | ✅     | read       | 0    | Get goal by ID                        |
| `list_goals`             | ✅     | read       | 0    | List goals by type/contact/status     |
| `update_goal_progress`   | ✅     | write      | 0    | Update progress value and notes       |
| `analyze_goal_progress`  | ✅     | read       | 0    | AI analysis of goal trajectory        |
| **Habits**               |        |            |      |                                       |
| `log_habit`              | ✅     | write      | 0    | Log habit completion for a date       |
| `get_habit_streak`       | ✅     | read       | 0    | Calculate current streak              |
| `analyze_habit_patterns` | ✅     | read       | 0    | AI pattern recognition                |
| `get_habit_analytics`    | ✅     | read       | 0    | Completion rate, trends, correlations |

**Use Cases:**

- "Log that I completed my meditation today" → `log_habit`
- "What's my current yoga streak?" → `get_habit_streak`
- "Analyze my sleep patterns this month" → `analyze_habit_patterns`
- "How am I progressing on my weight loss goal?" → `analyze_goal_progress`

---

### 😊 Mood & Wellness Tracking (4 tools) ✅ COMPLETE

| Tool                    | Status | Permission | Cost | Description                               |
| ----------------------- | ------ | ---------- | ---- | ----------------------------------------- |
| `log_mood`              | ✅     | write      | 0    | Log daily mood/energy (daily_pulse_logs)  |
| `get_mood_trends`       | ✅     | read       | 0    | Analyze mood over time                    |
| `correlate_mood_habits` | ✅     | read       | 0    | Find correlations between mood and habits |
| `get_wellness_score`    | ✅     | read       | 0    | Overall wellness composite score          |

**Use Cases:**

- "Log my mood as energized and happy today" → `log_mood`
- "How has my mood been this month?" → `get_mood_trends`
- "Is there a connection between my yoga and mood?" → `correlate_mood_habits`

---

### 🔒 Compliance & Consent (5 tools) ✅ COMPLETE

| Tool                        | Status | Permission | Cost | Description                         |
| --------------------------- | ------ | ---------- | ---- | ----------------------------------- |
| `get_consent_status`        | ✅     | read       | 0    | Check consent status for contact    |
| `list_missing_consents`     | ✅     | read       | 0    | Contacts missing required consents  |
| `get_consent_history`       | ✅     | read       | 0    | Full consent audit trail            |
| `generate_consent_reminder` | ✅     | write      | 0    | Create task to get consent          |
| `check_hipaa_compliance`    | ✅     | read       | 0    | Verify HIPAA compliance for contact |

**Use Cases:**

- "Does Sarah have signed HIPAA consent?" → `get_consent_status`
- "Which clients are missing photography consent?" → `list_missing_consents`
- "Create reminder to get consent from John" → `generate_consent_reminder`

---

### 💬 Chat & Semantic Search (8 tools) ✅ COMPLETE

| Tool                          | Status | Permission | Cost | Description                                                |
| ----------------------------- | ------ | ---------- | ---- | ---------------------------------------------------------- |
| **Context-Aware Chat**        |        |            |      |                                                            |
| `search_conversation_history` | ✅     | read       | 0    | Search past chat messages                                  |
| `get_thread_summary`          | ✅     | read       | 0    | Summarize chat thread                                      |
| `semantic_search_all`         | ✅     | read       | 0    | Search across ALL content (contacts, notes, emails, tasks) |
| `find_similar_contacts`       | ✅     | read       | 0    | Find contacts with similar patterns                        |
| `find_related_content`        | ✅     | read       | 0    | Content related to current conversation                    |
| **Embeddings Management**     |        |            |      |                                                            |
| `generate_embeddings`         | ✅ 💰  | write      | 5    | Create embeddings for content                              |
| `update_embeddings`           | ✅     | write      | 0    | Refresh outdated embeddings                                |
| `search_by_embedding`         | ✅     | read       | 0    | Semantic similarity search                                 |

**Use Cases:**

- "Find all content related to stress management" → `semantic_search_all`
- "What did we discuss about Sarah last week?" → `search_conversation_history`
- "Find clients similar to John's engagement pattern" → `find_similar_contacts`

**Why Build These?**
These tools make AI context-aware by giving it memory and semantic understanding.

---

### 📊 Analytics & Insights (10 tools)

| Tool                          | Status | Permission | Cost | Description                   |
| ----------------------------- | ------ | ---------- | ---- | ----------------------------- |
| **Client Analytics**          |        |            |      |                               |
| `analyze_client_engagement`   | ⏳     | read       | 0    | Engagement score and patterns |
| `detect_churn_risk`           | ⏳     | read       | 0    | Churn prediction model        |
| `generate_client_insights`    | ⏳ 💰  | read       | 5    | AI-generated insights         |
| `analyze_session_outcomes`    | ⏳     | read       | 0    | Progress analysis             |
| **Practice Analytics**        |        |            |      |                               |
| `generate_practice_dashboard` | ⏳     | read       | 0    | Business overview             |
| `analyze_revenue_trends`      | ⏳     | read       | 0    | Revenue insights              |
| `get_referral_analytics`      | ⏳     | read       | 0    | Referral source performance   |
| `analyze_retention_rate`      | ⏳     | read       | 0    | Client retention metrics      |
| `generate_monthly_report`     | ⏳ 💰  | read       | 10   | Comprehensive monthly report  |
| `forecast_business_metrics`   | ⏳ 💰  | read       | 15   | Predictive analytics          |

**Use Cases:**

- "Which clients are at risk of churning?" → `detect_churn_risk`
- "Generate insights about Sarah's progress" → `generate_client_insights` (costs 5 credits)
- "Show me my practice dashboard" → `generate_practice_dashboard`
- "Forecast next quarter's revenue" → `forecast_business_metrics` (costs 15 credits)

---

### 📤 Communication (6 tools) ✅ COMPLETE

| Tool                    | Status | Permission | Cost | Description                             |
| ----------------------- | ------ | ---------- | ---- | --------------------------------------- |
| `send_email`            | ✅ 💰  | write      | 5    | Send email to contact (if AI writes it) |
| `send_notification`     | ✅     | write      | 0    | In-app notification                     |
| `send_sms`              | ✅ 💰  | write      | 5    | Send SMS message                        |
| `schedule_reminder`     | ✅     | write      | 0    | Schedule automated reminder             |
| `send_session_reminder` | ✅     | write      | 0    | Send pre-session reminder               |
| `create_email_template` | ✅ 💰  | write      | 5    | Generate email template with AI         |

**Use Cases:**

- "Send appointment reminder to Sarah" → `send_session_reminder`
- "Create a welcome email template" → `create_email_template` (costs 5 credits)
- "Notify user about task completion" → `send_notification`

**Note:** Email/SMS cost credits when AI generates the content.

---

### 📚 Research & Knowledge (5 tools) ✅ COMPLETE

| Tool                            | Status | Permission | Cost | Description                        |
| ------------------------------- | ------ | ---------- | ---- | ---------------------------------- |
| `search_wellness_knowledge`     | ✅ 💰  | read       | 5    | Search wellness knowledge base     |
| `get_protocol_suggestions`      | ✅ 💰  | read       | 10   | Treatment protocol recommendations |
| `search_medical_research`       | ✅ 💰  | read       | 15   | Search medical databases           |
| `get_contraindications`         | ✅ 💰  | read       | 10   | Check treatment contraindications  |
| `find_evidence_based_resources` | ✅ 💰  | read       | 15   | Research papers for condition      |

**Use Cases:**

- "Find wellness protocols for anxiety" → `get_protocol_suggestions` (costs 10 credits)
- "Search latest research on meditation benefits" → `search_medical_research` (costs 15 credits)

**Why Credits?**
These tools call external paid APIs (PubMed, medical databases, knowledge bases).

---

### 🤖 Workflow Automation (8 tools)

| Tool                          | Status | Permission | Cost   | Description                          |
| ----------------------------- | ------ | ---------- | ------ | ------------------------------------ |
| `trigger_onboarding_workflow` | ⏳     | write      | 0      | Start client onboarding sequence     |
| `trigger_followup_workflow`   | ⏳     | write      | 0      | Automated follow-up sequence         |
| `apply_workflow_template`     | ⏳     | write      | 0      | Apply predefined workflow            |
| `bulk_update_contacts`        | ⏳     | admin      | 0      | Batch update multiple contacts       |
| `bulk_tag_contacts`           | ⏳     | write      | 0      | Add tags to multiple contacts        |
| `bulk_send_email`             | ⏳ 💰  | admin      | varies | Mass email (costs credits per email) |
| `export_data`                 | ⏳     | read       | 0      | Export contact/task data             |
| `generate_backup`             | ⏳     | admin      | 0      | Create data backup                   |

**Use Cases:**

- "Start onboarding workflow for new client Sarah" → `trigger_onboarding_workflow`
- "Tag all VIP clients with 'premium-tier'" → `bulk_tag_contacts`
- "Export all contacts to CSV" → `export_data`

---

## Part 4: Building Tools - Agent Instructions

### The Pattern (Copy-Paste Ready)

Every tool follows this exact pattern. Copy this and modify for your tool.

#### Step 1: Create Parameter Schema (with Zod)

```typescript
import { z } from "zod";

const YourToolParamsSchema = z.object({
  param_name: z.string().uuid(), // UUID validation
  optional_param: z.string().optional(), // Optional field
  number_param: z.number().int().positive(), // Integer > 0
  enum_param: z.enum(["option1", "option2"]).default("option1"),
});

type YourToolParams = z.infer<typeof YourToolParamsSchema>;
```

#### Step 2: Create Tool Definition

```typescript
import type { ToolDefinition } from "../types";

export const yourToolDefinition: ToolDefinition = {
  // Identity
  name: "your_tool_name", // snake_case, descriptive
  category: "data_access", // or data_mutation, communication, analytics, automation, external
  version: "1.0.0",

  // Documentation (IMPORTANT - helps LLM decide when to use this)
  description: "One-sentence description of what this tool does",
  useCases: ["When user asks 'do X'", "When user wants to accomplish Y", "When preparing for Z"],
  exampleCalls: [
    'your_tool_name({"param": "value"})',
    'User: "Do something" → LLM calls your_tool_name',
  ],

  // Parameters (JSON Schema format for LLM)
  parameters: {
    type: "object",
    properties: {
      param_name: {
        type: "string",
        description: "Clear description of this parameter",
      },
      optional_param: {
        type: "string",
        description: "Optional parameter description",
      },
    },
    required: ["param_name"], // List required params
  },

  // Security & Performance
  permissionLevel: "read", // or 'write' or 'admin'
  creditCost: 0, // 0 for free, 5-15 for paid operations
  isIdempotent: true, // true if safe to call multiple times with same params
  cacheable: true, // true for read operations
  cacheTtlSeconds: 300, // cache for 5 minutes (optional)

  // Rate limiting (optional, for write operations)
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 calls per minute
  },

  // Metadata
  tags: ["domain", "operation-type", "feature"],
  deprecated: false,
};
```

#### Step 3: Implement Handler

```typescript
import type { ToolHandler } from "../types";
import { getDb } from "@/server/db/client";
import { createYourRepository } from "@/packages/repo/src/your.repo";
import { AppError } from "@/lib/errors";

export const yourToolHandler: ToolHandler<YourToolParams> = async (params, context) => {
  // 1. Validate parameters with Zod
  const validated = YourToolParamsSchema.parse(params);

  // 2. Get database connection
  const db = await getDb();
  const repo = createYourRepository(db);

  // 3. Call repository method with user scoping
  const result = await repo.yourMethod(context.userId, validated.param_name);

  // 4. Handle not found
  if (!result) {
    throw new AppError(
      `Resource with ID ${validated.param_name} not found`,
      "RESOURCE_NOT_FOUND",
      "not_found",
      true,
      404,
    );
  }

  // 5. Return result (will be automatically wrapped in success response)
  return result;
};
```

#### Step 4: Export from Implementation File

```typescript
// In src/server/ai/tools/implementations/your-domain.ts
export { yourToolDefinition, yourToolHandler };
```

#### Step 5: Register in Index

```typescript
// In src/server/ai/tools/index.ts
import { yourToolDefinition, yourToolHandler } from "./implementations/your-domain";

export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // ... existing registrations ...

  // Your domain tools
  registry.register(yourToolDefinition, yourToolHandler);

  return registry;
}
```

#### Step 6: Test It

```typescript
import { getToolRegistry } from "@/server/ai/tools";

describe("your_tool_name", () => {
  it("should execute successfully", async () => {
    const registry = getToolRegistry();

    const result = await registry.execute(
      "your_tool_name",
      { param_name: "test-value" },
      {
        userId: "test-user-id",
        timestamp: new Date(),
        requestId: "test-request-id",
      },
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

### Common Patterns

**Read Operation (Free):**

```typescript
{
  category: 'data_access',
  permissionLevel: 'read',
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
}
```

**Write Operation (Free, Rate Limited):**

```typescript
{
  category: 'data_mutation',
  permissionLevel: 'write',
  creditCost: 0,
  isIdempotent: false,
  rateLimit: { maxCalls: 50, windowMs: 60000 },
}
```

**Research Operation (Costs Credits):**

```typescript
{
  category: 'external',
  permissionLevel: 'read',
  creditCost: 10,  // Costs 10 credits
  isIdempotent: true,
}
```

**Admin Operation (Destructive):**

```typescript
{
  category: 'data_mutation',
  permissionLevel: 'admin',
  creditCost: 0,
  isIdempotent: true, // Safe to retry
  // NO rate limit - too dangerous for bulk use
}
```

---

## Part 5: What's Left to Do

### Current Status (October 28, 2025)

Total Progress: 83/140 Tools (59% Complete)

| Domain                    | Tools | Built | To Build | Status      | Priority | Complexity |
| ------------------------- | ----- | ----- | -------- | ----------- | -------- | ---------- |
| **Contacts**              | 10    | 10    | 0        | Complete ✅ | -        | -          |
| **Tasks & Productivity**  | 15    | 15    | 0        | Complete ✅ | -        | -          |
| **Gmail Integration**     | 12    | 12    | 0        | Complete ✅ | -        | -          |
| **Calendar & Scheduling** | 10    | 10    | 0        | Complete ✅ | -        | -          |
| **Goals & Habits**        | 8     | 8     | 0        | Complete ✅ | -        | -          |
| **Mood & Wellness**       | 4     | 4     | 0        | Complete ✅ | -        | -          |
| **Notes**                 | 6     | 6     | 0        | Complete ✅ | -        | -          |
| **Compliance & Consent**  | 5     | 5     | 0        | Complete ✅ | -        | -          |
| **Research & Knowledge**  | 5     | 5     | 0        | Complete ✅ | -        | -          |
| **Communication**         | 6     | 6     | 0        | Complete ✅ | -        | -          |
| **Chat & Semantic**       | 8     | 8     | 0        | Complete ✅ | -        | -          |
| **Analytics & Insights**  | 10    | 0     | 10       | Not Started | HIGH     | Medium     |
| **Workflow Automation**   | 8     | 0     | 8        | Not Started | MEDIUM   | Medium     |

---

### ✅ Priority 1: COMPLETE - All 11 Core Domains Built (83 tools)

All 11 core domains are now complete:

- ✅ Contacts (10 tools)
- ✅ Tasks & Productivity (15 tools)
- ✅ Gmail Integration (12 tools)
- ✅ Calendar & Scheduling (10 tools)
- ✅ Goals & Habits (8 tools)
- ✅ Mood & Wellness (4 tools)
- ✅ Notes (6 tools)
- ✅ Compliance & Consent (5 tools)
- ✅ Research & Knowledge (5 tools)
- ✅ Communication (6 tools)
- ✅ Chat & Semantic Search (8 tools)

---

### Priority 2: Remaining Domains (18 tools)

#### 🔴 Analytics & Insights Domain (10 tools)

**Why Build:** Business intelligence and churn prediction are high-value features

**Client Analytics (4 tools):**

1. `analyze_client_engagement` - Engagement score and patterns
2. `detect_churn_risk` - Churn prediction model
3. `generate_client_insights` - AI-generated insights (5 credits) 💰
4. `analyze_session_outcomes` - Progress analysis

**Practice Analytics (6 tools):**
5. `generate_practice_dashboard` - Business overview
6. `analyze_revenue_trends` - Revenue insights
7. `get_referral_analytics` - Referral source performance
8. `analyze_retention_rate` - Client retention metrics
9. `generate_monthly_report` - Comprehensive monthly report (10 credits) 💰
10. `forecast_business_metrics` - Predictive analytics (15 credits) 💰

**Files:** `src/server/ai/tools/implementations/analytics.ts` (NEW)
**Estimated Time:** 8-10 hours
**Complexity:** Medium (data aggregation, some AI analysis)

---

#### 🟡 Workflow Automation Domain (8 tools)

**Why Build:** Automation saves significant time, enables scalability

**Tools to Build:**

1. `trigger_onboarding_workflow` - Start client onboarding sequence
2. `trigger_followup_workflow` - Automated follow-up sequence
3. `apply_workflow_template` - Apply predefined workflow
4. `bulk_update_contacts` - Batch update multiple contacts (admin)
5. `bulk_tag_contacts` - Add tags to multiple contacts
6. `bulk_send_email` - Mass email (admin, varies by count) 💰
7. `export_data` - Export contact/task data
8. `generate_backup` - Create data backup (admin)

**Files:** `src/server/ai/tools/implementations/workflows.ts` (NEW)
**Estimated Time:** 6-8 hours
**Complexity:** Medium (multi-step operations)

---

### Implementation Roadmap

#### ✅ Phase 1: COMPLETE - Core Domains (Weeks 1-2)

**Goal:** Build all core CRM functionality

**Completed:** 83 tools across 11 domains

- ✅ Contacts (10 tools)
- ✅ Tasks & Productivity (15 tools)
- ✅ Gmail Integration (12 tools)
- ✅ Calendar & Scheduling (10 tools)
- ✅ Goals & Habits (8 tools)
- ✅ Mood & Wellness (4 tools)
- ✅ Notes (6 tools)
- ✅ Compliance & Consent (5 tools)
- ✅ Research & Knowledge (5 tools)
- ✅ Communication (6 tools)
- ✅ Chat & Semantic Search (8 tools)

**Result:** 83/140 total (59% complete)

---

#### Phase 2: Analytics & Insights (Week 3)

**Goal:** Add business intelligence and analytics

- **Week 3:** Analytics & Insights (10 tools)

**Deliverable:** 10 new tools → 93/140 total (66% complete)

---

#### Phase 3: Automation & Polish (Week 4)

**Goal:** Workflow automation and final polish

- **Week 4:** Workflow Automation (8 tools)

**Deliverable:** 8 new tools → 101/140 total (72% complete)

---

### Agent Assignment Guide

**Each agent should:**

1. Pick one domain from Priority 1 (highest value)
2. Create or update `implementations/[domain].ts` file
3. Build ALL remaining tools for that domain (follow pattern in Part 4)
4. Update `index.ts` to register new tools
5. Add tests for each tool
6. Submit PR with format: `feat(ai-tools): complete [domain] tools`
7. Pick next domain

**Complexity Levels:**

- **Simple:** Basic CRUD operations, straightforward patterns
- **Medium:** Requires business logic, multiple steps, or external integrations
- **Complex:** Advanced features like semantic search, AI analysis, or multi-step workflows

**Key Dependencies:**

- **Chat & Semantic** requires embeddings generation service
- **Analytics** may need additional revenue tracking schema
- **Workflows** needs workflow template definitions
- Most other domains are independent

---

## Part 6: Workflows & Advanced Patterns

### Intelligent Inbox Processing Workflow

**Existing Feature** (implemented in `src/server/ai/connect/intelligent-inbox-processor.ts`)

When user dumps multiple tasks into inbox:

1. AI calls `processIntelligentInboxItem()` internally
2. Splits text into individual tasks
3. Categorizes by zones
4. Detects hierarchies (parent/child tasks)
5. Presents for approval
6. On approval, creates actual tasks via `create_task` tool

**Tool Chain Example:**

```bash
User: "Call John, finish report, book dentist"
  ↓
AI: processIntelligentInboxItem(text)
  ↓
AI: create_task({title: "Call John", ...})
AI: create_task({title: "Finish report", ...})
AI: create_task({title: "Book dentist", ...})
```

### Multi-Step Tool Chaining

**Example: Client Onboarding** below

```typescript
// Step 1: Create contact
const contact = await registry.execute(
  "create_contact",
  {
    display_name: "New Client",
    primary_email: "client@example.com",
  },
  context,
);

// Step 2: Create onboarding task
await registry.execute(
  "create_task",
  {
    title: "Complete client intake",
    contact_id: contact.data.id,
    priority: "high",
  },
  context,
);

// Step 3: Send welcome email
await registry.execute(
  "send_email",
  {
    to: contact.data.primary_email,
    template: "welcome",
  },
  context,
);
```

### Error Handling

```typescript
const result = await registry.execute("tool_name", params, context);

if (!result.success) {
  if (result.error?.code === "INSUFFICIENT_CREDITS") {
    // Handle quota exceeded
  } else if (result.error?.code === "RATE_LIMIT_EXCEEDED") {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

### Tool Composition (Future)

Eventually tools can call other tools:

```typescript
export const sessionPrepHandler: ToolHandler = async (params, context) => {
  // Get contact
  const contact = await context.callTool('get_contact', {...});

  // Get recent notes
  const notes = await context.callTool('search_notes', {...});

  // Get upcoming tasks
  const tasks = await context.callTool('search_tasks', {...});

  return { contact, notes, tasks };
};
```

---

## Appendix: Quick Reference

### Tool Status Tracking

Query built vs planned tools:

```typescript
import { getToolRegistry } from "@/server/ai/tools";

const registry = getToolRegistry();
const stats = registry.getStats();

console.log(`Total tools: ${stats.totalTools}`);
console.log("By category:", stats.toolsByCategory);
console.log("By permission:", stats.toolsByPermission);
```

### Credit Cost Summary

| Category             | Cost   | Examples                               |
| -------------------- | ------ | -------------------------------------- |
| CRUD Operations      | 0      | get_contact, create_task, search_notes |
| Internal Analytics   | 0      | analyze_engagement, detect_churn_risk  |
| Simple AI Generation | 5      | generate_digest, generate_insights     |
| External Research    | 10-15  | search_medical_research, get_protocols |
| Bulk Communications  | varies | bulk_send_email (credits per email)    |

### Database Tables Used

- **`tool_invocations`** - All tool executions (observability)
- **`ai_quotas`** - Monthly credit quotas per user
- **`ai_usage`** - Credit usage logging
- **`threads`** - Chat conversation threads
- **`messages`** - Chat messages

### Key Files

- `src/server/ai/tools/types.ts` - Type definitions
- `src/server/ai/tools/registry.ts` - Tool registry
- `src/server/ai/tools/index.ts` - Registration
- `src/server/ai/tools/implementations/*.ts` - Tool implementations
- `src/server/ai/guardrails.ts` - Credit checking functions

---

## Summary

**What You Get:**

- ✅ 83 tools built and working across 11 complete domains
- ✅ 18 tools remaining (Analytics + Workflow Automation)
- ✅ Clear pattern for rapid implementation
- ✅ Credit cost system integrated
- ✅ Permission and rate limiting
- ✅ Complete observability
- ✅ Agent-ready for parallel development

**Completed Domains (11/13):**

1. ✅ Contacts (10 tools)
2. ✅ Tasks & Productivity (15 tools)
3. ✅ Gmail Integration (12 tools)
4. ✅ Calendar & Scheduling (10 tools)
5. ✅ Goals & Habits (8 tools)
6. ✅ Mood & Wellness (4 tools)
7. ✅ Notes (6 tools)
8. ✅ Compliance & Consent (5 tools)
9. ✅ Research & Knowledge (5 tools)
10. ✅ Communication (6 tools)
11. ✅ Chat & Semantic Search (8 tools)

**Remaining Domains:**

- Analytics & Insights (10 tools)
- Workflow Automation (8 tools)

**Next Steps:**

1. Build Analytics & Insights domain (10 tools)
2. Build Workflow Automation domain (8 tools)
3. Final testing and polish
4. Deploy to production

**Result:** 101 production-ready AI tools enabling sophisticated AI-powered workflows for wellness CRM.
