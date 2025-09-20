# OmniMomentum Implementation Guide

## Project Overview

This document provides comprehensive guidance for implementing the OmniMomentum productivity suite for wellness practitioners within the OmniCRM platform. This is the AI-powered "dump everything" inbox and task management system specifically designed for wellness solopreneurs.

## Essential Reading

### Primary Requirements Documents
1. **Product Requirements Document**: `docs/roadmap/Product Requirements Document_ Wellness Task Management App.md`
2. **Research Document**: `docs/roadmap/implementation/RhythmModuleResearch.md`
3. **ESLint Configuration**: `eslint.config.mjs` - Contains strict TypeScript rules that MUST be followed

### Key Research Insights

From the wellness practitioner research, these findings are CRITICAL for success:

- **78% prefer simple list views** over Kanban boards for task management
- **Top requested feature**: AI-powered inbox where users can "dump everything"
- **Wellness terminology**: Use "Pathways," "Pulse," "Journey," "Flow" instead of technical terms
- **Progressive disclosure**: Show only top 3 priorities to avoid overwhelming users
- **Mobile-first**: Practitioners manage tasks between client sessions on mobile devices
- **Invisible AI**: Intelligence embedded organically, not prominently displayed as "AI features"

## Architecture Status (COMPLETED)

The following backend infrastructure has been fully implemented:

### ✅ Database Layer
- **Schema**: Complete OmniMomentum tables in `src/server/db/schema.ts`
- **Tables**: zones, inbox_items, projects, tasks, goals, daily_pulse_logs
- **Migration**: Applied via `supabase/sql/24_omnimomenutm_schema_rebuild.sql`

### ✅ Data Access Layer
- **DTOs**: `packages/contracts/src/inbox.ts` and `packages/contracts/src/zones.ts`
- **Repositories**: `packages/repo/src/inbox.repo.ts` and `packages/repo/src/zones.repo.ts`
- **Validation**: Comprehensive Zod schemas for all data operations

### ✅ Business Logic
- **Inbox Service**: `src/server/services/inbox.service.ts` with full AI integration
- **OpenRouter Integration**: AI categorization into 6 wellness zones
- **Voice Support**: Voice-to-text capture with transcription
- **Bulk Processing**: Multiple item AI analysis

### ✅ API Layer
- **Routes**: `/api/zones`, `/api/inbox`, `/api/inbox/process`, `/api/inbox/[itemId]`
- **Validation**: Request/response validation with proper error handling
- **CSRF Protection**: All routes use standard security patterns

### ✅ Frontend State Management
- **Hooks**: `src/hooks/use-inbox.ts` and `src/hooks/use-zones.ts`
- **React Query**: Optimistic updates, proper cache management
- **Query Keys**: Added to `src/lib/queries/keys.ts`

## Current Implementation Plan

### Page Structure (Server Component Architecture)

Based on the research, the optimal layout strategy is:

#### 1. Server Component (page.tsx)
- **Authentication check** using `getServerUserId()`
- **Metadata** for SEO and wellness practitioner context
- **Static layout shell** with non-interactive elements
- **Daily wellness indicators** that load from server

#### 2. Client Components (Progressive Disclosure)
- **MomentumSidebar** - Zone-based navigation following existing patterns
- **DailyPulseWidget** - Quick wellness check-in (energy stars, sleep slider, mood emojis)
- **TodaysFocusSection** - Top 3 priorities (not overwhelming task dumps)
- **QuickCaptureInbox** - Prominent "dump everything" input field
- **MomentumMainContent** - Dynamic routing based on selected zone/section

### Layout Strategy (Research-Driven)

#### Header Section
- **Daily Pulse Widget** - 1-5 star energy rating, 3-7+ hours sleep slider, mood emojis
- **Wellness Zone Indicators** - Subtle badges showing status of 6 life-business zones
- **Motivational Greeting** - Today's date with wellness-appropriate messaging

#### Sidebar Navigation
Based on wellness practitioner terminology:
- **Focus** - Today's top 3 priorities (not overwhelming lists)
- **Pathways** - Projects and templated workflows
- **Journey** - Goals (practitioner business + personal + client wellness)
- **Pulse** - Analytics, insights, and wellness correlation data

#### Main Content (Progressive Disclosure)
- **Default View**: Today's Focus with top 3 priorities
- **Quick Capture**: Prominently placed "dump everything" input
- **AI Suggestions**: Contextual recommendations (e.g., "30 minutes between clients - perfect time to update Sarah's nutrition plan")
- **Zone Views**: Simple list-based task management (NOT Kanban boards)

