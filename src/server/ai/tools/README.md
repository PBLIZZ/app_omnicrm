# AI Tools Directory

This directory contains the AI tool-calling infrastructure for OmniPotency CRM.

**📖 For complete implementation guide, see `/docs/AI_TOOL_SYSTEM.md`**

**For Agents:** Pick a domain from Part 5 of the master guide and build all tools for that domain.

## Directory Structure

```
src/server/ai/tools/
├── README.md                          # This file
├── types.ts                           # TypeScript types and Zod schemas
├── registry.ts                        # Tool registry singleton
├── index.ts                           # Central exports and initialization
├── implementations/                   # Tool implementations by domain
│   ├── contacts.ts                    # Contact management tools
│   ├── tasks.ts                       # Task & productivity tools
│   └── [future domains]               # Notes, habits, analytics, etc.
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

**Status: 10/140 tools built**

For complete tool catalog with credit costs, see `/docs/AI_TOOL_SYSTEM.md` Part 3.

### ✅ Built (10 tools - all creditCost: 0)

**Contact Management** (`implementations/contacts.ts`)
- `get_contact` - Get contact by ID
- `search_contacts` - Search contacts
- `list_contacts` - List with filters
- `create_contact` - Create contact
- `update_contact` - Update contact

**Task & Productivity** (`implementations/tasks.ts`)
- `get_today_tasks` - Today's tasks
- `create_task` - Create task
- `complete_task` - Mark done
- `search_tasks` - Search tasks
- `get_overdue_tasks` - Get overdue

### ⏳ Ready to Build (130+ tools across 11 domains)

See `/docs/AI_TOOL_SYSTEM.md` Part 3 for complete catalog including:
- Calendar & Scheduling (10 tools)
- Gmail Integration (12 tools, 4 cost credits)
- Notes (6 tools - read-only for AI)
- Goals & Habits (8 tools)
- Mood & Wellness (4 tools)
- Compliance & Consent (5 tools)
- Chat & Semantic Search (8 tools)
- Analytics & Insights (10 tools, 3 cost credits)
- Communication (6 tools, 3 cost credits)
- Research & Knowledge (5 tools, all cost 5-15 credits)
- Workflow Automation (8 tools)

## Creating a New Tool

### Step 1: Define in Implementation File

```typescript
// src/server/ai/tools/implementations/notes.ts

import type { ToolDefinition, ToolHandler } from '../types';
import { z } from 'zod';

// Parameter schema
const CreateNoteParamsSchema = z.object({
  contact_id: z.string().uuid(),
  content: z.string().min(1),
});

type CreateNoteParams = z.infer<typeof CreateNoteParamsSchema>;

// Tool definition
export const createNoteDefinition: ToolDefinition = {
  name: 'create_note',
  category: 'data_mutation',
  version: '1.0.0',
  description: 'Create a session note for a client',
  useCases: [
    "When user says 'add note for Sarah'",
  ],
  parameters: {
    type: 'object',
    properties: {
      contact_id: { type: 'string', description: 'Client UUID' },
      content: { type: 'string', description: 'Note content' },
    },
    required: ['contact_id', 'content'],
  },
  permissionLevel: 'write',
  creditCost: 0,  // Free - just a DB write
  isIdempotent: false,
  tags: ['notes', 'write'],
};

// Handler implementation
export const createNoteHandler: ToolHandler<CreateNoteParams> = async (params, context) => {
  const validated = CreateNoteParamsSchema.parse(params);
  const db = await getDb();
  const repo = createNotesRepository(db);

  return await repo.createNote(context.userId, {
    contactId: validated.contact_id,
    contentPlain: validated.content,
    sourceType: 'typed',
  });
};
```

### Step 2: Register Tool

```typescript
// src/server/ai/tools/index.ts

import { createNoteDefinition, createNoteHandler } from './implementations/notes';

export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // ... existing registrations ...

  // Notes tools
  registry.register(createNoteDefinition, createNoteHandler);

  return registry;
}
```

### Step 3: Done!

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
