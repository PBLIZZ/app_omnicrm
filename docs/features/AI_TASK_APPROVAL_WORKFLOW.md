# AI Task Approval Workflow

**Date:** October 23, 2025  
**Status:** Design Specification  
**Priority:** High - Core AI Feature

## Overview

The AI analyzes user data (braindump notes, calendar events, emails, patterns) and proactively suggests tasks. These AI-generated tasks enter an **approval queue** where the user can approve, delegate to AI, refine, or reject them.

## Task Ownership Model

### Owner States

1. **`"pending_approval"`** - AI-suggested task awaiting user decision (DEFAULT for AI-generated tasks)
2. **`"user"`** - User-owned task (user will complete it)
3. **`"ai"`** - AI-owned task (AI will complete it, user approved delegation)
4. **`"hybrid"`** - Shared ownership (AI completes part, then transfers to user)

### State Transitions

```bash
AI Analysis → Task Created (owner: "pending_approval")
                    ↓
        User Reviews in Approval Queue
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓               ↓
APPROVE         APPROVE &       REFINE          REJECT
(owner: user)   DELEGATE        (stays pending) (deleted)
                (owner: ai)
```

## Approval Actions

### 1. **Approve** ✅

- **Action:** User accepts task and will complete it themselves
- **Result:** `owner: "pending_approval"` → `owner: "user"`
- **UI:** Task moves to user's active tasks
- **Telemetry:** Track acceptance rate

### 2. **Approve & Delegate** 🤖

- **Action:** User accepts task and delegates execution to AI
- **Result:** `owner: "pending_approval"` → `owner: "ai"`
- **UI:** Task moves to AI execution queue
- **AI Behavior:** AI executes task autonomously (send email, create content, etc.)
- **Telemetry:** Track delegation rate, AI success rate

### 3. **Refine** ✏️

- **Action:** User provides feedback for AI to rework the task
- **Result:** `owner: "pending_approval"` (stays in queue)
- **Data:** User comments sent to LLM for task refinement
- **AI Behavior:** LLM analyzes feedback, regenerates task with improvements
- **UI:** Task updated in approval queue with "Refined" badge
- **Telemetry:** Track refinement requests, improvement quality

### 4. **Reject** ❌

- **Action:** User dismisses task as irrelevant/incorrect
- **Result:** Task deleted immediately
- **Telemetry:** Track rejection rate, rejection reasons (if provided)
- **Learning:** AI learns from rejections to improve future suggestions

### 5. **Ignore** 🕐

- **Action:** User takes no action
- **Result:** Task auto-deleted after 30 days
- **Telemetry:** Track ignore rate (indicates unclear value proposition)
- **Learning:** High ignore rate = AI needs improvement

## AI Task Generation Process

### Input Sources

1. **Braindump/Universal Magic Inbox** - User's raw notes, thoughts, ideas
2. **Calendar Events** - Meetings, appointments, deadlines
3. **Email Analysis** - Unread emails, follow-ups needed
4. **Historical Patterns** - Similar tasks from the past
5. **Contact Interactions** - Recent conversations, relationships

### AI Analysis Steps

1. **Pattern Recognition** - Find similar tasks, recurring themes
2. **Task Extraction** - Identify actionable items
3. **Context Enrichment** - Add details, subtasks, tags
4. **Project Assignment** - Link to existing project or suggest new one
5. **Zone Assignment** - Categorize by life area (Client Care, Business, Personal, etc.)
6. **Priority Suggestion** - Based on urgency, importance, patterns

### Example: Braindump → AI Task Generation

**User Input (Braindump):**

```bash
celery recipe for detox
call new clients about warriors weekend workshop
file my taxes
call accountant
order more yoga blocks
```

**AI Analysis Output:**

#### Task 1: Celery Recipe for Detox

```yaml
Zone: Client Care
Project: null (no project)
Title: "Celery Recipe for Detox"
Details: "Let my clients know via a new email for the nurture campaign about 
         the health benefits of celery and add a delicious recipe for the 
         celery en croute with a few photos of the ingredients, before and after."
Subtasks:
  - Take Photos (ingredients, before, after)
  - Write Email (health benefits + recipe)
  - Source Recipe (plus calories, nutrition info)
  - Save email in nurture sequence
Tags: [Recipes, Nurture, Socials]
Priority: medium
Owner: pending_approval
Suggested_Delegation: true (AI can draft email, find recipe)
```

#### Task 2: Warriors Weekend Workshop Outreach