## Critical Implementation Requirements

### ESLint Compliance (MANDATORY)

The codebase has STRICT TypeScript rules that cannot be violated:

```typescript
// ✅ REQUIRED patterns:
export async function componentFunction(): Promise<JSX.Element> {
  // Explicit return types required
}

// ✅ REQUIRED error handling:
try {
  await someAsyncOperation();
} catch (error) {
  // Handle errors explicitly, no floating promises
}

// ❌ FORBIDDEN:
const data = response as any; // No 'any' types
const result = getData()!; // No non-null assertions
// @ts-ignore // No TypeScript disables
const [unused] = useState(); // No unused variables
```

Key ESLint rules:
- `@typescript-eslint/no-explicit-any`: "error"
- `@typescript-eslint/explicit-function-return-type`: "error"
- `@typescript-eslint/no-floating-promises`: "error"
- `@typescript-eslint/no-unused-vars`: "error"
- `unused-imports/no-unused-imports`: "error"

### File Organization Patterns

Follow the established codebase structure:

```
src/app/(authorisedRoute)/omni-momentum/
├── page.tsx                           # Server component with auth + metadata
├── _components/
│   ├── MomentumSidebar.tsx           # Navigation (existing - needs integration)
│   ├── OmniMomentumPage.tsx          # Main client component (existing - needs refactor)
│   ├── DailyPulseWidget.tsx          # Wellness check-in widget
│   ├── TodaysFocusSection.tsx        # Top 3 priorities view
│   ├── QuickCaptureInbox.tsx         # AI-powered capture input
│   └── MomentumMainContent.tsx       # Dynamic content router
```

### Wellness Zones (6 Core Areas)

These are the life-business zones that all tasks/projects categorize into:

1. **Personal Wellness** - Self-care, personal health goals
2. **Self Care** - Mindfulness, energy management, boundaries
3. **Admin & Finances** - Business operations, invoicing, taxes
4. **Business Development** - Growth, partnerships, strategy
5. **Social Media & Marketing** - Content creation, campaigns, engagement
6. **Client Care** - Client sessions, follow-ups, program delivery

### API Integration Patterns

All components MUST use the established patterns:

```typescript
// ✅ REQUIRED API pattern:
import { apiClient } from "@/lib/api/client";

const data = await apiClient.get<ResponseType>("/api/inbox");
// apiClient automatically handles CSRF tokens, error formatting

// ❌ FORBIDDEN:
const response = await fetch("/api/inbox"); // Missing CSRF protection
```

### React Query Integration

Use the existing hooks for state management:

```typescript
// ✅ REQUIRED pattern:
import { useInbox } from "@/hooks/use-inbox";

const { items, quickCapture, processItem, isLoading } = useInbox({
  filters: { status: ["unprocessed"] }
});

// Hooks provide optimistic updates, error handling, cache management
```

## Critical Success Factors

### 1. Wellness Practitioner UX (MANDATORY)

- **Simple List Views**: Do NOT implement Kanban boards as default
- **Minimal Cognitive Load**: Maximum 3 priorities shown at once
- **Touch-Friendly**: Large buttons, easy mobile interaction
- **Calming Colors**: Wellness-appropriate aesthetic (not aggressive business software)
- **Quick Capture**: Input field must be prominently visible and accessible

### 2. AI Integration Philosophy

- **Invisible Intelligence**: AI categorization happens in background
- **Contextual Suggestions**: Based on schedule, energy levels, client needs
- **Supportive Tone**: AI suggestions should feel helpful, not demanding
- **Wellness Language**: Use journey/growth terminology, not technical jargon

### 3. Mobile-First Design

Wellness practitioners use this between client sessions:
- **Large touch targets** (minimum 44x44 pixels)
- **Quick capture** accessible with minimal taps
- **Offline capability** for basic task entry
- **Fast loading** of priority information

## Existing Components (DO NOT RECREATE)

These components already exist and should be integrated:

1. **MomentumSidebar.tsx** - Navigation component following sidebar patterns
2. **OmniMomentumPage.tsx** - Main page component with QuickCaptureInput
3. **All backend services** - Inbox service, repositories, API routes are complete

## Next Implementation Steps

### Phase 1: Server Component Foundation
1. Create `page.tsx` server component with auth and metadata
2. Build static layout shell with wellness zone indicators
3. Implement Daily Pulse widget (server-rendered where possible)

### Phase 2: Client Component Integration
1. Refactor existing `OmniMomentumPage.tsx` to fit new layout
2. Create composable components for each main section
3. Update `AppSidebarController.tsx` to include MomentumSidebar routing

