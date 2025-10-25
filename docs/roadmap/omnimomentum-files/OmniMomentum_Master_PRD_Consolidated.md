# OmniMomentum: Master Product Requirements Document

## Productivity Module for Wellness Solopreneurs within OmniCRM

**Version**: 2.0 Consolidated Master  
**Last Updated**: October 21, 2025  
**Status**: Ready for Final Decisions & Implementation  
**Owner**: Product Team

---

## 📋 Document Purpose

This master PRD consolidates all competing ideas, research findings, and design approaches from multiple sources into one comprehensive document. Where there are conflicting approaches, they are grouped together with [DECISION NEEDED] tags so you can choose the best path forward.

**Source Documents Consolidated**:

- OmniMomentum Task Management PRD (comprehensive)
- OmniMomentum Implementation Guide (technical)
- Wellness Task Management App PRD (role-based)
- Productivity Module Research (extensive user research)
- Intelligent Inbox Processing Documentation

---

## 🎯 Executive Summary

OmniMomentum is an **AI-powered "dump everything" productivity system** specifically designed for wellness solopreneurs (yoga teachers, massage therapists, nutritionists, health coaches) who need to balance client work, business operations, personal wellness, and family responsibilities.

### Core Value Propositions

1. **Intelligent Inbox Processing**: "Dump everything" and let AI automatically categorize, split, prioritize, and route tasks
2. **Energy-Aware Task Management**: Daily Pulse widget captures energy/mood 3x daily for smart task routing
3. **Client Context Integration**: Tasks linked directly to client records for seamless workflow
4. **Wellness-Appropriate Terminology**: Using "Pathways," "Pulse," and "Journey" instead of cold technical terms
5. **Calming, Familiar Interface**: Proven patterns from Trello/Todoist/Asana with wellness-focused design

---

## 🔍 Problem Statement & User Research Insights

### The Wellness Solopreneur Juggling Act

**Research Base**: N=156 wellness practitioners surveyed across multiple studies

#### Key Pain Points

- **Multiple life domains**: Client work, business ops, personal wellness, family responsibilities
- **Energy fluctuations**: Variable energy levels throughout the day impact task completion
- **Client-centric work**: Many tasks tied to specific clients requiring context switching
- **Irregular schedules**: Teaching schedules, client sessions, personal time create non-standard workdays
- **Overwhelm vulnerability**: As empaths and caregivers, highly susceptible to task list anxiety

#### Critical Research Findings

| Finding                         | Percentage             | Implication                         |
| ------------------------------- | ---------------------- | ----------------------------------- |
| Prefer simple list views        | 78%                    | No Kanban boards as default         |
| Top feature request: AI inbox   | #1 requested           | "Dump everything" must be prominent |
| Mobile usage: between sessions  | 44px min touch targets | Large buttons, offline-capable      |
| Cognitive overload sensitivity  | Show max 3 priorities  | Progressive disclosure pattern      |
| Wellness terminology preference | Strong                 | No technical jargon                 |
| Invisible AI preference         | Strong                 | Intelligence embedded organically   |

### Top 3 Apps Currently Used

#### 1. Trello (Visual Kanban Champion)

**Why they love it**:

- Intuitive drag-and-drop card system would be good for zones
- Separate boards for business/personal provide mental compartmentalization
- Satisfying tactile feeling of moving cards
- Color-coded labels for quick categorization

#### 2. Todoist (Balanced Power Tool)

**Why they love it**:

- Natural language processing: "Follow up with Sarah tomorrow at 2pm p1 @clients"
- Quick Add with keyboard shortcut
- Today view intelligently groups overdue + current tasks
- Karma points for gentle gamification

#### 3. Asana (Project Planning Powerhouse)

**Why they love it**:

- Familiar list-based interface
- Team features for when hiring assistants
- Multiple view options (list, board, calendar)
- Templates for common workflows

---

## 🌟 Product Vision & Goals

### What We're Building

**OmniMomentum** combines the visual clarity of Trello, the quick-capture power of Todoist, and the project planning depth of Asana—specifically designed for wellness practitioners juggling multiple life domains.

### Primary Goals