```yaml
Zone: Client Care
Project: "Warriors Weekend Workshop"
Title: "Call new clients about Warriors Weekend Workshop"
Details: "Reach out to recent clients to invite them to the upcoming Warriors 
         Weekend Workshop. Personalize invitations based on their interests."
Subtasks:
  - Review list of new clients (last 3 months)
  - Prepare talking points
  - Make calls
  - Send follow-up emails
Tags: [Workshop, Client Outreach, Warriors Weekend]
Priority: high
Owner: pending_approval
Suggested_Delegation: false (requires personal touch)
```

#### Task 3: Tax Filing

```yaml
Zone: Business Admin
Project: "Annual Tax Filing 2025"
Title: "File my taxes"
Details: "Complete and submit 2025 tax return. Gather documents, review with 
         accountant, file before deadline."
Subtasks:
  - Call accountant to schedule review
  - Gather income documents (1099s, receipts)
  - Review deductions with accountant
  - Submit tax return
Tags: [Taxes, Admin, Deadline]
Priority: high
Due_Date: 2025-04-15 (inferred from tax deadline)
Owner: pending_approval
Suggested_Delegation: false (requires user involvement)
```

#### Task 4: Order Yoga Blocks

```yaml
Zone: Business Operations
Project: "Studio Supplies"
Title: "Order more yoga blocks"
Details: "Restock yoga blocks for studio classes. Check inventory, compare 
         suppliers, place order."
Subtasks:
  - Check current inventory count
  - Determine quantity needed
  - Compare prices from suppliers
  - Place order
Tags: [Supplies, Studio, Equipment]
Priority: medium
Owner: pending_approval
Suggested_Delegation: true (AI can research suppliers, draft order)
```

## Approval Queue UI

### Display Format

```bash
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Suggested Tasks (4 pending)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✨ Celery Recipe for Detox                    🤖 Can Delegate│
│ Zone: Client Care • No Project • 4 subtasks                 │
│ Tags: Recipes, Nurture, Socials                             │
│                                                              │
│ [✓ Approve] [🤖 Approve & Delegate] [✏️ Refine] [✗ Reject] │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📞 Call new clients about Warriors Weekend Workshop         │
│ Zone: Client Care • Project: Warriors Weekend • 4 subtasks  │
│ Tags: Workshop, Client Outreach, Warriors Weekend           │
│                                                              │
│ [✓ Approve] [✏️ Refine] [✗ Reject]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### UI Elements

- **Badge:** "🤖 Can Delegate" if AI can execute the task
- **Zone & Project:** Clear categorization
- **Subtasks Count:** Shows task complexity
- **Tags:** Visual context
- **Action Buttons:** Clear, color-coded actions

## Hybrid Ownership (AI → User Handoff)

### Use Case

Task has parts AI can complete, then transfers to user for final steps.

### Example: Email Campaign Task

```yaml
Title: "Launch Q1 Wellness Newsletter"
Owner: ai (initially)
AI Tasks:
  - ✅ Draft email content (AI completes)
  - ✅ Source images (AI completes)
  - ✅ Format newsletter (AI completes)
  → Transfer to User
User Tasks:
  - ⏳ Review and approve content
  - ⏳ Schedule send time
  - ⏳ Send newsletter
Owner: user (after AI completes its part)
```

### Implementation

```typescript
interface Task {
  owner: "pending_approval" | "user" | "ai" | "hybrid";
  aiProgress?: {
    completedSteps: string[];
    remainingSteps: string[];
    handoffReady: boolean;
  };
}
```

## Telemetry & Learning

### Metrics to Track

#### Approval Metrics

- **Approval Rate:** % of tasks approved (target: >60%)
- **Delegation Rate:** % of tasks delegated to AI (indicates trust)
- **Refinement Rate:** % of tasks refined (indicates clarity issues)
- **Rejection Rate:** % of tasks rejected (indicates relevance issues)
- **Ignore Rate:** % of tasks ignored (indicates value proposition issues)

#### Quality Metrics

- **AI Success Rate:** % of AI-delegated tasks completed successfully
- **Refinement Cycles:** Avg # of refinements before approval
- **Time to Decision:** How long users take to review tasks
- **Task Completion Rate:** % of approved tasks actually completed

#### Learning Metrics

- **Pattern Recognition Accuracy:** How well AI identifies actionable items
- **Project Assignment Accuracy:** % of correct project assignments
- **Zone Assignment Accuracy:** % of correct zone assignments
- **Tag Relevance:** User edits to AI-suggested tags

### Feedback Loop

```bash
User Actions → Telemetry → AI Learning → Improved Suggestions
```

## Database Schema Updates

### Current Schema

```typescript
// tasks.details.owner (JSONB)
owner: "user" | "ai"
```

### Updated Schema

```typescript
// tasks table - add new columns
export const tasks = pgTable("tasks", {
  // ... existing columns ...
  owner: text("owner").notNull().default("user"), // Move from JSONB to column
  ownerStatus: text("owner_status"), // "pending_approval" | "active" | "completed" | "delegated"
  aiMetadata: jsonb("ai_metadata"), // AI-specific data
  approvalDeadline: timestamp("approval_deadline"), // Auto-delete after 30 days
  refinementCount: integer("refinement_count").default(0),
  refinementHistory: jsonb("refinement_history"), // User feedback for learning
});

