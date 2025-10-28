# AI Tools Directory

This directory contains the AI tool-calling infrastructure for OmniPotency CRM.

**📖 For complete implementation guide, see `/docs/AI_TOOL_SYSTEM.md`**

**For Agents:** Pick a domain from Part 5 of the master guide and build all tools for that domain.

## Directory Structure

```bash
src/server/ai/tools/
├── README.md                          # This file
├── types.ts                           # TypeScript types and Zod schemas
├── registry.ts                        # Tool registry singleton
├── index.ts                           # Central exports and initialization
├── implementations/                   # Tool implementations by domain
│   ├── contacts.ts                    # Contact management tools
│   ├── tasks.ts                       # Task & productivity tools
│   ├── calendar.ts                    # Calendar & scheduling tools
│   ├── goals-habits.ts                # Goals & habits tracking
│   ├── wellness.ts                    # Mood & wellness tools
│   └── notes.ts                       # Notes analysis (READ-ONLY)
└── examples/                          # Example integrations
    └── chat-integration.example.ts    # Chat endpoint examples
```

## Quick Start

### 1. Initialize Tools (at app startup)

```typescript
import { initializeTools } from '@/server/ai/tools';

// Call once when app starts
initializeTools();
```

### 2. Use Tools in Code

```typescript
import { getToolRegistry } from '@/server/ai/tools';

const registry = getToolRegistry();

// Execute a tool
const result = await registry.execute('get_contact',
  { contact_id: 'uuid' },
  {
    userId: 'user-id',
    timestamp: new Date(),
    requestId: crypto.randomUUID(),
  }
);
```

### 3. Give Tools to LLM

```typescript
// Get LLM-compatible function definitions
const functions = registry.getLLMFunctions({
  permissionLevel: 'read'  // Optional filter
});

// Pass to LLM
const response = await llm.chat({
  messages: [...],
  functions,
});
```

## Available Tools

**Status: 83/140 tools built (59% complete)** For complete tool catalog with credit costs, see `/docs/AI_TOOL_SYSTEM.md` Part 3.

### ✅ Built (83 tools across 11 domains)

**Contact Management** (`implementations/contacts.ts`) - 10 tools ✅ COMPLETE

- `get_contact` - Get contact by ID
- `search_contacts` - Search contacts
- `list_contacts` - List with filters
- `create_contact` - Create contact
- `update_contact` - Update contact
- `update_lifecycle_stage` - Move through lifecycle stages
- `get_referral_sources` - List all referral sources
- `add_contact_tag` - Add tag to contact
- `remove_contact_tag` - Remove tag from contact
- `get_contact_timeline` - Full interaction history

**Task & Productivity** (`implementations/tasks.ts`) - 15 tools ✅ COMPLETE

- `get_today_tasks` - Today's tasks
- `create_task` - Create task
- `complete_task` - Mark done
- `search_tasks` - Search tasks
- `get_overdue_tasks` - Get overdue
- `update_task` - Update task fields
- `assign_task_to_zone` - Move task to zone
- `create_subtask` - Add subtask
- `update_task_status` - Update status
- `get_project` - Get project by ID
- `create_project` - Create new project
- `list_projects` - List projects with filters
- `assign_task_to_project` - Link task to project
- `get_project_tasks` - Get all project tasks
- `list_zones` - Get all available zones

**Calendar & Scheduling** (`implementations/calendar.ts`) - 10 tools ✅ COMPLETE

- `get_upcoming_sessions` - Sessions in next N days
- `get_event` - Get event by ID
- `create_event` - Schedule new session/appointment
- `update_event` - Update event details
- `delete_event` - Cancel event (admin)
- `check_availability` - Find free time slots
- `add_event_attendee` - Add attendee to event
- `remove_event_attendee` - Remove attendee
- `get_session_prep` - Context for upcoming session
- `search_events` - Search by date range, attendee, type

**Goals & Habits** (`implementations/goals-habits.ts`) - 8 tools ✅ COMPLETE

- `get_goal` - Get goal by ID
- `list_goals` - List goals by type/contact/status
- `update_goal_progress` - Update progress value and notes
- `analyze_goal_progress` - AI analysis of goal trajectory
- `log_habit` - Log habit completion for a date
- `get_habit_streak` - Calculate current streak
- `analyze_habit_patterns` - AI pattern recognition
- `get_habit_analytics` - Completion rate, trends, correlations

**Mood & Wellness** (`implementations/wellness.ts`) - 4 tools ✅ COMPLETE

