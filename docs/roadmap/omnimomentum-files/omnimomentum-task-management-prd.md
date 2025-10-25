# Product Requirements Document: OmniMomentum Task Management System

## Executive Summary

This PRD outlines the comprehensive task management system for wellness practitioners within the OmniMomentum module. Based on extensive research into the top task management tools used by yoga teachers, massage therapists, alternative therapy practitioners, and solopreneur parents (Trello, Todoist, Asana), this system combines proven UI/UX patterns with wellness-specific workflows to create a task management experience that feels familiar yet distinctly helpful for our target audience.

**Key Insight**: Wellness practitioners need task management that balances professional client work, business operations, personal wellness, and family responsibilities—all while maintaining their own energy and well-being. Our system integrates energy-aware task routing with familiar patterns from industry-leading tools.

---

## Problem Statement

Wellness practitioners face unique task management challenges:

### The Juggling Act
- **Multiple life domains**: Client work, business operations, personal wellness, family responsibilities
- **Energy fluctuations**: Variable energy levels throughout the day impact task completion capacity
- **Client-centric work**: Many tasks tied to specific clients requiring context switching
- **Irregular schedules**: Teaching schedules, client sessions, and personal time create non-standard workdays
- **Overwhelm vulnerability**: As empaths and caregivers, wellness practitioners are susceptible to task list overwhelm

### Current Solution Gaps
- Generic task apps don't understand wellness business workflows
- No integration between energy levels and task prioritization
- Client context separated from task management
- No support for wellness-specific routines (morning rituals, client prep, self-care)
- Overwhelming interfaces that increase anxiety rather than reduce it

---

## Goals & Objectives

### Primary Goals

1. **Reduce cognitive load** through smart task organization and energy-aware prioritization
2. **Integrate client context** so tasks are connected to the people they serve
3. **Support wellness routines** with recurring task patterns for practitioners' unique workflows
4. **Provide visual clarity** using proven Kanban and list patterns that feel calming, not cluttered
5. **Enable quick capture** because practitioners need to log tasks between client sessions

### Success Metrics

**Adoption & Engagement**
- 85%+ of active users create at least one task within first 3 days
- Average 15-25 tasks created per user per week
- 70%+ daily active usage (users check tasks daily)
- 60%+ task completion rate within 7 days of creation

**User Experience**
- <3 seconds to add a new task (from anywhere in app)
- <2 clicks to view today's tasks
- 4.5+ star rating for "ease of use" in feedback surveys
- 40%+ reduction in reported "overwhelm" compared to previous tools

**Integration**
- 50%+ of tasks linked to specific clients (OmniClients integration)
- 30%+ of tasks created via Daily Pulse widget
- 25%+ of users use both list and board views regularly

**Performance**
- Task list loads in <300ms for databases with up to 500 active tasks
- Drag-and-drop operations complete in <100ms
- Natural language parsing completes in <200ms

---

## User Research Insights

### Top 3 Apps Wellness Practitioners Currently Use

#### 1. Trello (Visual Kanban Champion)
**Why they love it**:
- Intuitive drag-and-drop card system appeals to visual thinkers
- Separate boards for business/personal provide clear mental compartmentalization
- Satisfying tactile feeling of moving cards creates sense of progress
- Color-coded labels enable quick categorization without reading

**Primary use cases**:
- Client journey mapping (inquiry → consultation → active → completed)
- Content planning for social media campaigns
- Workshop/class planning with preparation stages
- Personal wellness goals and habit tracking

#### 2. Todoist (Balanced Power Tool)
**Why they love it**:
- Natural language processing: "Follow up with Sarah tomorrow at 2pm p1 @clients"
- Quick Add with keyboard shortcut for capturing between sessions
- Today view intelligently groups overdue + current tasks
- Karma points add gentle gamification

**Primary use cases**:
- Daily task lists with morning/afternoon routines
- Client follow-up reminders and session prep
- Recurring practice tasks (weekly posts, monthly bookkeeping, daily self-care)
- Cross-platform (iPhone during sessions, Mac for planning)

#### 3. Asana (Project Planning Powerhouse)
**Why they love it**:
- Familiar list-based interface (like paper to-do lists)
- Team features valuable when hiring assistants
- Multiple view options (list, board, calendar)
- Templates enable reuse of common workflows

**Primary use cases**:
- Multi-phase project planning (course launches, retreats)
- Team collaboration with assistants
- Client program tracking with deliverable stages
- Marketing campaign management

### Common Patterns Across All Three

**Quick Add Systems**
- Floating Action Button (FAB) in bottom-right corner
- Global keyboard shortcuts (Todoist: 'Q', Things: Cmd+N)
- Inline input fields (not interrupting modal dialogs)

**Natural Language Processing**
- Type conversationally: "Call mom next Wednesday about medication; remind me at 8am"
- Visual feedback: recognized text highlights as you type
- Support various date formats, times, recurrence patterns, priority, labels

**List View Fundamentals**
- Checkbox always on left (Western reading pattern)
- Task title: medium weight font (500-600), 14-16px
- Metadata: colored badges/chips for dates, priorities, labels
- Time-based sections (Morning, Afternoon, Evening)

**Kanban Board Pattern**
- Vertical columns for workflow stages
- Horizontal cards flowing left-to-right
- Drag-and-drop with tactile satisfaction
- Color labels along card top edge

**Calming Visual Design**
- Soft, muted color palettes (not harsh primaries)
- Generous white space and padding
- Subtle shadows and gradients
- Smooth animations and transitions

---

## Product Vision

### What We're Building

**OmniMomentum** is an energy-aware task management system that combines the visual clarity of Trello, the quick-capture power of Todoist, and the project planning depth of Asana—specifically designed for wellness practitioners juggling client work, business operations, and personal well-being.

### Unique Value Propositions

**1. Energy-Aware Task Routing**
- Daily Pulse widget captures energy/mood 3x daily (AM, PM, Night)
- AI Zone Routing automatically suggests tasks matching current energy level
- High energy → Complex client work, content creation, business strategy
- Medium energy → Client follow-ups, administrative tasks, planning
- Low energy → Simple data entry, reviewing notes, self-care

**2. Client Context Integration**
- Tasks linked directly to client records (OmniClients)
- Quick view of all tasks for specific client
- Client context visible when viewing task details
- Auto-tag tasks by client for filtering

**3. Wellness Business Templates**
- Pre-built workflows: New Client Onboarding, Workshop Planning, Monthly Content Calendar
- Recurring routines: Morning Practice Setup, Post-Session Notes, Weekly Bookkeeping
- Program pathways: 6-Week Program Delivery, Retreat Planning Checklist

**4. Calming, Familiar Interface**
- Adopts proven patterns from Trello/Todoist/Asana
- Soft color palette and generous spacing
- Smooth animations that feel meditative, not jarring
- Empty states that encourage, not overwhelm

---

## Current Implementation Status

### ✅ Completed Backend Infrastructure (Phase 1)

Based on the codebase analysis, the following are fully implemented:

**Database Schema**
- `momentum_projects` table with RLS
- `momentum_tasks` table with RLS
- `momentum_goals` table with RLS
- `momentum_inbox` table with RLS
- `momentum_daily_pulse_log` table with RLS
- `momentum_time_blocks` table with RLS
- `momentum_contact_links` table (client integration)

**Repository Layer** (`packages/repo/src/momentum.repo.ts`)
- Complete CRUD operations for all entities
- Type-safe query building with proper guards
- Filtering and searching capabilities
- Client linking functionality

**Service Layer** (`src/server/services/momentum.service.ts`)
- Business logic for tasks, projects, goals, inbox
- Comprehensive filtering and stats
- Zone-based task organization
- Contact integration

**API Routes**
- `/api/omni-momentum/tasks`
- `/api/omni-momentum/projects`
- `/api/omni-momentum/goals`
- `/api/omni-momentum/inbox`
- `/api/omni-momentum/stats`
- `/api/omni-momentum/daily-pulse`

**React Hooks** (`src/hooks/use-momentum.ts`)
- Full React Query integration
- Optimistic updates with rollback
- TypeScript-safe operations
- Proper error handling

### ✅ Completed Frontend Components

**Widgets** (Already Built)
- `DailyPulseWidget.tsx` - Energy tracking with AM/PM/Night pulses
- `ActiveProjectsWidget.tsx` - Project cards with progress
- `TasksByZoneWidget.tsx` - Zone-based task organization