// New table: task_approvals (audit trail)
export const taskApprovals = pgTable("task_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(), // "approved" | "delegated" | "refined" | "rejected" | "ignored"
  feedback: text("feedback"), // User comments for refinement
  createdAt: timestamp("created_at").defaultNow(),
});
```

## API Endpoints Needed

### Approval Queue

- `GET /api/tasks/pending-approval` - List tasks awaiting approval
- `POST /api/tasks/[taskId]/approve` - Approve task (owner → user)
- `POST /api/tasks/[taskId]/delegate` - Approve & delegate (owner → ai)
- `POST /api/tasks/[taskId]/refine` - Request refinement with feedback
- `POST /api/tasks/[taskId]/reject` - Reject task (delete)

### AI Task Generation

- `POST /api/ai/analyze-braindump` - Analyze braindump, generate tasks
- `POST /api/ai/generate-tasks` - Generate tasks from various sources
- `GET /api/ai/suggestions` - Get AI task suggestions

### Hybrid Ownership

- `POST /api/tasks/[taskId]/handoff` - AI completes its part, transfer to user
- `GET /api/tasks/ai-progress` - Check AI progress on delegated tasks

## Impact on Tags

### ✅ **No Impact on Tag Architecture**

The approval workflow and AI task generation **do not change** how tags work:

1. **Tags remain relational** - Still use `task_tags` junction table
2. **AI suggests tags** - Based on content analysis, historical patterns
3. **User can edit tags** - During approval or after
4. **Tags used for learning** - AI learns which tags are relevant

### Enhanced Tag Usage

#### AI Tag Suggestions

```typescript
interface AIGeneratedTask {
  title: string;
  details: string;
  suggestedTags: Array<{
    tagId?: string; // Existing tag
    tagName: string; // New tag if tagId is null
    confidence: number; // 0-1, how confident AI is
    reason: string; // Why this tag is suggested
  }>;
}
```

#### Example

```json
{
  "title": "Celery Recipe for Detox",
  "suggestedTags": [
    {
      "tagId": "uuid-123",
      "tagName": "Recipes",
      "confidence": 0.95,
      "reason": "Task involves creating a recipe"
    },
    {
      "tagId": "uuid-456",
      "tagName": "Nurture",
      "confidence": 0.88,
      "reason": "Part of nurture campaign"
    },
    {
      "tagId": null,
      "tagName": "Socials",
      "confidence": 0.75,
      "reason": "Content suitable for social media"
    }
  ]
}
```

## Implementation Priority

### Phase 1: Basic Approval Queue (MVP)

1. Add `owner` column to tasks table
2. Create approval queue UI
3. Implement approve/reject actions
4. 30-day auto-delete for ignored tasks

### Phase 2: AI Delegation

1. Implement "Approve & Delegate" action
2. AI execution framework (email sending, content creation)
3. Progress tracking for AI tasks
4. Handoff mechanism (AI → User)

### Phase 3: Refinement & Learning

1. Refinement feedback system
2. Telemetry tracking
3. AI learning from user actions
4. Improved task generation

### Phase 4: Advanced Features

1. Bulk approval/rejection
2. Smart suggestions based on patterns
3. Proactive task generation
4. Confidence scoring

## Success Metrics

### Short-term (3 months)

- 60%+ approval rate
- 30%+ delegation rate
- <20% rejection rate
- <10% ignore rate

### Long-term (12 months)

- 75%+ approval rate
- 50%+ delegation rate
- <10% rejection rate
- <5% ignore rate
- 90%+ AI task completion success rate

---

**Next Steps:**

1. Implement basic approval queue UI
2. Add owner column to tasks table
3. Create approval action endpoints
4. Build telemetry tracking
5. Iterate based on user feedback