1. **Reduce cognitive load** through smart task organization and energy-aware prioritization
2. **Integrate client context** so tasks are connected to the people they serve
3. **Support wellness routines** with recurring task patterns
4. **Provide visual clarity** using proven patterns that feel calming, not cluttered
5. **Enable quick capture** because practitioners need to log tasks between sessions

## 🏗️ Core Features

### Feature 1: Intelligent Inbox Processing (AI-Powered)

**Status**: ✅ Backend Complete | 🔧 Frontend Needs Enhancement

#### Description

Users can "dump everything" into a prominent inbox. AI automatically:

1. Splits bulk input into individual actionable tasks
2. Categorizes by zones (Life, Business, Learning, Health, etc.)
3. Assigns to projects where applicable
4. Detects hierarchies (task/subtask, project/task relationships)
5. Presents for approval via HITL (Human-in-the-Loop) workflow

#### [DECISION NEEDED] Natural Language Parser Approach - NO

##### Option B: GPT-5 nano Integration from Start

- Pros: More accurate from day 1, understands natural language better
- Cons: Higher cost per parse, dependency on external service
- Cost: ~$0.002 per task parse
- Research support: Users expect high accuracy in "dump everything" features

#### Implementation Details

**Core Components**:

1. **Intelligent Inbox Processor** (`src/server/ai/connect/intelligent-inbox-processor.ts`)
2. **Approval Service** (`src/server/services/inbox-approval.service.ts`)
3. **Enhanced Inbox Service** (`src/server/services/enhanced-inbox.service.ts`)
4. **API Endpoints**:
   - `/api/omni-momentum/inbox/intelligent` - Intelligent quick capture
   - `/api/omni-momentum/inbox/approval` - Approval workflow management

**AI Processing Logic**:

```bash
Input: "Call John about project proposal, finish quarterly report by Friday,
        book dentist appointment, organize team meeting for next week"

Output: [
  {
    name: "Call John about project proposal",
    priority: "medium",
    estimatedMinutes: 15,
    zoneId: 2, // Business zone
    projectId: "project-uuid",
    confidence: 0.9
  },
  {
    name: "Finish quarterly report",
    priority: "high",
    dueDate: "2024-01-15",
    estimatedMinutes: 120,
    zoneId: 2,
    confidence: 0.95
  },
  // ... more tasks
]
```

**Confidence Scoring**:

- **High (0.8-1.0)**: Clear, unambiguous tasks
- **Medium (0.6-0.8)**: Good confidence with minor uncertainty
- **Low (0.3-0.6)**: Requires human review
- **Very Low (<0.3)**: Fallback processing

**Fallback Behavior**:

- If AI unavailable: Falls back to manual processing
- If processing error: Creates fallback task with low confidence
- If validation error: Returns error with details

---

### Feature 2: Hierarchical Task Structure

**Status**: ✅ Backend Complete | 🔧 Frontend Needs Enhancement

#### [DECISION NEEDED] Task Hierarchy Depth

##### Option B: Two-Level Hierarchy (Projects → Tasks → Subtasks)

- Pros: Handles most real-world scenarios, familiar from Todoist/Asana
- Cons: Moderate complexity
- Research support: Wellness practitioners manage complex programs

**Recommendation**: Option B for Phase 1. Database already supports Option B via `parentTaskId` field.

#### Database Schema (Already Implemented)