### Phase 3: Progressive Disclosure Implementation
1. Implement "Focus" view as default (top 3 priorities)
2. Add zone-based content switching
3. Integrate AI suggestions contextually

### Phase 4: Mobile Optimization
1. Ensure touch-friendly interactions
2. Test quick capture flow on mobile devices
3. Optimize loading performance for between-session use

## Potential Pitfalls (CRITICAL TO AVOID)

### 1. Technical Debt Creation
- **Never use TypeScript disables** - Fix the underlying issue
- **Never use `any` types** - Create proper interfaces
- **Never skip error handling** - Wellness practitioners need reliable tools

### 2. UX Anti-Patterns
- **Don't default to Kanban** - Research shows 78% prefer lists
- **Don't show all tasks** - Overwhelming interfaces cause abandonment
- **Don't use technical terminology** - Use wellness-appropriate language

### 3. Performance Issues
- **Don't block UI on AI processing** - Use optimistic updates
- **Don't over-fetch data** - Mobile practitioners have limited bandwidth
- **Don't skip loading states** - Provide feedback during processing

## Testing Strategy

When implementing, ensure:
1. **Mobile responsiveness** on actual devices
2. **AI processing performance** under load
3. **Offline capability** for basic task management
4. **Cross-browser compatibility** for practitioner workflows

## Resources for Context

- **Existing implementations**: Study `omni-clients` patterns for consistency
- **Sidebar patterns**: All `_components/`*`Sidebar.tsx` files show established patterns
- **API patterns**: All `/api/` routes demonstrate proper validation and error handling
- **Hook patterns**: All `/hooks/use-*.ts` files show React Query integration

This implementation directly serves wellness solopreneurs' most critical productivity need: an intelligent system that reduces cognitive overhead while maintaining the personal touch essential to their practice.

---

## Implementation Handover Documentation

**Date**: September 20, 2025
**Status**: Core UI Complete - Ready for Next Feature Phase
**Completed By**: Claude Code Assistant
**Next Developer Context**: This section provides complete handover information

### Current Implementation Status

#### ✅ **COMPLETED - Phase 1: Core UI & Foundation (September 2025)**

**Frontend Architecture Completed:**
- **Server Component Architecture**: `page.tsx` with authentication and metadata
- **Static Layout Shell**: `MomentumPageLayout.tsx` with wellness zone indicators
- **Client Components**: Progressive disclosure following research findings
- **Sidebar Integration**: `MomentumSidebar.tsx` integrated with `AppSidebarController.tsx`
- **Research-Driven UX**: 78% prefer lists, max 3 priorities, wellness terminology

**Key Components Implemented:**
1. **`OmniMomentumPage.tsx`** - Main dashboard with "dump everything" interface
2. **`TodaysFocusSection.tsx`** - Research-based 3-priority focus view
3. **`DailyPulseWidget.tsx`** - Wellness check-in (energy, sleep, mood tracking)
4. **`QuickCaptureInput`** - AI-powered inbox with voice integration placeholder
5. **`MomentumSidebar.tsx`** - Zone-based navigation with live stats

**Technical Debt Compliance:**
- ✅ **DTO/Repository Pattern**: All components use `@omnicrm/contracts` DTOs
- ✅ **TypeScript Strict**: Explicit return types, no `any` types, proper error handling
- ✅ **ESLint Zero-Tolerance**: No floating promises, unused imports, or violations
- ✅ **Server/Client Separation**: Proper Next.js App Router architecture

**Backend Infrastructure Ready:**
- ✅ **Database Schema**: Complete momentum tables in `src/server/db/schema.ts`
- ✅ **DTO Contracts**: `packages/contracts/src/momentum.ts` with full Zod validation
- ✅ **API Foundation**: Inbox routes (`/api/inbox`, `/api/zones`) implemented
- ✅ **AI Integration**: OpenRouter categorization system operational

### Next Implementation Priority: Hierarchical Task Structure

#### **PRD Feature 3.2**: Three-Tier System (Projects → Tasks → Subtasks)

**Why This Feature Next:**
1. **Foundation Dependency**: Features 3.3 (Client Integration), 3.4 (Workflow Automation), and 3.5 (Goal Tracking) all depend on this hierarchical structure
2. **Backend Infrastructure Ready**: DTOs, schemas, and validation already exist in codebase
3. **User Research Priority**: Essential for managing complex client programs alongside business operations
4. **AI Integration Point**: Connects with existing inbox for automated task creation

#### **Implementation Plan: 3-Week Roadmap**