**Views** (Already Built)
- `TaskView.tsx` - Task list with filtering
- `ProjectView.tsx` - Project management interface
- `InboxView.tsx` - Quick capture inbox
- `GoalsView.tsx` - Goal tracking system

**Layouts**
- `OmniMomentumLayout.tsx` - Module container with navigation

### 🔨 Needs Refactoring/Enhancement

Based on research, these existing components need updates:

**1. Task List View** (Currently in `TaskView.tsx`)
- ✅ Has: Basic list rendering, checkboxes
- ❌ Missing: Time-based grouping (Morning/Afternoon/Evening)
- ❌ Missing: Natural language input
- ❌ Missing: Swipe gestures (mobile)
- ❌ Missing: Inline quick-add field
- 🔧 Needs: Refactor to match Todoist/Things patterns

**2. Quick Add System**
- ✅ Has: Floating Action Button in some views
- ❌ Missing: Global keyboard shortcut (e.g., 'Q' key)
- ❌ Missing: Consistent FAB placement across all views
- ❌ Missing: Natural language parser
- 🔧 Needs: Unified quick-add component used everywhere

**3. Board/Kanban View**
- ❌ Missing: Complete Kanban board implementation
- ❌ Missing: Drag-and-drop functionality
- ❌ Missing: Custom column configuration
- 🔧 Needs: Full build using dnd-kit library

**4. Task Detail View**
- ✅ Has: Basic task editing
- ❌ Missing: Subtasks/checklist support
- ❌ Missing: Client linking UI
- ❌ Missing: Rich text notes
- ❌ Missing: Attachment support
- 🔧 Needs: Enhanced detail modal/side panel

**5. Project Templates**
- ❌ Missing: Template system
- ❌ Missing: Wellness-specific templates
- 🔧 Needs: Full template infrastructure

---

## Functional Requirements

### FR1: Task Management Core

#### FR1.1: Task Data Model

```typescript
interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | null;
  due_time: string | null; // HH:MM format
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'anytime' | null;
  zone: 'focus' | 'flow' | 'recharge' | null;
  estimated_duration: number | null; // minutes
  project_id: string | null;
  parent_task_id: string | null; // for subtasks
  contact_id: string | null; // OmniClients link
  tags: string[]; // from shared tags table
  recurrence_rule: string | null; // RRULE format
  is_recurring: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

#### FR1.2: Task Creation

**Quick Add (Inline)**
- Input field always visible at top of task list
- Placeholder: "Add a task... (try: 'Call Sarah tomorrow at 2pm')"
- Natural language parsing on blur or Enter key
- Creates task immediately with parsed metadata
- Auto-focus after task creation for rapid entry

**Quick Add (FAB)**
- Floating Action Button positioned bottom-right (56x56px)
- Fixed position, stays visible during scroll
- Blue gradient background with "+" icon
- Opens inline input or modal (configurable)
- Keyboard shortcut: 'Q' key (global, works anywhere)

**Natural Language Parser**
```
Input: "Follow up with Sarah tomorrow at 2pm p1 @client"