```typescript
// Projects Table
{
  id: uuid,
  userId: string,
  name: string,
  zoneId: number | null,
  status: "active" | "on_hold" | "completed" | "archived",
  dueDate: Date | null,
  details: unknown, // JSONB for flexible data
  createdAt: Date,
  updatedAt: Date
}

// Tasks Table
{
  id: uuid,
  userId: string,
  projectId: uuid | null,
  parentTaskId: uuid | null, // For subtasks
  name: string,
  status: "todo" | "in_progress" | "done" | "canceled",
  priority: "low" | "medium" | "high" | "urgent",
  dueDate: Date | null,
  estimatedMinutes: number | null,
  zoneId: number | null,
  details: unknown, // JSONB
  completedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

---

### Feature 3: Client-Task Integration with Smart Tagging and Description

**Status**: ✅ Backend Complete

Tag clients directly in tasks for grouping and filtering. View all tasks related to specific clients, client cohorts (e.g., "new clients," "chronic pain clients"), or service types.

**Database Schema**:

```typescript
// Contact Links Table
{
  id: uuid,
  momentumTaskId: uuid,
  contactId: uuid, // Links to OmniClients
  linkType: "primary" | "secondary" | "mentioned",
  createdAt: Date
}
```

**Implementation**:

- Tasks can link to multiple contacts
- Quick view of all tasks for specific client
- Client context visible in task details
- Auto-tag tasks by client for filtering

---

### Feature 4: Wellness-Specific Workflow Automation

**Status**: 🔧 Needs Implementation

#### Pre-Built Wellness Templates

Research shows wellness practitioners desperately want pre-built workflows:

**Quick Setup Templates**:

1. **New Client Onboarding** (7-step workflow)
   - Initial consultation prep
   - Welcome packet creation
   - First session materials
   - Follow-up schedule
   - Assessment review
   - Program design
   - Launch communication

2. **Program Delivery** (milestone-based tracking)
   - Week 1 check-in
   - Mid-program assessment
   - Progress celebration
   - Final evaluation
   - Testimonial request

3. **Content Creation Pipeline**
   - Ideation and brainstorming
   - Content writing
   - Image creation
   - Review and edit
   - Schedule for publishing
   - Post publication engagement

4. **Marketing Campaign**
   - Campaign planning
   - Content calendar
   - Creative assets
   - Launch sequence
   - Engagement tracking
   - Results analysis

**Implementation Approach**:

- Store as JSON templates in database
- User can customize templates
- One-click project creation from template
- AI can suggest which template fits user's input

---

### Feature 5: Goal Tracking System

**Status**: ✅ Backend Complete | 🔧 Frontend Needs Enhancement

#### [DECISION NEEDED] Goal Tracking Scope

##### Option B: Dual System (Practitioner + Client Goals)

- Pros: Holistic view, integrated with client care
- Cons: More complex, requires client module integration
- Use case: "My goal: Launch workshop" + "Sarah's goal: Reduce back pain"

**Recommendation**: Option B - Research shows wellness practitioners need both. Database schema already supports this via `contactId` field.

**Database Schema**:

```typescript
{
  id: uuid,
  userId: string,
  contactId: uuid | null, // If this is a client goal
  name: string,
  targetDate: Date | null,
  status: "active" | "completed" | "abandoned",
  progress: number, // 0-100
  milestones: unknown, // JSONB array
  details: unknown,
  createdAt: Date,
  updatedAt: Date
}
```

---

### Feature 6: Life-Business Zone Management

**Status**: ✅ Core Implementation Complete

#### Zone System

Research-validated wellness zones (customizable):

| Zone ID | Default Name | Color   | Icon      | Description                    |
| ------- | ------------ | ------- | --------- | ------------------------------ |
| 1       | Life         | #3B82F6 | home      | Personal tasks, family, home   |
| 2       | Business     | #10B981 | briefcase | Work tasks, operations, admin  |
| 3       | Learning     | #8B5CF6 | book      | Education, skill development   |
| 4       | Health       | #F59E0B | heart     | Exercise, medical, wellness    |
| 5       | Self Care    | #EC4899 | spa       | Mindfulness, boundaries, rest  |
| 6       | Client Care  | #06B6D4 | users     | Sessions, follow-ups, programs |

#### [DECISION NEEDED] Zone Configuration

##### Option C: Hybrid (6 Default + Custom)

- Pros: Best of both worlds
- Cons: Moderate complexity
- Research support: Aligns with 64% expecting consistency but 40% wanting customization

**Recommendation**: Option C - Start with 6 defaults that users can rename/recolor, allow adding 2-3 custom zones.

#### Time Blocking & Boundary Features

**Planned Features**:

- Calendar integration (via OmniRhythm module)
- Time-blocked view showing when tasks fit in schedule
- Buffer time between intense client sessions
- Automated "do not disturb" periods for self-care
- Energy-based task suggestions (via Daily Pulse)

---

### Feature 7: Daily Pulse Energy Tracking and Description

**Status**: ✅ Widget Complete | 🔧 Needs Deeper Integration

Daily Pulse widget captures energy/mood 3x daily (AM, PM, Night) for energy-aware task routing.

**Data Captured**:

```typescript
{
  userId: string,
  pulseTime: "morning" | "afternoon" | "evening" | "night",
  energyLevel: 1-5, // 1=exhausted, 5=energized
  mood: "great" | "good" | "okay" | "low" | "struggling",
  notes: string | null,
  timestamp: Date
}
```

**AI Zone Routing Logic**:

- **High energy** → Complex client work, content creation, business strategy
- **Medium energy** → Client follow-ups, administrative tasks, planning
- **Low energy** → Simple data entry, reviewing notes, self-care

**Implementation Status**:

- ✅ Widget UI complete
- ✅ Data logging to database
- 🔧 AI routing suggestions need implementation
- 🔧 Task list filtering by energy level

---

### Feature 8: View Types & Navigation

#### [DECISION NEEDED] Primary View Default

##### Option A: List View Primary (Research-Recommended)

- Pros: 78% prefer list views, faster to scan
- Cons: Less visual, harder to see workflow stages
- Best for: Daily task management, quick reviews

**Recommendation**: Option A (List View) as default, with easy toggle to Board View. Research overwhelmingly supports this.

#### List View Features

**Time-Based Sections**:

- Morning (6am-12pm)
- Afternoon (12pm-6pm)
- Evening (6pm-10pm)
- Night (10pm-6am)
- No Time Set

**Smart Lists** (Auto-generated views):

- **Today**: Tasks due today + overdue
- **Upcoming**: Tasks due in next 7 days
- **High Priority**: Urgent + High priority tasks
- **This Week**: Current week's tasks
- **By Zone**: Group by Life/Business/Health/etc.
- **By Client**: Group by client tags
- **By Project**: Group by project

**Visual Design**:

- Checkbox always on left (Western reading pattern)
- Task title: medium weight font (500-600), 14-16px
- Metadata: colored badges/chips for dates, priorities, labels
- Generous white space and padding
- Subtle shadows and gradients
- Smooth animations and transitions

---

### Feature 9: Quick Capture System

**Status**: ✅ Backend Complete | 🔧 Frontend Needs Enhancement

#### Implementation Approaches

**Global Access Points**:

1. **Floating Action Button (FAB)** - Bottom-right corner (Trello pattern)
2. **Keyboard Shortcut** - 'Q' key globally (Todoist pattern)
3. **Widget on Dashboard** - Always visible input field
4. **Mobile Quick Add** - Swipe gesture or persistent header

#### [DECISION NEEDED] Quick Capture UI Pattern

##### Option A: Modal Dialog

- Pros: Focused, no distractions
- Cons: Interrupts current view
- Best for: Complex task entry

##### Option B: Inline Expand

- Pros: Non-disruptive, contextual
- Cons: May overlap content
- Best for: Simple task entry

##### Option C: Slide-in Panel

- Pros: Doesn't interrupt, more space
- Cons: Requires animation overhead
- Best for: Medium complexity tasks

**Recommendation**: Option B for simple capture, Option C for when user clicks "more details".

#### Natural Language Processing

### Feature 10: Recurring Tasks

**Status**: ✅ Backend Complete | 🔧 Frontend Needs UI

#### [DECISION NEEDED] Recurring Task Creation Timing

##### Option A: Create Immediately After Completion (Todoist Model)

- Pros: See upcoming recurring tasks, more predictable
- Cons: More tasks in list
- User expectation: Can plan ahead

**Recommendation**: Option A - Research shows wellness practitioners need to see their schedule ahead of time.

#### Recurrence Patterns

**Supported**:

- Daily
- Weekly (specific days: Mon, Tue, etc.)
- Monthly (specific date or "last day of month")
- Yearly
- Custom intervals (every 2 weeks, every 3 days, etc.)

**Storage**:

```typescript
{
  recurringPattern: {
    frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom",
    interval: number, // e.g., 2 for "every 2 weeks"
    daysOfWeek: number[], // 0-6 for Sun-Sat
    dayOfMonth: number | null,
    endDate: Date | null
  }
}
```

---

### Feature 11: Habit Tracking

**Status**: 🔧 Needs Implementation

#### [DECISION NEEDED] Habit Tracking Approach

##### Option A: Separate Habits Module

- Pros: Focused, dedicated UI
- Cons: Separated from tasks
- Best for: Users who want distinct habit tracking

##### Option B: Habits as Recurring Tasks

- Pros: Unified system, simpler
- Cons: May clutter task list
- Best for: Minimalists

##### Option C: Hybrid (Habits can create tasks)

- Pros: Flexibility
- Cons: More complex
- Best for: Power users

**Recommendation**: Option C - Create habits that optionally generate daily tasks.

#### Habit Features

**Core Functionality**:

- **Streak Tracking**: Visual indicator of consecutive days
- **Habit Stacking**: Link habits together (after morning coffee → meditate)
- **Celebration Moments**: Acknowledge milestones (7-day, 30-day streaks)
- **Flexible Scheduling**: Not every day (e.g., "3x per week")

**Habit Types**:

- Personal wellness (exercise, meditation, journaling)
- Business (content creation, bookkeeping, marketing)
- Client care (session prep, follow-ups)

---

### Feature 12: Analytics & Insights Dashboard

**Status**: 🔧 Needs Implementation

#### Metrics to Track

**Productivity Trends**:

- Tasks completed per day/week/month
- Completion rate by zone
- Energy level correlation with completion
- Most productive times of day
- Task estimation accuracy

**Client Engagement**:

- Tasks completed per client
- Average response time to client tasks
- Client goal progress
- Session preparation consistency

**Business Goals**:

- Goal completion rate
- Milestone tracking
- Revenue-related task completion
- Marketing task consistency

#### [DECISION NEEDED] Analytics Complexity

##### Option C: Progressive Disclosure Analytics

- Pros: Start simple, drill down if interested
- Cons: Requires thoughtful UI design
- Metrics: 3 key metrics on dashboard, "View More" for details

**Recommendation**: Option C - Research shows wellness practitioners want "simple metrics" but some want depth.

---

## 🎨 UI/UX Design Patterns

### Design Philosophy

Based on research with 156+ wellness practitioners:

**Core Principles**:

1. **Calming over corporate** - Soft colors, generous spacing, warm tones
2. **Progressive disclosure** - Show only what's needed, hide complexity
3. **Familiar patterns** - Use proven patterns from Trello/Todoist/Asana
4. **Mobile-first** - 85% manage tasks on mobile between sessions
5. **Touch-friendly** - 44px minimum touch targets
6. **Fast loading** - <300ms load time for task lists

### Color Palette

#### Option A: Soft Pastels (Research-Recommended)

```bash
Primary: #6366F1 (Soft indigo)
Secondary: #10B981 (Mint green)
Accent: #F59E0B (Warm amber)
Background: #F9FAFB (Off-white)
Text: #1F2937 (Soft black)
```

**Recommendation**: Option A (Soft Pastels) - Research shows wellness practitioners prefer calming, professional tones.

### Typography

#### Option A: Modern Sans-Serif (Recommended)

```bash
Headings: Inter (600-700 weight)
Body: Inter (400-500 weight)
Mono: JetBrains Mono (for code/dates)
```

**Recommendation**: Option A - Balances professionalism with friendliness.

### Layout Structure

#### [DECISION NEEDED] Navigation Layout

##### Option A: Collapsible Sidebar with Secondary Context (Research-Recommended)

- Primary sidebar: Main modules (OmniClients, OmniMomentum, OmniRhythm, etc.)
- Secondary area: Context-specific navigation (Inbox, Projects, Goals, etc.)
- Collapse to icon width when needed
- Always visible on desktop, hamburger on mobile

**Recommendation**: Option A - Research shows 64% expect consistent navigation, and wellness practitioners prefer unified layouts that reduce cognitive load.

---

## 📝 Terminology & Taxonomy

### Wellness-Appropriate Language

Research shows wellness practitioners strongly prefer aspirational, journey-focused terminology over cold technical terms.

#### [DECISION NEEDED] Core Terminology

##### Option A: Wellness-Native Terms (Research-Recommended)

```bash
Projects → Pathways
Tasks → Actions / Steps
Goals → Journeys
Analytics → Pulse
Inbox → Capture / Collect
Dashboard → Today's Focus
```

- Pros: Resonates with wellness identity, warm feeling
- Cons: May confuse traditional business users
- Research support: 70% prefer recognizable wellness terms

##### Option B: Hybrid Approach

```bash
Projects (with subtitle "Your Pathways")
Tasks (with subtitle "Action Steps")
Keep technical terms but add warmth
```

- Pros: Clear to everyone, adds wellness flavor
- Cons: Wordier
- Research support: Balances clarity with identity

**Recommendation**: Option A for primary UI, Option B for onboarding/help text. Research overwhelmingly supports wellness-native terminology.

#### Implemented Terminology

**Dashboard Sections**:

- **Today's Focus** (not "Today's Tasks")
- **Quick Capture** (not "Add Task")
- **Your Pathways** (not "Projects")
- **Energy Pulse** (not "Daily Log")
- **Celebration Moments** (not "Completed")

**Action Words**:

- **Complete** instead of "Mark Done"
- **Begin** instead of "Start"
- **Release** instead of "Delete"
- **Rest** instead of "Postpone"

---

## 🏛️ Technical Architecture

### Current Implementation Status

#### ✅ Backend Complete (Phase 1)

**Database Schema** (PostgreSQL via Supabase + Drizzle ORM):

- `momentum_projects` table with RLS ✅
- `momentum_tasks` table with RLS ✅
- `momentum_goals` table with RLS ✅
- `momentum_inbox` table with RLS ✅
- `momentum_daily_pulse_log` table with RLS ✅
- `momentum_time_blocks` table with RLS ✅
- `momentum_contact_links` table ✅

**Repository Layer** (`packages/repo/src/momentum.repo.ts`):

- Complete CRUD operations ✅
- Type-safe query building ✅
- Filtering and searching ✅
- Client linking functionality ✅

**Service Layer** (`src/server/services/momentum.service.ts`):

- Business logic for tasks, projects, goals, inbox ✅
- Comprehensive filtering and stats ✅
- Zone-based task organization ✅
- Contact integration ✅

**API Routes**:

- `/api/omni-momentum/tasks` ✅
- `/api/omni-momentum/projects` ✅
- `/api/omni-momentum/goals` ✅
- `/api/omni-momentum/inbox` ✅
- `/api/omni-momentum/stats` ✅
- `/api/omni-momentum/daily-pulse` ✅

**React Hooks** (`src/hooks/use-momentum.ts`):

- Full React Query integration ✅
- Optimistic updates with rollback ✅
- TypeScript-safe operations ✅

#### 🔧 Frontend Needs Enhancement

**Completed Components**:

- `DailyPulseWidget.tsx` ✅
- `QuickCaptureInput.tsx` ✅
- Basic task list views ✅

**Needed Components**:

- Intelligent Inbox with AI approval flow
- Recurring task UI
- Habit tracking interface
- Analytics dashboard
- Template selection UI
- Enhanced project views

### Technology Stack

```bash
Framework: Next.js 15 App Router
Database: PostgreSQL via Supabase
ORM: Drizzle ORM
State: React Query (TanStack Query)
Validation: Zod schemas
Type Safety: TypeScript strict mode
AI: OpenRouter API (configurable model)
UI: Tailwind CSS + shadcn/ui
```

### Layered Architecture

```bash
┌─────────────────────────────────────┐
│  Frontend Layer (React Components) │
│  - Server Components (auth)        │
│  - Client Components (interactive) │
│  - React Query hooks              │
└────────────┬────────────────────────┘
             │ HTTP/REST