##### **Week 1: API Layer Implementation**
**Objective**: Create RESTful API endpoints following existing patterns

```bash
# API Routes to Implement
src/app/api/omni-momentum/
├── projects/
│   ├── route.ts              # GET/POST projects (pathways)
│   └── [projectId]/
│       ├── route.ts          # GET/PUT/DELETE individual project
│       └── tasks/route.ts    # GET tasks within project
├── tasks/
│   ├── route.ts              # GET/POST tasks
│   ├── [taskId]/
│   │   ├── route.ts          # GET/PUT/DELETE individual task
│   │   └── subtasks/route.ts # GET/POST/PUT/DELETE subtasks
│   └── pending-approval/route.ts # AI-generated tasks awaiting approval
└── goals/
    └── route.ts              # GET/POST/PUT/DELETE goals
```

**Technical Implementation Notes:**
- **Follow NextResponse Pattern**: Universal `NextResponse.json()` usage per Technical Debt Elimination Phase 17
- **Repository Pattern**: Use `packages/repo/src/momentum.repo.ts` (needs creation)
- **DTO Validation**: All requests/responses validated with existing `momentum.ts` schemas
- **Error Handling**: Consistent error boundaries without `ApiResponse` helper

**Backend Services to Create:**
```typescript
// src/server/services/momentum.service.ts
export class MomentumService {
  // AI-powered project creation from inbox items
  async createProjectFromInbox(items: InboxItemDTO[]): Promise<ProjectDTO>

  // Hierarchical task breakdown with AI suggestions
  async generateTaskHierarchy(project: ProjectDTO): Promise<TaskDTO[]>

  // Goal progress calculation and tracking
  async updateGoalProgress(goalId: string): Promise<GoalDTO>
}
```

##### **Week 2: Frontend Components Implementation**
**Objective**: Create UI components following established patterns

**Core Components to Build:**
```typescript
// src/app/(authorisedRoute)/omni-momentum/_components/
├── PathwaysView.tsx          # Project management interface
├── TaskHierarchyView.tsx     # Three-tier task display
├── ProjectCreationDialog.tsx # New project workflow
├── TaskCreationDialog.tsx    # Task creation with subtask support
├── GoalTrackingCard.tsx      # Business + client + personal goals
└── MomentumKanbanView.tsx    # Optional: Advanced users only
```

**Research-Driven Design Requirements:**
- **Progressive Disclosure**: Default to simple list view (78% preference)
- **Kanban Optional**: Available but not default (advanced user preference)
- **Wellness Terminology**: "Pathways" (Projects), "Journey" (Goals), "Focus" (Tasks)
- **Mobile-First**: Touch-friendly for between-session task management
- **3-Priority Limit**: Never show more than 3 top priorities simultaneously

**React Query Integration:**
```typescript
// src/hooks/use-momentum.ts
export function useMomentum() {
  // Follow existing useInbox pattern
  // Repository-based API calls with optimistic updates
  // Error handling with toast notifications
  // Cache management with proper invalidation
}
```

##### **Week 3: AI Integration & Polish**
**Objective**: Connect with existing AI systems and implement intelligent features

**AI Integration Points:**
1. **Inbox → Project Creation**: Transform captured items into structured projects
2. **Task Breakdown Suggestions**: AI-powered subtask generation
3. **Priority Intelligence**: Energy-based task suggestions using Daily Pulse data
4. **Goal Progress Tracking**: Automatic progress calculation from completed tasks

**Integration Features:**
- **Zone-Based Categorization**: Projects automatically assigned to wellness zones
- **Client Task Linking**: Prepare foundation for Feature 3.3 (Client Integration)
- **Template System**: Common wellness workflows (onboarding, follow-ups, content creation)
- **Calendar Integration**: Connect with omni-rhythm for time-aware suggestions

#### **Success Criteria for Completion**

**Functional Requirements:**
- [ ] Wellness practitioners can create Projects (Pathways) with zone categorization
- [ ] Three-tier hierarchy (Project → Task → Subtask) fully operational
- [ ] AI inbox items automatically convert to structured tasks
- [ ] Goal tracking connects business, personal, and client objectives
- [ ] Progressive disclosure prevents cognitive overwhelm (max 3 priorities)

**Technical Requirements:**
- [ ] All API endpoints follow NextResponse pattern (no ApiResponse usage)
- [ ] Zero ESLint violations and TypeScript strict compliance
- [ ] Repository pattern implementation with proper error handling
- [ ] React Query integration with optimistic updates
- [ ] Mobile-responsive design with touch-friendly interactions