Parsed Result:
- Title: "Follow up with Sarah"
- Due Date: [tomorrow's date]
- Due Time: "14:00"
- Priority: high (p1)
- Tags: ["client"]
- Time of Day: afternoon (auto-detected from 2pm)

Visual Feedback:
- "tomorrow" highlighted in blue
- "at 2pm" highlighted in blue
- "p1" highlighted in red
- "@client" highlighted in purple
```

**Supported Natural Language Patterns**
- Dates: today, tomorrow, next Monday, in 3 days, Jan 15, 2025-01-15
- Times: at 2pm, morning, 14:00, at 9:30am
- Recurrence: daily, every Monday, every 2 weeks, monthly
- Priority: p1, p2, p3, p4 (or !, !!, !!!)
- Tags: @tag-name, #project-name
- Duration: for 30min, 1h, 2 hours

#### FR1.3: Task Display (List View)

**Layout Structure**
```
┌──────────────────────────────────────────────────────────────┐
│ Morning (3)                                                   │
├──────────────────────────────────────────────────────────────┤
│ ☐ Morning meditation practice                    [08:00] 🔵  │
│ ☐ Review client notes before sessions           [09:30] 🟢  │
│ ☐ Prep workshop materials                       [10:00] 🟡  │
├──────────────────────────────────────────────────────────────┤
│ Afternoon (5)                                                 │
├──────────────────────────────────────────────────────────────┤
│ ☐ Follow up with Sarah re: nutrition plan       [14:00] 🔴  │
│ ☑ Client session with Maria                      [15:00] ✓   │
│ ☐ Update website with new class schedule        [16:30] 🟢  │
└──────────────────────────────────────────────────────────────┘
```

**Time-Based Grouping**
- Morning: 5am - 11:59am
- Afternoon: 12pm - 4:59pm
- Evening: 5pm - 9:59pm
- Night: 10pm - 4:59am
- Anytime: Tasks without time_of_day

**Task Row Components**
- **Checkbox** (left): 24x24px, 44x44px touch target
- **Priority Indicator** (left of title): Colored dot (8px diameter)
  - 🔴 Urgent/P1: Red
  - 🟠 High/P2: Orange
  - 🟡 Medium/P3: Yellow
  - 🟢 Low/P4: Green
- **Task Title** (primary): 15px, weight 500, #1F2937
- **Time Badge** (right): 12px, gray background, [HH:MM]
- **Client Avatar** (right): If contact_id exists, show 32px avatar
- **Tags** (below title): Small colored pills, max 3 visible

**Visual States**
- Default: Black text, white background
- Hover: Light gray background (#F9FAFB)
- Completed: Gray text (#9CA3AF), strikethrough, checkbox checked
- Overdue: Red accent border-left (3px)
- In Progress: Blue accent border-left (3px)

#### FR1.4: Task Interactions

**Checkbox Click**
- Instant mark as complete (optimistic update)
- Strikethrough animation (300ms)
- Slide out after 2 seconds with fade (optional, user setting)
- Undo toast appears for 5 seconds

**Task Row Click**
- Opens task detail side panel (slide from right, 400px width)
- Detail panel includes:
  - Full title (editable)
  - Description (rich text editor)
  - Due date picker
  - Time picker
  - Priority selector
  - Tags multi-select
  - Project dropdown
  - Client link (search/select from OmniClients)
  - Subtasks/checklist
  - Attachments
  - Activity log

**Mobile Swipe Gestures**
- **Right swipe** → Complete task (green background reveals)
- **Left swipe** → Show action menu (Edit, Reschedule, Delete)
- **Long press** → Multi-select mode activates

**Bulk Actions**
- Select multiple tasks via checkboxes
- Bulk actions bar appears at top
- Actions: Mark complete, Change priority, Add tag, Move to project, Delete

#### FR1.5: Task Filtering & Search

**Left Sidebar Filters**
```
┌─────────────────────────────────┐
│ Smart Lists                     │
├─────────────────────────────────┤
│ 📥 Inbox            (12)        │
│ ⭐ Today            (8)         │
│ 📅 Upcoming         (23)        │
│ 🎯 High Priority    (5)         │
│                                 │
│ Projects                        │
├─────────────────────────────────┤
│ ▸ New Client Onboarding (3)    │
│ ▾ Workshop Planning (7)         │
│   └─ Content Creation           │
│   └─ Marketing Materials        │
│ ▸ Personal Wellness (4)         │
│                                 │
│ Zones                           │
├─────────────────────────────────┤
│ ⚡ Focus Zone        (5)        │
│ 🌊 Flow Zone         (8)        │
│ 🌸 Recharge Zone     (3)        │
│                                 │
│ Tags                            │
├─────────────────────────────────┤
│ Filter by Tags...               │
│ [Client] (12) [Business] (8)    │
│ [Content] (5) [Self-care] (3)   │
└─────────────────────────────────┘
```

**Smart Lists** (Auto-generated)
- **Inbox**: All unprocessed tasks (no zone, no project)
- **Today**: Due today + overdue + time_of_day matches current
- **Upcoming**: Due within next 7 days
- **High Priority**: urgent or high priority
- **No Due Date**: Tasks without due_date
- **Completed**: Tasks marked done (filtered out by default)

**Search Bar**
- Full-text search across title and description
- Search operators:
  - `#project-name` - Filter by project
  - `@tag` - Filter by tag
  - `@client-name` - Filter by client
  - `priority:high` - Filter by priority
  - `due:today` - Filter by due date
  - `zone:focus` - Filter by zone

#### FR1.6: Recurring Tasks

**Recurrence Patterns**
- Daily: Every day at [time]
- Weekdays: Monday-Friday
- Weekly: Every [Monday] at [time]
- Bi-weekly: Every 2 weeks on [Monday]
- Monthly: Day [15] of every month
- Custom: RRULE format for advanced patterns

**Recurrence Behavior**
- Checking off recurring task creates next instance immediately
- Next instance due date calculated from recurrence rule
- Original task remains in history (for tracking)
- Modify recurrence: Update this instance only OR all future instances

**Common Wellness Practitioner Patterns**
- Daily morning routine: "Morning meditation - Every day at 7am"
- Weekly class prep: "Prepare yoga sequence - Every Thursday at 6pm"
- Monthly bookkeeping: "Review financials - 1st of every month"
- Bi-weekly newsletter: "Send newsletter - Every other Monday"

---

### FR2: Kanban Board View

#### FR2.1: Board Structure

**Default Columns** (Customizable)
```
┌────────────┬────────────┬────────────┬────────────┐
│ To Do      │ In Progress│ Review     │ Done       │
│ (15)       │ (8)        │ (3)        │ (47)       │
├────────────┼────────────┼────────────┼────────────┤
│ [Card]     │ [Card]     │ [Card]     │ [Card]     │
│ [Card]     │ [Card]     │            │ [Card]     │
│ [Card]     │ [Card]     │            │ [Card]     │
│ + Add card │            │            │            │
└────────────┴────────────┴────────────┴────────────┘
```

**Wellness-Specific Column Presets**
- **Client Journey**: Inquiry → Consultation → Active → Completed
- **Content Creation**: Ideas → Draft → Review → Published
- **Program Delivery**: Planning → Active → Follow-up → Archived
- **Simple**: To Do → Doing → Done

**Column Configuration**
- Add new columns (max 8 per board)
- Rename columns
- Reorder columns (drag-and-drop)
- Set column limits (WIP limits)
- Archive/hide columns

#### FR2.2: Task Card Anatomy

**Card Visual Design** (280px width, auto height)
```
┌──────────────────────────────────────────────────┐
│ [Client] [High Priority]                     ︙   │  ← Labels (top)
│                                                   │
│ Follow up with Sarah about nutrition plan        │  ← Title
│                                                   │
│ 📅 Tomorrow at 2pm                               │  ← Due date/time
│ 👤 Sarah Martinez                                │  ← Client
│ ✓ 2/5 subtasks                                   │  ← Progress
│                                                   │
│ 💬 3  📎 1                                       │  ← Comments, attachments
└──────────────────────────────────────────────────┘
```

**Card Components**
- **Color Labels** (top edge): 8px height strip, up to 4 colors
- **Card Title**: 14px, weight 500, max 3 lines with ellipsis
- **Due Date Badge**: Calendar icon + "Tomorrow at 2pm" (yellow if today, red if overdue)
- **Client Avatar**: 24px rounded avatar if contact_id exists
- **Progress Indicator**: Checklist completion (e.g., "2/5 subtasks")
- **Metadata Icons**: Comments count, attachments count, description indicator
- **Menu Button** (top right): Three-dot menu (⋮)

**Card Interactions**
- **Click**: Open task detail side panel
- **Drag**: Lift card with shadow, show drop zones
- **Menu**: Quick actions (Edit, Duplicate, Delete, Move to)

#### FR2.3: Drag-and-Drop Behavior

**Visual Feedback**
- **On grab**: Card lifts with 8px shadow, 2° rotation
- **While dragging**: Drop zones highlight with blue dashed border
- **On hover over column**: Column background lightens, border appears
- **On drop**: Card snaps into position with ease-out animation (200ms)
- **Mobile**: Haptic feedback on grab and drop

**Drop Rules**
- Cards can be reordered within same column
- Cards can be moved between columns
- Dropping on column header moves to top
- Dropping between cards inserts at that position
- Status auto-updates based on column mapping:
  - "To Do" column → status: 'todo'
  - "In Progress" column → status: 'in_progress'  
  - "Done" column → status: 'done'

**Implementation** (dnd-kit)
```typescript
import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Collision detection: closestCorners (better for Kanban)
// Sorting strategy: verticalListSortingStrategy
// Accessibility: Keyboard navigation (Space to grab, Arrow keys to move, Space to drop)
```

#### FR2.4: Board Views

**View Modes**
- **All Tasks**: Show all active tasks across all columns
- **My Tasks**: Show only tasks assigned to current user (future team feature)
- **High Priority**: Filter to urgent/high priority only
- **Client View**: Group by client instead of status
- **Zone View**: Organize by Focus/Flow/Recharge zones

**Board Settings**
- **Card size**: Compact (minimal info) / Regular / Detailed
- **Show completed**: Toggle visibility of Done column
- **Grouping**: By status, priority, client, zone, project
- **Sort within columns**: Manual, due date, priority, created date

---

### FR3: Projects & Organization

#### FR3.1: Project Structure

```typescript
interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string; // hex color
  icon: string | null; // emoji or icon name
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  start_date: Date | null;
  target_completion: Date | null;
  client_id: string | null; // link to specific client project
  template_id: string | null; // if created from template
  settings: {
    default_view: 'list' | 'board' | 'calendar';
    board_columns: string[]; // custom column names
  };
  stats: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
  };
  created_at: Date;
  updated_at: Date;
}
```

#### FR3.2: Project Templates

**Pre-built Wellness Templates**

**1. New Client Onboarding**
```
Stages: Inquiry → Initial Consultation → Onboarding → Active Client

Included Tasks:
□ Send welcome packet and intake form
□ Schedule initial consultation call
□ Review intake form responses
□ Prepare personalized program plan
□ Send program welcome email
□ Schedule first 3 sessions
□ Add to client portal
□ Set up recurring check-in reminders
```

**2. Workshop/Event Planning**
```
Stages: Planning → Marketing → Pre-Event → Event Day → Follow-up

Included Tasks:
□ Define workshop topic and learning outcomes
□ Book venue or set up virtual platform
□ Create workshop outline and materials
□ Design promotional graphics
□ Launch registration page
□ Email marketing campaign (3 emails)
□ Prepare participant materials
□ Set up space and technology
□ Run workshop
□ Send follow-up email with resources
□ Request testimonials/feedback
```

**3. Monthly Content Calendar**
```
Stages: Ideation → Creation → Scheduling → Publishing → Engagement

Included Tasks:
□ Brainstorm content themes for month
□ Create 4 blog post outlines
□ Write Blog Post #1
□ Design graphics for social media
□ Schedule social posts for week 1
□ Record video/podcast content
□ Edit and upload media
□ Respond to comments and DMs
□ Analyze engagement metrics
```

**4. 6-Week Client Program Delivery**
```
Stages: Week 1 → Week 2 → Week 3 → Week 4 → Week 5 → Week 6 → Graduation

Included Tasks (per week):
□ Send week materials and resources
□ Conduct weekly group call
□ Review client progress and homework
□ Provide personalized feedback
□ Answer questions in community
□ Track client results
(Final week adds graduation tasks)
```

**5. Retreat Planning**
```
Stages: Concept → Logistics → Marketing → Pre-Retreat → Retreat Week → Follow-up

Included Tasks:
□ Choose retreat location and dates
□ Negotiate venue contract
□ Plan daily schedule and activities
□ Hire additional facilitators/staff
□ Create retreat webpage and registration
□ Market retreat via email and social media
□ Send pre-retreat information packet
□ Purchase supplies and materials
□ Travel to venue and set up
□ Facilitate retreat
□ Send post-retreat survey
□ Share photos and testimonials
```

**Template Features**
- One-click project creation from template
- Customize task names, due dates, and stages
- Save custom workflows as personal templates
- Share templates (future team feature)

#### FR3.3: Project Views

**Project List View**
```
┌─────────────────────────────────────────────────────────────┐
│ Active Projects                                  [+ New]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🌟 New Client Onboarding                          ▸         │
│    Sarah Martinez • 5/8 tasks complete • Due: Oct 30        │
│    [███████░░░░░░░░] 62%                                    │
│                                                              │
│ 📝 Workshop: Managing Stress                     ▸         │
│    Marketing Stage • 12/20 tasks • Due: Nov 15             │
│    [██████░░░░░░░░░] 60%                                    │
│                                                              │
│ 📅 Q4 Content Calendar                           ▸         │
│    Week 3 • 15/40 tasks • On track                         │
│    [████░░░░░░░░░░░] 37%                                    │
└─────────────────────────────────────────────────────────────┘
```

**Project Detail View**
- Tabs: Overview | Tasks | Board | Timeline | Settings
- **Overview Tab**: Project description, key milestones, team members, client info
- **Tasks Tab**: Filtered task list showing only project tasks
- **Board Tab**: Kanban board with project-specific columns
- **Timeline Tab** (Future): Gantt-style timeline view
- **Settings Tab**: Project name, color, dates, template, archive

---

### FR4: Inbox & Quick Capture

#### FR4.1: Inbox Purpose

The Inbox serves as a **triage zone** for rapid task capture without requiring full categorization. It reduces friction by letting practitioners quickly log tasks during busy moments, then process them later when they have mental bandwidth.

**Key Principles**
- **Frictionless capture**: Add task in 2 seconds or less
- **Process later**: Can remain in inbox until user has time to organize
- **Optional processing**: Some tasks can live in inbox forever (it's okay!)
- **Energy-based routing**: AI can suggest zones during processing

#### FR4.2: Inbox Interface

**Quick Capture Input**
```
┌───────────────────────────────────────────────────────────┐
│ Inbox (12 items)                                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ [Type quickly here... e.g. "call mom tomorrow"]          │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ ☐ Follow up with Sarah about her progress                │
│   2 hours ago                                 [Process]   │
│                                                            │
│ ☐ Update website with November class schedule            │
│   Yesterday                                   [Process]   │
│                                                            │
│ ☐ Order more essential oils for classes                  │
│   3 days ago • Suggested Zone: Recharge      [Process]   │
└───────────────────────────────────────────────────────────┘
```

**Inbox Item Actions**
- **Click checkbox**: Mark as done (removes from inbox)
- **Click "Process"**: Opens processing modal
- **Click item**: Opens full task editor
- **Swipe left (mobile)**: Archive without processing
- **Bulk process**: Select multiple → Bulk assign zone/project

#### FR4.3: Processing Modal

**Step-by-Step Processing**
```
┌─────────────────────────────────────────────────────────┐
│ Process: "Follow up with Sarah about her progress"     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ This task feels like... (AI suggestion: 🌊 Flow Zone)  │
│ ⚡ Focus Zone    🌊 Flow Zone    🌸 Recharge Zone       │
│                                                          │
│ Add to project?                                         │
│ [Select project...] or [Create new project]            │
│                                                          │
│ Link to client?                                         │
│ [🔍 Search clients...] → "Sarah Martinez"              │
│                                                          │
│ When should this be done?                               │
│ [📅 Due date...] [⏰ Time...]                           │
│                                                          │
│ Priority level?                                         │
│ Low  Medium  High  Urgent                               │
│                                                          │
│ Add tags?                                               │
│ [+] [Client Follow-up] [Check-in]                      │
│                                                          │
│         [Skip for Now]    [Save to Tasks]              │
└─────────────────────────────────────────────────────────┘
```

**Processing Shortcuts**
- **Quick Zone**: Click zone icon without opening modal
- **Quick Project**: Drag inbox item onto project in sidebar
- **Quick Delete**: Swipe left to archive
- **Bulk Process**: Select multiple → Apply same zone/project

#### FR4.4: AI Zone Routing (Phase 2)

**How It Works**
1. Practitioner captures task in inbox
2. AI analyzes task title and description
3. Suggests appropriate zone based on:
   - Task complexity (Focus: complex, Flow: moderate, Recharge: simple)
   - Task type (Focus: strategic, Flow: creative, Recharge: administrative)
   - Energy requirements (Focus: high, Flow: medium, Recharge: low)
   - Practitioner's historical patterns

**AI Suggestion Display**
```
☐ Write blog post about mindfulness techniques
  Suggested Zone: 🌊 Flow Zone (Writing & creative tasks match your flow pattern)
  
☐ Review quarterly business metrics
  Suggested Zone: ⚡ Focus Zone (Strategic analysis requires deep focus)
  
☐ File client receipts for bookkeeping
  Suggested Zone: 🌸 Recharge Zone (Simple data entry, low energy required)
```

**User Control**
- Suggestions are optional, never forced
- User can accept with one click or change zone
- System learns from user corrections
- Toggle AI suggestions off in settings

---

### FR5: Daily Pulse Integration

#### FR5.1: How Daily Pulse Drives Task Prioritization

The **Daily Pulse Widget** (already implemented) captures practitioner energy levels 3x daily:
- **Morning Pulse** (5am-11:59am): How are you starting the day?
- **Afternoon Pulse** (12pm-4:59pm): How's your energy holding up?
- **Evening Pulse** (5pm-9:59pm): Reflecting on your day

**Energy Levels** (1-5 scale)
- 🔋🔋🔋🔋🔋 (5): Peak energy, ready for complex work
- 🔋🔋🔋🔋☐ (4): High energy, productive
- 🔋🔋🔋☐☐ (3): Moderate energy, steady
- 🔋🔋☐☐☐ (2): Low energy, need simple tasks
- 🔋☐☐☐☐ (1): Depleted, rest needed

**Mood Options** (9 choices)
- 🤩 Amazing
- 😄 Excellent  
- 😊 Good
- 😌 Calm
- 😐 Okay
- 😴 Tired
- 😔 Low
- 😫 Drained
- 😤 Frustrated

#### FR5.2: Energy-Aware Task Suggestions

**"Right Now" Smart List**
Based on current time and latest pulse:

```
┌──────────────────────────────────────────────────────┐
│ Right Now (Afternoon, Energy: 🔋🔋🔋☐☐ Medium)      │
├──────────────────────────────────────────────────────┤
│ Perfect tasks for your current energy:               │
│                                                       │
│ ☐ Review client notes before 3pm session            │
│   🌊 Flow Zone • 30 min • Client: Maria             │
│                                                       │
│ ☐ Update social media with workshop announcement    │
│   🌊 Flow Zone • 15 min                              │
│                                                       │
│ ☐ Follow up with 3 new inquiries via email          │
│   🌊 Flow Zone • 45 min                              │
│                                                       │
│ Too tired for these? Try Recharge tasks instead →   │
└──────────────────────────────────────────────────────┘
```

**Matching Logic**
- **High Energy (4-5)** → Show Focus Zone tasks (strategic, complex)
- **Medium Energy (3)** → Show Flow Zone tasks (creative, moderate)
- **Low Energy (1-2)** → Show Recharge Zone tasks (simple, administrative)
- **Mood context**: Frustrated/Drained → Suggest solo tasks, avoid client calls

#### FR5.3: Pulse History & Pattern Recognition

**Weekly Pulse Pattern View**
```
┌────────────────────────────────────────────────────┐
│ Your Energy Patterns                               │
├────────────────────────────────────────────────────┤
│ Best for Focus work: Tuesday/Thursday mornings     │
│ Peak Flow state: Wednesday afternoons              │
│ Recharge needed: Friday afternoons                 │
│                                                     │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                 │
│ AM   🔋🔋  🔋🔋🔋 🔋🔋🔋 🔋🔋🔋 🔋🔋  🔋🔋🔋 🔋🔋    │
│ PM   🔋🔋  🔋🔋  🔋🔋🔋 🔋🔋  🔋   🔋🔋  🔋      │
│ Eve  🔋   🔋   🔋🔋  🔋   🔋   🔋🔋  🔋🔋    │
└────────────────────────────────────────────────────┘
```

**Insights** (AI-powered, Phase 2)
- "You're most productive Tuesday mornings—schedule important client calls then"
- "Your energy dips Friday afternoons—save admin tasks for that time"
- "You completed 80% more tasks on days when you logged your morning pulse"

---

### FR6: Client Integration (OmniClients Link)

#### FR6.1: Linking Tasks to Clients

**Why This Matters**
Wellness practitioners' work revolves around clients. Linking tasks to specific clients provides:
- **Context**: See what needs to be done for each client at a glance
- **Client view**: View all tasks related to a specific client
- **Automation**: Auto-create tasks when client actions occur (e.g., books appointment)

#### FR6.2: Task-to-Client Linking UI

**In Task Detail Panel**
```
┌─────────────────────────────────────────────────────┐
│ Task Details                                        │
├─────────────────────────────────────────────────────┤
│ Title: Follow up on nutrition plan                 │
│                                                      │
│ Client                                              │
│ [🔍 Link to client...]                              │
│                                                      │
│ (Starts typing "Sar")                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ 👤 Sarah Martinez                            │   │
│ │    Active Client • Last session: Oct 15     │   │
│ │                                              │   │
│ │ 👤 Sarah Johnson                             │   │
│ │    New Client • Inquiry: Oct 10             │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ (After selection)                                   │
│ Client: 👤 Sarah Martinez                          │
│         [View Profile] [Remove Link]               │
└─────────────────────────────────────────────────────┘
```

**Auto-linking**
- When creating task from client profile → Automatically linked
- Natural language: "Follow up with Sarah tomorrow" → Searches for client named Sarah, suggests link
- From email/calendar sync → Link task to client based on email address

#### FR6.3: Client-Specific Task Views

**In OmniClients Module - Client Profile**
```
┌─────────────────────────────────────────────────────┐
│ Sarah Martinez                                      │
│ Active Client • Nutrition Coaching                  │
├─────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Tasks] [Notes] [Appointments]    │
├─────────────────────────────────────────────────────┤
│ Tasks (5)                                           │
│ ☐ Review food journal and provide feedback         │
│   Due: Tomorrow • Priority: High                   │
│                                                      │
│ ☐ Send Week 3 meal plan and recipes                │
│   Due: Oct 25                                       │
│                                                      │
│ ☐ Schedule mid-program check-in call               │
│   Due: Oct 30                                       │
│                                                      │
│ ☑ Send welcome packet                              │
│   Completed: Oct 15                                 │
│                                                      │
│ [+ Add task for Sarah]                             │
└─────────────────────────────────────────────────────┘
```

**Filter by Client in OmniMomentum**
- Sidebar filter: "👤 Filter by Client"
- Type-ahead search for client name
- Shows all tasks linked to that client
- Quick switch between clients

#### FR6.4: Client Automation Triggers

**Auto-create Tasks on Client Actions**
- **New client inquiry** → Create "Follow up with [Name] about inquiry"
- **Appointment booked** → Create "Prepare for session with [Name]" (day before)
- **Appointment completed** → Create "Write session notes for [Name]" (immediately after)
- **Program starts** → Create task sequence from program template
- **Client hasn't responded in 7 days** → Create "Check in with [Name]"

**Configuration** (Settings → Automations)
- Toggle auto-task creation on/off
- Customize task titles and timing
- Set which client stages trigger tasks

---

### FR7: Search & Filters

#### FR7.1: Global Search

**Search Bar** (Always visible in top header)
```
┌──────────────────────────────────────────────────────┐
│ [🔍 Search tasks, projects, clients...]              │
└──────────────────────────────────────────────────────┘
```

**Search Results** (Grouped by type)
```
┌──────────────────────────────────────────────────────┐
│ Tasks (8 results)                                    │
│ ☐ Follow up with Sarah about nutrition plan         │
│ ☐ Update Sarah's meal plan for week 3               │
│                                                       │
│ Projects (2 results)                                 │
│ 📁 New Client Onboarding - Sarah Martinez           │
│                                                       │
│ Clients (1 result)                                   │
│ 👤 Sarah Martinez - Active Client                   │
└──────────────────────────────────────────────────────┘
```

**Search Operators**
- `#project-name` → Search within project
- `@tag` → Filter by tag
- `@client-name` → Search tasks for client
- `priority:high` → Filter by priority
- `due:today` → Due date filters
- `zone:focus` → Filter by zone
- `status:todo` → Filter by status
- `completed:last-week` → Completed date range

**Example Searches**
- "Sarah" → All tasks/projects for client Sarah
- "#workshop priority:high" → High-priority tasks in Workshop project
- "@content due:this-week" → Content tasks due this week
- "zone:focus due:today" → Focus tasks due today

#### FR7.2: Advanced Filters

**Filter Panel** (Collapsible in sidebar)
```
┌─────────────────────────────────────────────────┐
│ Filters                                  [Clear]│
├─────────────────────────────────────────────────┤
│ Status                                          │
│ ☑ To Do    ☑ In Progress    ☐ Done             │
│                                                  │
│ Priority                                        │
│ ☐ Urgent   ☐ High   ☐ Medium   ☐ Low           │
│                                                  │
│ Due Date                                        │
│ ☐ Overdue  ☐ Today  ☐ This Week  ☐ This Month  │
│                                                  │
│ Zone                                            │
│ ☐ Focus    ☐ Flow    ☐ Recharge                │
│                                                  │
│ Project                                         │
│ [Select project...]                             │
│                                                  │
│ Client                                          │
│ [Select client...]                              │
│                                                  │
│ Tags                                            │
│ [Select tags...]                                │
│                                                  │
│          [Apply Filters]                        │
└─────────────────────────────────────────────────┘
```

**Saved Filters** (Custom views)
- Save filter combinations with names
- Examples:
  - "Urgent Client Work" = High priority + Client-linked + Due this week
  - "Content Creation" = @content tag + Flow zone
  - "Admin Tasks" = Recharge zone + Low priority
- Quick access from sidebar dropdown
- Share saved filters (team feature)

---

### FR8: Notifications & Reminders

#### FR8.1: Task Reminders

**Reminder Types**
- **Due date reminder**: At start of due date, configurable (e.g., 9am)
- **Time-specific reminder**: At task's due_time (e.g., "Call at 2pm" → remind at 2pm)
- **Custom reminder**: Set custom reminder separate from due date
- **Recurring reminder**: For recurring tasks, remind before each instance
- **Overdue reminder**: Daily reminder for overdue tasks (until completed or snoozed)

**Reminder Channels**
- In-app notification (bell icon)
- Browser push notification
- Email (optional, configurable)
- SMS (future, premium feature)

**Reminder Settings** (Per-task)
```
Remind me:
○ At due date (9:00 AM default)
○ 1 day before
○ 1 hour before
○ At specific time: [HH:MM]
○ Custom: [Select date & time]
```

#### FR8.2: In-App Notifications

**Notification Bell** (Top right of header)
```
┌──────────────────────────────────────────────────┐
│ Notifications (3 unread)                 [Clear] │
├──────────────────────────────────────────────────┤
│ ● Follow up with Sarah about nutrition plan     │
│   Due today at 2:00 PM                          │
│   [View Task] [Snooze 1h]                       │
│                                                  │
│ ● Morning meditation practice                   │
│   Overdue by 2 hours                            │
│   [Complete] [Reschedule]                       │
│                                                  │
│ ○ Workshop materials ready for review            │
│   Completed by you • 1 hour ago                 │
└──────────────────────────────────────────────────┘
```

**Notification Types**
- 🔴 Overdue task
- 🟡 Task due soon
- 🔵 Task due today
- ✅ Task completed (for recurring tasks that generated next instance)
- 👤 Task assigned to you (team feature)
- 💬 Comment on your task (team feature)

**Notification Actions**
- **View Task**: Opens task detail panel
- **Complete**: Mark task as done
- **Snooze**: Remind again in 1h, 3h, tomorrow, next week
- **Reschedule**: Opens date picker to change due date
- **Dismiss**: Clear notification

---

## Technical Requirements

### TR1: Technology Stack

**Frontend**
- React 18+ with TypeScript
- Next.js 14+ (App Router)
- TanStack React Query (data fetching)
- Zustand (global state)
- dnd-kit (drag-and-drop)
- date-fns (date manipulation)
- Framer Motion (animations)

**UI Components**
- shadcn/ui (component library)
- Tailwind CSS (styling)
- Radix UI (headless components)
- Lucide Icons (icon system)

**Backend**
- Next.js API Routes
- TypeScript service layer
- Repository pattern (existing)
- PostgreSQL with Supabase
- Row Level Security (RLS)

**Testing**
- Vitest (unit tests)
- React Testing Library
- Playwright (E2E tests)

### TR2: Performance Requirements

**Load Times**
- Task list initial render: <300ms (up to 500 active tasks)
- Project list initial render: <200ms (up to 50 active projects)
- Search results: <150ms (debounced, 300ms delay)
- Drag-and-drop response: <100ms
- Natural language parse: <200ms

**Database Query Optimization**
- Indexes on: user_id, status, due_date, priority, project_id, contact_id
- Composite indexes for common filters
- Database-level pagination (limit/offset)
- Materialized views for stats and analytics

**Caching Strategy**
- React Query cache: 5 minutes for task lists, 10 minutes for projects
- Optimistic updates for all mutations
- Background refetch on window focus
- Stale-while-revalidate pattern

### TR3: Natural Language Parser

**Implementation Approach**

**Phase 1: Regex-based Parser** (MVP)
```typescript
// Date patterns
const datePatterns = {
  today: /\btoday\b/i,
  tomorrow: /\btomorrow\b/i,
  nextWeek: /\bnext\s+(mon|tue|wed|thu|fri|sat|sun)/i,
  inXDays: /\bin\s+(\d+)\s+days?\b/i,
  specificDate: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i,
};

// Time patterns
const timePatterns = {
  atTime: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  morning: /\bmorning\b/i,
  afternoon: /\bafternoon\b/i,
  evening: /\bevening\b/i,
};

// Priority patterns
const priorityPatterns = {
  p1: /\bp1\b|\b!!!\b/i,
  p2: /\bp2\b|\b!!\b/i,
  p3: /\bp3\b|\b!\b/i,
};

// Tag patterns
const tagPattern = /@([\w-]+)/g;
```

**Phase 2: AI-Enhanced Parser** (Future)
- Use GPT-4 API for complex natural language
- Contextual understanding (knows client names, project names)
- Multi-language support
- Intent detection (creating task vs. asking question)

### TR4: Mobile Responsiveness

**Breakpoints**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Mobile-Specific Patterns**
- **Bottom Navigation**: Task views accessible via bottom tab bar
- **Full-Screen Modals**: Task detail opens as full-screen modal (not side panel)
- **Swipe Gestures**: Right swipe complete, left swipe menu
- **FAB**: Floating Action Button 56x56px, bottom-right, 16px margin
- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Pull-to-Refresh**: Refresh task list with pull gesture

**Progressive Disclosure**
- Show essential info in list view (title, due date, checkbox)
- Hide metadata (tags, project, zone) until task clicked
- Collapsible sections in task detail

### TR5: Offline Support (Future)

**Service Worker Caching**
- Cache task lists, projects, and client data
- Queue mutations when offline
- Sync when connection restored
- Show offline indicator in UI

**Conflict Resolution**
- Timestamp-based: Newest write wins
- User notification: "This task was modified on another device"
- Manual conflict resolution for critical changes

### TR6: Accessibility

**WCAG 2.1 AA Compliance**
- Keyboard navigation: Tab through all interactive elements
- Focus indicators: Visible 2px blue outline
- Screen reader: ARIA labels on all actions
- Color contrast: Minimum 4.5:1 for text, 3:1 for UI components
- Skip links: "Skip to main content"

**Keyboard Shortcuts**
- `Q`: Quick add task
- `F`: Focus search
- `/`: Toggle filters
- `Escape`: Close modals
- `Cmd/Ctrl + Enter`: Submit forms
- `Cmd/Ctrl + K`: Command palette (future)

**Screen Reader Announcements**
- "Task completed: [task name]"
- "3 tasks due today"
- "Dragging task: [task name]"
- "Dropped task in [column name]"

---

## UI/UX Requirements

### UX1: Visual Design System

**Color Palette** (Calming, Nature-Inspired)
```
Primary Colors:
- Blue (Focus): #3B82F6 (Sky Blue)
- Teal (Flow): #14B8A6 (Ocean Teal)
- Green (Recharge): #10B981 (Forest Green)

Priority Colors:
- Urgent: #EF4444 (Red)
- High: #F59E0B (Amber)
- Medium: #3B82F6 (Blue)
- Low: #6B7280 (Gray)

Neutral Colors:
- Text Primary: #1F2937 (Gray-800)
- Text Secondary: #6B7280 (Gray-500)
- Border: #E5E7EB (Gray-200)
- Background: #F9FAFB (Gray-50)
- Surface: #FFFFFF (White)

Gradients (for widgets):
- Blue: from-blue-50 to-indigo-50
- Teal: from-teal-50 to-cyan-50
- Green: from-green-50 to-emerald-50
```

**Typography**
```
Font Family: Inter (system fallback: -apple-system, SF Pro)

Sizes:
- Headings: 24px (H1), 20px (H2), 18px (H3)
- Task Title: 15px, weight 500
- Body Text: 14px, weight 400
- Small Text: 12px, weight 400
- Button: 14px, weight 500

Line Height:
- Headings: 1.2
- Body: 1.5
- Task titles: 1.4
```

**Spacing Scale** (8px base)
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px

**Border Radius**
- Small: 4px (badges, pills)
- Medium: 8px (cards, buttons)
- Large: 12px (modals, widgets)
- Full: 9999px (avatars, rounded pills)

**Shadows**
```
sm: 0 1px 2px rgba(0, 0, 0, 0.05)
md: 0 4px 6px rgba(0, 0, 0, 0.07)
lg: 0 10px 15px rgba(0, 0, 0, 0.1)
xl: 0 20px 25px rgba(0, 0, 0, 0.15)
```

### UX2: Micro-Interactions

**Button Hover**
- Scale: 102% (transform)
- Transition: 150ms ease-out
- Cursor: pointer

**Task Checkbox**
- Hover: Border thickens (1px → 2px)
- Checked: Green fill with white checkmark
- Animation: Checkmark draws in (300ms)

**Task Complete**
- Strikethrough: Animated left-to-right (300ms)
- Opacity: Fade to 60%
- Delay: Slide out after 2 seconds (optional setting)

**Card Drag**
- Lift: 8px shadow, 2° rotation
- Cursor: grabbing
- Drop: Ease-out animation (200ms)

**Loading States**
- Skeleton screens (pulse animation)
- Spinner: Rotating blue circle
- Progress bar: Indeterminate wave for unknown duration

**Success Feedback**
- Toast notification: Slide in from top-right
- Icon: Green checkmark
- Auto-dismiss: 3 seconds
- Sound: Soft "ding" (optional, user preference)

### UX3: Empty States

**No Tasks**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│            ✨ No tasks yet!                     │
│                                                  │
│   You're all caught up. Take a moment to       │
│   breathe and celebrate your clear mind.        │
│                                                  │
│          [+ Add Your First Task]                │
│                                                  │
│   Or try: "Call Sarah tomorrow at 2pm"         │
│                                                  │
└─────────────────────────────────────────────────┘
```

**No Projects**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│          📁 No projects yet                     │
│                                                  │
│   Projects help you organize tasks into        │
│   meaningful workflows.                         │
│                                                  │
│       [+ Create First Project]                  │
│       [Browse Templates]                        │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Inbox Empty**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│           ✓ Inbox Zero!                         │
│                                                  │
│   You've processed everything. Well done!       │
│                                                  │
│   New thoughts? Capture them anytime with       │
│   the + button or press 'Q'                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**No Results (Search/Filter)**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│          🔍 No tasks found                      │
│                                                  │
│   Try adjusting your filters or search term.   │
│                                                  │
│          [Clear Filters]                        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### UX4: Error States

**Failed to Load Tasks**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│          ⚠️ Couldn't load tasks                 │
│                                                  │
│   Something went wrong. Please try again.       │
│                                                  │
│          [Retry]                                │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Failed to Create Task**
```
Toast notification:
❌ Couldn't create task
   Please check your connection and try again.
   [Retry]
```

**Network Error**
```
Banner at top of page:
⚠️ You're offline. Changes will sync when you reconnect.
```

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-4)
**Goal**: Ship functional task management with core features

**Week 1-2: Task List Refactor**
- ✅ Refactor `TaskView.tsx` to match research patterns
- ✅ Implement time-based grouping (Morning/Afternoon/Evening)
- ✅ Add inline quick-add input field
- ✅ Implement swipe gestures (mobile)
- ✅ Add task detail side panel

**Week 3: Quick Add & FAB**
- ✅ Build unified quick-add component
- ✅ Add FAB to all views (consistent placement)
- ✅ Implement global keyboard shortcut ('Q')
- ✅ Basic natural language parser (dates, times, priorities)

**Week 4: Projects & Organization**
- ✅ Enhance project list view
- ✅ Project detail view with tabs
- ✅ Move existing project components to new structure
- ✅ Basic filtering in sidebar

**Acceptance Criteria**:
- [ ] User can add task in <3 seconds from anywhere
- [ ] Tasks grouped by time of day
- [ ] Natural language works for: dates, times, priorities
- [ ] FAB present on all views
- [ ] Project tasks filterable
- [ ] Mobile swipe gestures work

---

### Phase 2: Enhanced UX (Weeks 5-8)
**Goal**: Add Kanban board, advanced filters, templates

**Week 5-6: Kanban Board**
- ✅ Build board view with dnd-kit
- ✅ Custom column configuration
- ✅ Drag-and-drop between columns
- ✅ Board/List view toggle
- ✅ Card visual design matching research

**Week 7: Advanced Filtering**
- ✅ Advanced filter panel in sidebar
- ✅ Saved filter views
- ✅ Global search with operators
- ✅ Tag integration (from tags PRD)

**Week 8: Project Templates**
- ✅ Template system infrastructure
- ✅ 5 pre-built wellness templates
- ✅ One-click project creation from template
- ✅ Template customization

**Acceptance Criteria**:
- [ ] Kanban board fully functional with smooth drag-and-drop
- [ ] Users can save custom filter views
- [ ] Search works with operators (@, #, priority:, due:)
- [ ] Templates available and work end-to-end

---

### Phase 3: Client Integration (Weeks 9-11)
**Goal**: Deep integration with OmniClients module

**Week 9: Client Linking**
- ✅ Task-to-client linking UI
- ✅ Client search/select in task detail
- ✅ Auto-linking from client profile
- ✅ Client filter in task lists

**Week 10: Client Views**
- ✅ Tasks tab in client profile
- ✅ Quick add task for client
- ✅ Client-specific task views in OmniMomentum

**Week 11: Client Automations**
- ✅ Auto-create tasks on client actions
- ✅ Template tasks for new clients
- ✅ Client stage-based task triggers

**Acceptance Criteria**:
- [ ] Tasks linkable to clients
- [ ] Client profile shows all related tasks
- [ ] Auto-tasks create on client events
- [ ] Natural language recognizes client names

---

### Phase 4: AI Integration (Weeks 12-15)
**Goal**: Energy-aware task routing and intelligent prioritization

**Week 12-13: Zone Routing**
- ✅ AI model integration for zone suggestions
- ✅ Analyze task complexity and energy needs
- ✅ Learn from user corrections
- ✅ Zone suggestion UI in inbox processing

**Week 14: "Right Now" Smart List**
- ✅ Integrate Daily Pulse data
- ✅ Build "Right Now" task suggestions
- ✅ Energy-based task filtering
- ✅ Mood-based recommendations

**Week 15: Pattern Recognition**
- ✅ Weekly pulse pattern analysis
- ✅ Productivity insights dashboard
- ✅ Best time recommendations for task types

**Acceptance Criteria**:
- [ ] AI suggests zones with 70%+ accuracy
- [ ] "Right Now" list updates based on pulse
- [ ] Weekly pattern insights visible
- [ ] User can accept/reject AI suggestions easily

---

### Phase 5: Polish & Optimization (Weeks 16-18)
**Goal**: Performance, accessibility, mobile experience

**Week 16: Performance**
- ✅ Query optimization (database indexes)
- ✅ React Query cache tuning
- ✅ Lazy loading for large lists
- ✅ Virtual scrolling for 500+ tasks

**Week 17: Accessibility**
- ✅ Keyboard navigation testing
- ✅ Screen reader testing and fixes
- ✅ Color contrast audit
- ✅ ARIA labels complete

**Week 18: Mobile Polish**
- ✅ Mobile gesture refinement
- ✅ Bottom sheet interactions
- ✅ Touch target verification
- ✅ Performance testing on real devices

**Acceptance Criteria**:
- [ ] Load time <300ms for 500 tasks
- [ ] WCAG 2.1 AA compliant
- [ ] All features work on mobile
- [ ] 60fps animations and interactions

---

### Phase 6: Future Enhancements (Post-Launch)
**Nice-to-Have Features**

**Collaboration**
- Team workspaces
- Task assignment
- Comments and mentions
- Activity feed

**Calendar Integration**
- Two-way sync with OmniRhythm (calendar module)
- Time blocking from tasks
- Drag tasks onto calendar
- Calendar view of tasks

**Advanced Automation**
- IFTTT-style automation builder
- Zapier integration
- Webhook triggers
- Custom automation rules

**Analytics & Insights**
- Task completion trends
- Productivity heatmaps
- Time tracking per task/project
- Energy vs. productivity correlation

**Voice Input**
- Voice-to-text task capture
- Voice commands for task management
- Mobile voice input optimization

---

## Component Migration Plan

### Existing Components to Refactor

#### 1. DailyPulseWidget.tsx ✅ KEEP AS-IS
**Status**: Well-implemented, matches research
**Location**: Keep in `omni-momentum/_components/`
**Changes**: None needed—this component is solid

#### 2. TaskView.tsx 🔧 NEEDS MAJOR REFACTOR
**Current Issues**:
- No time-based grouping
- Missing inline quick-add
- No natural language support
- Basic task display

**Refactor Plan**:
```
TaskView.tsx (Current)
├─ Move basic list to TaskList.tsx (new component)
├─ Add TaskListHeader.tsx (with inline quick-add)
├─ Add TimeSection.tsx (Morning/Afternoon/Evening groups)
├─ Add TaskRow.tsx (enhanced with all metadata)
├─ Add TaskDetailPanel.tsx (side panel)
└─ Keep TaskView.tsx as container orchestrating all
```

#### 3. ProjectView.tsx 🔧 NEEDS REFACTOR
**Current Issues**:
- Basic project list only
- Missing project detail view
- No templates

**Refactor Plan**:
```
ProjectView.tsx
├─ Split into ProjectList.tsx
├─ Add ProjectCard.tsx (for each project)
├─ Add ProjectDetail.tsx (with tabs)
├─ Add ProjectTemplates.tsx (template browser)
└─ Keep ProjectView.tsx as router between list/detail
```

#### 4. InboxView.tsx 🔧 NEEDS ENHANCEMENT
**Current Issues**:
- Missing AI zone routing
- Basic processing flow

**Enhancement Plan**:
```
InboxView.tsx
├─ Add ProcessingModal.tsx (step-by-step processing)
├─ Add ZoneRoutingSuggestion.tsx (AI component)
├─ Add QuickProcessActions.tsx (one-click zone assignment)
└─ Enhanced InboxView.tsx with all new sub-components
```

#### 5. GoalsView.tsx ✅ KEEP (Lower Priority)
**Status**: Goals are separate feature, can iterate later
**Changes**: Minor UI polish only

### New Components to Build

#### High Priority (Phase 1-2)

```
/omni-momentum/_components/
├─ TaskList/
│  ├─ TaskList.tsx               [NEW]
│  ├─ TaskListHeader.tsx         [NEW]
│  ├─ TimeSection.tsx            [NEW]
│  ├─ TaskRow.tsx                [NEW]
│  └─ TaskDetailPanel.tsx        [NEW]
│
├─ QuickAdd/
│  ├─ QuickAddFAB.tsx           [NEW]
│  ├─ QuickAddInput.tsx         [NEW]
│  ├─ NaturalLanguageParser.ts  [NEW]
│  └─ ParsedMetadataDisplay.tsx [NEW]
│
├─ Board/
│  ├─ KanbanBoard.tsx           [NEW]
│  ├─ KanbanColumn.tsx          [NEW]
│  ├─ KanbanCard.tsx            [NEW]
│  └─ ColumnSettings.tsx        [NEW]
│
├─ Filters/
│  ├─ FilterSidebar.tsx         [NEW]
│  ├─ AdvancedFilters.tsx       [NEW]
│  ├─ SavedFilters.tsx          [NEW]
│  └─ FilterChips.tsx           [NEW]
│
└─ Projects/
   ├─ ProjectTemplates.tsx       [NEW]
   ├─ TemplateCard.tsx          [NEW]
   ├─ TemplatePreview.tsx       [NEW]
   └─ CreateFromTemplate.tsx    [NEW]
```

---

## Testing Requirements

### Unit Tests

**TaskList Component**
```typescript
describe('TaskList', () => {
  it('groups tasks by time of day', () => {
    const morningTask = TaskFactory.build({ time_of_day: 'morning' });
    const afternoonTask = TaskFactory.build({ time_of_day: 'afternoon' });
    
    render(<TaskList tasks={[morningTask, afternoonTask]} />);
    
    expect(screen.getByText('Morning (1)')).toBeInTheDocument();
    expect(screen.getByText('Afternoon (1)')).toBeInTheDocument();
  });
  
  it('handles empty time sections gracefully', () => {
    const anytimeTask = TaskFactory.build({ time_of_day: null });
    
    render(<TaskList tasks={[anytimeTask]} />);
    
    expect(screen.queryByText('Morning')).not.toBeInTheDocument();
    expect(screen.getByText('Anytime (1)')).toBeInTheDocument();
  });
});
```

**Natural Language Parser**
```typescript
describe('NaturalLanguageParser', () => {
  it('parses "tomorrow at 2pm" correctly', () => {
    const input = "Call Sarah tomorrow at 2pm";
    const result = parseTask(input);
    
    expect(result.title).toBe("Call Sarah");
    expect(result.due_date).toEqual(addDays(new Date(), 1));
    expect(result.due_time).toBe("14:00");
    expect(result.time_of_day).toBe("afternoon");
  });
  
  it('parses priority indicators', () => {
    const result = parseTask("Important task p1");
    expect(result.priority).toBe("urgent");
  });
  
  it('parses tags', () => {
    const result = parseTask("Create content @social-media");
    expect(result.tags).toContain("social-media");
  });
});
```

### Integration Tests

**Task Creation Flow**
```typescript
describe('Task Creation', () => {
  it('creates task with natural language and displays correctly', async () => {
    const user = userEvent.setup();
    
    render(<TaskView />);
    
    // Type in quick-add input
    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Call Sarah tomorrow at 2pm p1');
    await user.keyboard('{Enter}');
    
    // Task should appear in list
    await waitFor(() => {
      expect(screen.getByText('Call Sarah')).toBeInTheDocument();
      expect(screen.getByText(/tomorrow/i)).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();
    });
    
    // Should be in "Afternoon" section
    const afternoonSection = screen.getByText('Afternoon');
    expect(within(afternoonSection).getByText('Call Sarah')).toBeInTheDocument();
  });
});
```

**Kanban Drag and Drop**
```typescript
describe('Kanban Board', () => {
  it('moves task between columns and updates status', async () => {
    const task = TaskFactory.build({ status: 'todo' });
    
    render(<KanbanBoard />);
    
    const taskCard = screen.getByText(task.title);
    const inProgressColumn = screen.getByText('In Progress');
    
    // Drag task to "In Progress" column
    await dragAndDrop(taskCard, inProgressColumn);
    
    // Verify API call
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.id,
        expect.objectContaining({ status: 'in_progress' })
      );
    });
  });
});
```

### E2E Tests (Playwright)

**Complete Task Management Flow**
```typescript
test('wellness practitioner daily workflow', async ({ page }) => {
  // Login
  await page.goto('/omni-momentum');
  
  // Log morning pulse
  await page.click('button:has-text("Daily Pulse")');
  await page.click('[data-energy="4"]'); // High energy
  await page.click('[data-mood="good"]');
  await page.click('button:has-text("Save")');
  
  // Add task with natural language
  await page.keyboard.press('q'); // Quick add shortcut
  await page.fill('input[placeholder*="Add a task"]', 'Review Sarah\'s nutrition plan at 2pm p1');
  await page.keyboard.press('Enter');
  
  // Verify task appears in "Afternoon" section
  await expect(page.locator('text=Afternoon')).toBeVisible();
  await expect(page.locator('text=Review Sarah\'s nutrition plan')).toBeVisible();
  
  // Complete the task
  await page.click('input[type="checkbox"]:near(:text("Review Sarah"))');
  
  // Verify completion animation and removal
  await expect(page.locator('text=Review Sarah\'s nutrition plan')).toHaveClass(/line-through/);
  await page.waitForTimeout(2000); // Wait for slide-out animation
  await expect(page.locator('text=Review Sarah\'s nutrition plan')).not.toBeVisible();
  
  // Switch to board view
  await page.click('button:has-text("Board")');
  await expect(page.locator('text=To Do')).toBeVisible();
  await expect(page.locator('text=In Progress')).toBeVisible();
  await expect(page.locator('text=Done')).toBeVisible();
});
```

---

## Open Questions & Decisions Needed

### Q1: Natural Language Parser Complexity
**Question**: Should we start with regex-based parser or integrate AI (GPT-4) from day 1?

**Options**:
- **A**: Regex parser (Phase 1) → AI enhancement (Phase 2)
- **B**: GPT-4 integration from start

**Recommendation**: Option A (staged approach)
- Lower initial complexity
- Faster MVP
- Can validate patterns before AI investment
- GPT-4 adds cost per parse

---

### Q2: Recurring Task Handling
**Question**: When user completes a recurring task, should next instance be created immediately or on the scheduled date?

**Options**:
- **A**: Create immediately (Todoist model)
- **B**: Create on scheduled date (Apple Reminders model)

**Recommendation**: Option A (create immediately)
- Allows users to see upcoming recurring tasks in "Upcoming" view
- More predictable behavior
- Matches Todoist (most popular with our audience)

---

### Q3: Task Completion Animation
**Question**: Should completed tasks slide out after 2 seconds or stay in list?

**Options**:
- **A**: Slide out after 2 seconds (Todoist)
- **B**: Stay in list with strikethrough (Things)
- **C**: User setting (configurable)

**Recommendation**: Option C (configurable)
- Different practitioners have different preferences
- Default to slide-out (cleaner list)
- Provide setting to keep completed tasks visible

---

### Q4: Project Hierarchy
**Question**: Should projects support sub-projects (nested structure)?

**Options**:
- **A**: Flat project list only
- **B**: Two-level hierarchy (project → sub-project)
- **C**: Unlimited nesting

**Recommendation**: Option A for Phase 1, Option B for Phase 3
- Start simple to validate core workflows
- Add sub-projects if users request it
- Avoid complexity of unlimited nesting

---

### Q5: Mobile App vs. PWA
**Question**: Should we build native mobile apps or rely on Progressive Web App?

**Options**:
- **A**: PWA only (responsive web)
- **B**: Native iOS + Android apps
- **C**: PWA + React Native for native features

**Recommendation**: Option A (PWA) for Phase 1-2
- Faster development
- Single codebase
- Good enough mobile experience with service workers
- Evaluate native apps post-launch based on user feedback

---

## Success Criteria & KPIs

### Adoption Metrics
- **Week 1**: 60% of users add at least 5 tasks
- **Month 1**: 80% of active users use task management daily
- **Month 3**: Average 25 tasks per user per week

### Engagement Metrics
- **Task Completion Rate**: 60%+ within 7 days
- **Daily Pulse Usage**: 40%+ log pulse at least once daily
- **View Diversity**: 25%+ use both list and board views
- **Quick Add Usage**: 70%+ tasks created via quick-add (vs. full form)

### User Satisfaction
- **NPS Score**: 50+ (promoters - detractors)
- **Ease of Use**: 4.5+ / 5 stars
- **Feature Request**: <20% request features from competitors we don't have
- **Churn**: <5% stop using due to task management issues

### Performance Metrics
- **Load Time**: 95th percentile <500ms
- **Drag Response**: 95th percentile <150ms
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% of API calls fail

---

## Glossary

**Zone** - Energy-based category for tasks (Focus, Flow, Recharge)
**Pulse** - Daily energy/mood check-in captured 3x daily
**Inbox** - Triage area for quick task capture before full processing
**Smart List** - Auto-generated task view (Today, Upcoming, High Priority)
**FAB** - Floating Action Button for quick task creation
**Natural Language** - Parsing conversational input into structured data
**Kanban** - Visual board with columns representing workflow stages
**Time of Day** - Task grouping by Morning, Afternoon, Evening, Night
**Recurring Task** - Task that repeats on a schedule (daily, weekly, etc.)
**Subtask** - Checklist item within a larger task

---

## Appendix: Research Sources

This PRD is based on extensive research including:

**Task Management Apps**
- Trello - Visual Kanban boards
- Todoist - Natural language and balanced power
- Asana - Project planning and team collaboration
- Apple Reminders - Time-based grouping
- Google Tasks - Simplicity and integration
- Things for Mac - Beautiful design patterns

**Wellness Practitioner Insights**
- Clinic Sense, Massage Therapy apps
- Moms and Co productivity research
- Solopreneur wellness business patterns
- Yoga and alternative therapy workflows

**UI/UX Best Practices**
- Mobile UX design patterns
- Kanban board implementations
- Natural language parsing systems
- Accessibility standards (WCAG 2.1)

---

**Version**: 1.0  
**Last Updated**: October 21, 2025  
**Owner**: Product Team  
**Status**: Ready for Engineering Implementation  

**Current Backend**: ✅ FULLY IMPLEMENTED  
**Frontend Status**: 🔧 Partial (needs refactoring per this PRD)  
**Next Phase**: Begin Phase 1 implementation (Weeks 1-4)