- `log_mood` - Log daily mood/energy (daily_pulse_logs)
- `get_mood_trends` - Analyze mood over time
- `correlate_mood_habits` - Find correlations between mood and habits
- `get_wellness_score` - Overall wellness composite score

**Notes** (`implementations/notes.ts`) - 6 tools ✅ COMPLETE

- `search_notes` - Search note content by keyword/contact/date
- `get_note` - Get specific note by ID
- `analyze_note_sentiment` - Sentiment analysis (positive/neutral/negative)
- `tag_note` - Add tags to existing note
- `summarize_notes` - Summarize multiple notes for contact
- `rank_notes_by_relevance` - Sort notes by relevance to query

**Gmail Integration** (`implementations/gmail.ts`) - 12 tools ✅ COMPLETE

- `get_email` - Get email by ID
- `search_emails` - Search by sender, subject, date range
- `list_email_threads` - Get conversation threads
- `get_emails_by_contact` - All emails for specific contact
- `group_emails_by_sender` - Group by sender for bulk actions
- `group_emails_by_topic` - AI categorization by topic
- `categorize_email` - Classify as marketing/wellness/business/other
- `generate_marketing_digest` - Weekly marketing email summary (5 credits) 💰
- `generate_wellness_digest` - Weekly wellness email summary (5 credits) 💰
- `generate_business_digest` - Weekly business email summary (5 credits) 💰
- `generate_general_digest` - Weekly general email summary (5 credits) 💰
- `generate_weekly_digest_all` - Combined weekly digest (10 credits) 💰

**Compliance & Consent** (`implementations/compliance.ts`) - 5 tools ✅ COMPLETE

- `get_consent_status` - Check consent status for contact
- `list_missing_consents` - Contacts missing required consents
- `get_consent_history` - Full consent audit trail
- `generate_consent_reminder` - Create task to get consent
- `check_hipaa_compliance` - Verify HIPAA compliance for contact

**Research & Knowledge** (`implementations/research.ts`) - 5 tools ✅ COMPLETE (ALL PAID)

- `search_wellness_knowledge` - Search wellness knowledge base (5 credits) 💰
- `get_protocol_suggestions` - Treatment protocol recommendations (10 credits) 💰
- `search_medical_research` - Search medical databases (15 credits) 💰
- `get_contraindications` - Check treatment contraindications (10 credits) 💰
- `find_evidence_based_resources` - Research papers for condition (15 credits) 💰

**Communication** (`implementations/communication.ts`) - 6 tools ✅ COMPLETE

- `send_email` - Send email to contact (5 credits) 💰
- `send_notification` - In-app notification (free)
- `send_sms` - Send SMS message (5 credits) 💰
- `schedule_reminder` - Schedule automated reminder (free)
- `send_session_reminder` - Send pre-session reminder (free)
- `create_email_template` - Generate email template with AI (5 credits) 💰

**Chat & Semantic Search** (`implementations/semantic-search.ts`) - 8 tools ✅ COMPLETE

- `search_conversation_history` - Search past chat messages
- `get_thread_summary` - Summarize chat thread
- `semantic_search_all` - Search across ALL content (contacts, notes, emails, tasks)
- `find_similar_contacts` - Find contacts with similar patterns
- `find_related_content` - Content related to current conversation
- `generate_embeddings` - Create embeddings for content (5 credits) 💰
- `update_embeddings` - Refresh outdated embeddings
- `search_by_embedding` - Semantic similarity search

### ⏳ Ready to Build (18 tools across 2 domains)

See `/docs/AI_TOOL_SYSTEM.md` Part 3 for complete catalog including:

- Analytics & Insights (10 tools, 3 cost credits)
- Workflow Automation (8 tools, 1 costs credits)

## Creating a New Tool

### Step 1: Define in Implementation File

```typescript
// src/server/ai/tools/implementations/notes.ts

import type { ToolDefinition, ToolHandler } from '../types';
import { z } from 'zod';

// Parameter schema
const SearchNotesParamsSchema = z.object({
  contact_id: z.string().uuid().optional(),
  keyword: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

type SearchNotesParams = z.infer<typeof SearchNotesParamsSchema>;

// Tool definition
export const searchNotesDefinition: ToolDefinition = {
  name: 'search_notes',
  category: 'data_access',
  version: '1.0.0',
  description: 'Search notes by keyword, contact, or date range',
  useCases: [
    "When user says 'find notes about meditation'",
    "When user asks 'what did I write about Sarah last week?'",
  ],
  parameters: {
    type: 'object',
    properties: {
      contact_id: { type: 'string', description: 'Filter by contact UUID' },
      keyword: { type: 'string', description: 'Search term in note content' },
      date_from: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      limit: { type: 'number', description: 'Max results (1-50, default 10)' },
    },
    required: [],
  },
  permissionLevel: 'read',
  creditCost: 0,  // Free - just a DB query
  isIdempotent: true,
  tags: ['notes', 'search', 'read'],
};

// Handler implementation
export const searchNotesHandler: ToolHandler<SearchNotesParams> = async (params, context) => {
  const validated = SearchNotesParamsSchema.parse(params);
  const db = await getDb();
  const repo = createNotesRepository(db);

  return await repo.searchNotes(context.userId, {
    contactId: validated.contact_id,
    keyword: validated.keyword,
    dateFrom: validated.date_from,
    dateTo: validated.date_to,
    limit: validated.limit,
  });
};
```