┌────────────▼────────────────────────┐
│  API Layer (Route Handlers)        │
│  - Input validation (Zod)         │
│  - Auth extraction                │
│  - Error formatting               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Service Layer (Business Logic)    │
│  - Functional pattern              │
│  - Acquires DbClient via getDb()   │
│  - Re-throws errors               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Repository Layer (Data Access)     │
│  - Constructor injection           │
│  - Factory functions               │
│  - Returns null for "not found"   │
│  - Throws generic Error           │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Database Layer (PostgreSQL)        │
│  - Schema definitions (schema.ts)  │
│  - Migrations (Supabase SQL)       │
│  - Type generation                │
└─────────────────────────────────────┘
```

### Critical Implementation Patterns

**API Route Handler**:

```typescript
import { handleAuth } from "@/lib/api";
import { CreateTaskSchema, TaskSchema } from "@/server/db/business-schemas";

export const POST = handleAuth(
  CreateTaskSchema, // Input validation
  TaskSchema, // Output validation
  async (data, userId) => {
    return await createTaskService(userId, data);
  },
);
```

**Service Layer**:

```typescript
export async function createTaskService(userId: string, data: CreateTaskInput): Promise<Task> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.createTask(userId, data);
  } catch (error) {
    throw error; // Re-throw, don't wrap
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

**Repository Layer**:

```typescript
describe("ProductivityRepository", () => {
  it("creates task with valid data", async () => {
    const task = await repo.createTask(userId, {
      name: "Test task",
      status: "todo",
      priority: "medium",
    });
    expect(task.id).toBeDefined();
    expect(task.name).toBe("Test task");
  });
});
```

**Service Layer**:

```typescript
describe("Task Service", () => {
  it("creates task and links to client", async () => {
    const task = await createTaskService(userId, {
      name: "Follow up with Sarah",
      clientId: "client-123",
    });
    expect(task.contactLinks).toHaveLength(1);
  });
});
```

### Integration Tests

**API Endpoints**:

```typescript
describe("POST /api/omni-momentum/tasks", () => {
  it("creates task and returns 201", async () => {
    const response = await fetch("/api/omni-momentum/tasks", {
      method: "POST",
      body: JSON.stringify({
        name: "Test task",
        priority: "high",
      }),
    });
    expect(response.status).toBe(201);
    const task = await response.json();
    expect(task.id).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

**Complete Workflow**:

```typescript
test("wellness practitioner daily workflow", async ({ page }) => {
  // Login
  await page.goto("/omni-momentum");

  // Log morning pulse
  await page.click('button:has-text("Daily Pulse")');
  await page.click('[data-energy="4"]'); // High energy

  // Add task with natural language
  await page.keyboard.press("q"); // Quick add shortcut
  await page.fill('input[placeholder*="Add"]', "Review Sarah's nutrition plan at 2pm p1 @sarah");
  await page.keyboard.press("Enter");

  // Verify task appears
  await expect(page.locator("text=Review Sarah's nutrition plan")).toBeVisible();

  // Complete the task
  await page.click('input[type="checkbox"]:near(:text("Review Sarah"))');

  // Verify completion
  await expect(page.locator("text=Review Sarah's nutrition plan")).toHaveClass(/line-through/);
});
```

---

## 📊 Success Criteria & KPIs

### AI Processing Metrics

- **Processing Success Rate**: >90%
- **Average Confidence Scores**: >0.7
- **Approval Rate**: >80% of AI suggestions accepted
- **Processing Time**: <2 seconds per batch

---

## 🎯 Implementation Phases

### Phase 1: Core MVP (Weeks 1-4) - IN PROGRESS

**Backend** (✅ Complete):

- All database tables
- All API endpoints
- Repository and service layers
- React Query hooks

**Frontend** (🔧 Needs Work):

- [ ] Enhanced task list with time grouping
- [ ] Quick capture with AI NLP
- [ ] Daily Pulse integration
- [ ] Zone-based filtering
- [ ] Basic project views
- [ ] Task detail modal
- [ ] Mobile optimization

### Phase 2: Intelligence & Automation (Weeks 5-8)

- [ ] Intelligent Inbox with AI processing
- [ ] HITL approval workflow UI
- [ ] AI task routing based on energy
- [ ] Recurring task UI
- [ ] Template system
- [ ] Basic analytics

### Phase 3: Advanced Features (Weeks 9-12)

- [ ] Habit tracking system
- [ ] Goal tracking UI
- [ ] Workflow automation
- [ ] Calendar integration

### Phase 4: Polish & Optimization (Weeks 13-16)

- [ ] Performance optimization
- [ ] Offline capability
- [ ] PWA features
- [ ] Keyboard shortcuts
- [ ] Accessibility audit
- [ ] User onboarding flow

---

## ❓ Open Decisions Summary

### Critical Decisions Needed

1. **Natural Language Parser**: AI from start

2. **Task Hierarchy Depth**: Two-level (Projects → Tasks → Subtasks)

3. **Primary View**: List primary (78% preference)

4. **Zone Configuration**: Hybrid (6 defaults + custom)

5. **Goal Tracking**: Dual system (practitioner + client)

6. **Recurring Task Creation**: Immediate (Todoist model)

7. **Task Completion Animation**: Configurable (default slide out)

8. **Habit Tracking**: Hybrid

9. **Analytics Complexity**: Progressive disclosure

10. **Terminology**: Wellness-native, Hybrid

11. **Navigation Layout**: Collapsible sidebar with secondary context

12. **Color Palette**: Soft pastels

### Secondary Decisions

- Mobile app vs PWA? → **Web App**
- Project sub-projects? → **Flat**
- Voice input? → **From the start**
- Collaborative features? → **no**
- Dark mode? → **yes**
- Export/Import? → **yes**

---

## 📚 Research Sources & References

### User Research

- 156+ wellness practitioners surveyed
- Forums: Reddit (r/Entrepreneur, r/Healthygamergg, r/lifecoaching)
- Industry: Practice Better, Clinic Sense, wellness coaching platforms
- Competitor analysis: Trello, Todoist, Asana, Things, Apple Reminders

### Technical Documentation

- `docs/REFACTORING_PATTERNS_OCT_2025.md` - Architecture patterns
- `docs/ARCHITECTURE.md` - System architecture
- `docs/TECHNICAL_DEBT_ELIMINATION.md` - Code standards
- `packages/repo/src/momentum.repo.ts` - Repository implementation
- `src/server/services/momentum.service.ts` - Service layer

### UI/UX Research

- Mobile UX design patterns for wellness apps
- Kanban board implementations
- Natural language parsing systems
- Accessibility standards (WCAG 2.1)
- SaaS navigation best practices

---

## 🗂️ Appendices

### Appendix A: Database Schema Reference

**Complete schema** available in:

- `src/server/db/schema.ts`
- Supabase migrations: `supabase/migrations/`

**Key tables**:

- `momentum_projects`
- `momentum_tasks`
- `momentum_goals`
- `momentum_inbox`
- `momentum_daily_pulse_log`
- `momentum_time_blocks`
- `momentum_contact_links`
- `zones`

### Appendix B: API Endpoint Reference

**Base URL**: `/api/omni-momentum/`

**Endpoints**:

- `GET/POST /tasks` - Task CRUD
- `GET/POST /projects` - Project CRUD
- `GET/POST /goals` - Goal CRUD
- `GET/POST /inbox` - Inbox CRUD
- `POST /inbox/intelligent` - AI processing
- `GET/POST /inbox/approval` - Approval workflow
- `GET /stats` - Analytics
- `GET/POST /daily-pulse` - Energy tracking
- `GET/POST /time-blocks` - Calendar blocks

### Appendix C: Glossary

**Zone** - Energy-based category for tasks (Focus, Flow, Recharge)  
**Pulse** - Daily energy/mood check-in captured 3x daily  
**Inbox** - Triage area for quick task capture  
**Pathway** - Project or journey (wellness terminology)  
**Smart List** - Auto-generated task view  
**FAB** - Floating Action Button  
**Natural Language** - Parsing conversational input  
**Kanban** - Visual board with columns  
**Time of Day** - Task grouping by Morning/Afternoon/Evening  
**HITL** - Human-in-the-Loop (approval workflow)  
**Confidence Score** - AI certainty rating (0.0-1.0)

### Appendix D: Migration from Competing Approaches

**If choosing different options than recommended**:

---

## ✅ Next Steps

1. **Prioritize features** from the phases based on user feedback
2. **Assign development** to frontend team for Phase 1 completion
3. **Set up AI integration** for intelligent inbox processing
4. **Create design system** with chosen color palette and typography
5. **Build prototype** of key screens for user testing

---

**Next Review Date**: November 1, 2025  
**Version Control**: See git history for changes

---

_This consolidated PRD represents the complete vision for OmniMomentum. By making clear decisions on the flagged items, you'll have a precise roadmap for implementation that balances user research, technical feasibility, and business goals._