**Integration Requirements:**
- [ ] Seamless connection with existing AI inbox system
- [ ] Zone-based organization working correctly
- [ ] Daily Pulse data influencing task prioritization
- [ ] Sidebar navigation updated with new hierarchical views

#### **Future Feature Dependencies Enabled**

This implementation creates the foundation for:

**Feature 3.3 - Client-Task Integration**:
- Tasks can be tagged with client IDs
- Client cohort filtering (e.g., "new clients", "chronic pain clients")
- Service type categorization

**Feature 3.4 - Wellness Workflow Automation**:
- Template projects for common processes
- Automated task sequences (client onboarding, follow-up protocols)
- Content creation and marketing automation workflows

**Feature 3.5 - Goal Tracking Dual System**:
- Practitioner business goals linked to projects
- Client wellness goals connected to specific tasks
- Progress visualization and milestone tracking

#### **Architecture Patterns to Follow**

**Database Connection Pattern** (Critical):
```typescript
// ✅ CORRECT: Always use getDb() pattern
import { getDb } from "@/server/db/client";
const db = await getDb();

// ❌ BROKEN: Never use proxy-based db import
import { db } from "@/server/db"; // Causes runtime errors
```

**DTO Validation Pattern**:
```typescript
// ✅ REQUIRED: Runtime validation with Zod
import { CreateProjectDTOSchema } from "@omnicrm/contracts";
const validatedData = CreateProjectDTOSchema.parse(requestData);

// ❌ FORBIDDEN: Type assertions without validation
const data = requestData as CreateProjectDTO;
```

**Error Handling Pattern**:
```typescript
// ✅ REQUIRED: Proper error boundaries
try {
  const result = await momentumService.createProject(data);
  return NextResponse.json(result);
} catch (error) {
  console.error("Project creation failed:", error);
  return NextResponse.json(
    { error: "Failed to create project" },
    { status: 500 }
  );
}
```

#### **Resources for Implementation**

**Existing Code Patterns:**
- **API Routes**: Study `src/app/api/omni-clients/` for established patterns
- **Components**: Follow `src/app/(authorisedRoute)/omni-clients/_components/` structure
- **Hooks**: Reference `src/hooks/use-inbox.ts` for React Query patterns
- **Services**: Examine `src/server/services/` for business logic separation

**Documentation References:**
- **Technical Standards**: `docs/TECHNICAL_DEBT_ELIMINATION.md`
- **Research Findings**: `docs/roadmap/implementation/RhythmModuleResearch.md`
- **Product Requirements**: `docs/roadmap/Product Requirements Document_ Wellness Task Management App.md`
- **ESLint Rules**: `eslint.config.mjs` for zero-tolerance enforcement

#### **Critical Implementation Notes**

**Performance Considerations:**
- Use React Query for intelligent caching and background updates
- Implement optimistic updates for responsive user experience
- Lazy load hierarchical task data to prevent overwhelming initial loads

**Mobile-First Design:**
- Minimum 44x44 pixel touch targets
- Collapsible hierarchy views for mobile screens
- Quick action buttons prominently placed
- Offline capability for basic task creation

**Wellness Practitioner UX:**
- Never show more than 3 priorities simultaneously
- Use calming, wellness-appropriate color schemes
- Provide contextual help without overwhelming technical terminology
- Support voice-to-text for between-session task capture

#### **Estimated Development Timeline**

**Week 1** (API Development):
- 2-3 days: API route implementation
- 2-3 days: Service layer and repository creation
- 1-2 days: Integration testing and error handling

**Week 2** (Frontend Components):
- 2-3 days: Core component development
- 2 days: React Query hook implementation
- 1-2 days: UI polish and responsive design

**Week 3** (AI Integration):
- 2 days: AI service integration
- 2 days: Inbox → Task conversion workflow
- 1-2 days: Final testing and documentation

**Total Estimated Time**: 15-21 development days across 3 weeks

---

## Handover Summary

**Current State**: OmniMomentum core UI is complete and production-ready. The foundation for AI-powered task management is established with full backend infrastructure.

**Next Developer**: Begin with **Feature 3.2 - Hierarchical Task Structure** following the 3-week implementation plan above. All necessary DTOs, schemas, and architectural patterns are documented and ready for use.

**Critical Success Factor**: Maintain research-driven design principles (78% prefer lists, max 3 priorities, wellness terminology) while implementing the powerful hierarchical task system that wellness practitioners need for complex client program management.

**Contact**: This implementation guide contains all necessary context for seamless development continuation.