### Step 2: Register Tool

```typescript
// src/server/ai/tools/index.ts

import { searchNotesDefinition, searchNotesHandler } from './implementations/notes';

export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // ... existing registrations ...

  // Notes tools (READ-ONLY - AI cannot create notes)
  registry.register(searchNotesDefinition, searchNotesHandler);

  return registry;
}
```

### Step 3: Done

Tool is now available globally and ready to use.

## Tool Categories

- **data_access**: Read operations (get, search, list)
- **data_mutation**: Write operations (create, update, delete)
- **communication**: External messaging (email, SMS, notifications)
- **analytics**: Insights and reports
- **automation**: Workflow triggers and batch operations
- **external**: External API calls (knowledge bases, research)

## Permission Levels

- **read**: Safe read-only operations
- **write**: Create/update operations (requires user consent)
- **admin**: Destructive operations (delete, bulk changes)

## Credit Cost System

Tools can cost AI credits when they use expensive external resources:

- **creditCost: 0** - Free (CRUD operations, analytics on own data)
- **creditCost: 5** - Low cost (simple AI generation, basic research)
- **creditCost: 10-15** - Higher cost (advanced research, external APIs)

The registry automatically checks `ai_quotas` table before executing tools with `creditCost > 0`.

**Examples:**

- `get_contact` - Free (just a DB query)
- `generate_wellness_digest` - 5 credits (uses LLM to summarize)
- `search_medical_research` - 15 credits (calls external paid APIs)

## Best Practices

### ✅ DO

- Use Zod for parameter validation
- Follow repository pattern in handlers
- Throw `AppError` on failures
- Provide clear descriptions and use cases
- Add example calls in tool definition
- Use appropriate category and permission level
- Set rate limits for write operations
- Make tools idempotent when possible
- Return typed results

### ❌ DON'T

- Don't bypass the registry for tool execution
- Don't skip parameter validation
- Don't use tools for admin operations without permission checks
- Don't forget to handle errors
- Don't create tools that mix concerns
- Don't skip observability logging

## Testing

```typescript
import { getToolRegistry } from '@/server/ai/tools';

describe('create_contact tool', () => {
  it('should create contact', async () => {
    const registry = getToolRegistry();

    const result = await registry.execute('create_contact',
      { display_name: 'Test Client' },
      {
        userId: 'test-user',
        timestamp: new Date(),
        requestId: 'test-request',
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

## Observability

All tool executions are logged to `tool_invocations` table:

```sql
-- Check tool usage
SELECT tool, COUNT(*) as calls
FROM tool_invocations
WHERE user_id = $1
GROUP BY tool
ORDER BY calls DESC;
```

## For Agents Building Tools

**📖 Start here:** `/docs/AI_TOOL_SYSTEM.md`

1. Read Part 1 (Quick Start) - 5 minutes
2. Review Part 3 (Tool Catalog) - pick your domain
3. Follow Part 4 (Building Tools) - copy the pattern
4. See Part 5 (Domain Assignment Matrix) - track what's available

**Complete Pattern:**

- Define parameter schema with Zod
- Create tool definition (name, description, useCases, parameters, creditCost)
- Implement handler function
- Register in `index.ts`
- Test it

**Files to create:**

- `implementations/[your-domain].ts` - All tools for your domain
- Register them in `index.ts`

## Documentation

**📖 Master Guide (READ THIS):** `/docs/AI_TOOL_SYSTEM.md`

- Complete architecture
- Full tool catalog (140+ tools)
- Step-by-step building guide
- Agent assignment matrix

**Examples:** `./examples/chat-integration.example.ts`

## Support

For questions:

1. Check master guide (`/docs/AI_TOOL_SYSTEM.md`)
2. Review existing tool implementations (`implementations/*.ts`)
3. See example integrations (`examples/*.ts`)
4. Refer to type definitions (`types.ts`)
