# Product Requirements Document: OmniMomentum UI Enhancement & Core Features

## 1. Introduction/Overview

This PRD focuses on completing the OmniMomentum productivity suite by implementing the most critical UI components and functionality that wellness practitioners need. The backend infrastructure is fully complete, so this phase concentrates on creating an intuitive, research-driven frontend that addresses the top user pain points identified through extensive research with 156+ wellness practitioners.

**Problem**: Wellness solopreneurs need a calming, efficient task management system that reduces cognitive load while supporting their unique workflow patterns of client care, business operations, and personal wellness.

**Goal**: Complete the OmniMomentum frontend with the most requested features, focusing on the "dump everything" intelligent inbox, enhanced task management, and energy-aware productivity tools.

## 2. Goals

1. **Implement Magic Inbox Processing** - The #1 most requested feature for "dump everything" task capture with AI categorization
2. **Create Enhanced Task List Views** - Research shows 78% prefer list views with scrollable actions underneath "Today's Focus" (max 3 priorities)
3. **Build Task CRUD Operations** - Complete create, read, update, delete with task detail sheets and inline editing
4. **Develop Collapsible Project Sidebar** - Hierarchical project tree (3-6 projects typical) with expandable tasks and subtasks in sidebar navigation
5. **Redesign Dashboard Layout** - Optimize three top cards (Daily Pulse, Habit Trackers, Magic Inbox) to be shorter, with Actions List underneath
6. **Implement Zone Management** - Allow practitioners to manage 6 default zones plus custom zones for life compartmentalization
7. **Comprehensive Testing Suite** - Unit and integration tests for all new components and functionality
8. **Polish & Mobile Optimization** - Ensure mobile responsiveness, touch targets, and wellness-appropriate design patterns

## 3. User Stories

**As a wellness practitioner, I want to:**

- Dump all my thoughts and tasks into the "Magic Inbox" and have AI automatically categorize them by zones
- See my top 3 priorities for today, with a scrollable list of all actions underneath
- Quickly edit, complete, or delete tasks with inline actions and detail sheets
- Have my 3-6 active projects listed in a collapsible sidebar tree showing tasks and subtasks
- Organize my life into zones (default 6 + custom) to compartmentalize work, clients, personal wellness, etc.
- Use Daily Pulse for my self-care check-ins and Habit Trackers for my wellness routines
- Access my task management system on mobile during breaks between client sessions
- See a clean, calming interface with wellness-appropriate terminology

## 4. Functional Requirements

1. **Magic Inbox Processing (Priority 1)**
   - Prominent "Magic Inbox" card on dashboard (one of three top cards)
   - AI-powered natural language processing to split and categorize tasks by zones
   - Human-in-the-loop approval workflow for AI suggestions
   - Confidence scoring and fallback processing
   - Quick capture with keyboard shortcuts and voice input

2. **Enhanced Task List Views (Priority 1)**
   - "Today's Focus" section showing max 3 priority tasks
   - Scrollable "Actions List" underneath showing all tasks
   - Checkbox on left, task title with medium weight font, colored zone badges
   - Smart filters: Today, Upcoming, High Priority, This Week, By Zone, By Project
   - Generous white space and smooth animations
   - Time-based grouping (Morning/Afternoon/Evening/Night)

3. **Task CRUD Operations (Priority 1)**
   - Inline task editing with click-to-edit fields
   - Task detail sheet/modal for full editing experience
   - Quick actions: complete, delete, edit, duplicate
   - Subtask creation and management within tasks
   - Real-time updates with optimistic UI

4. **Collapsible Project Sidebar (Priority 2)**
   - Projects listed in main OmniMomentum navigation sidebar
   - Collapsible tree structure: Project → Tasks → Subtasks
   - Support for 3-6 active projects (typical practitioner workload)
   - Drag-and-drop to reorder projects and tasks
   - Project progress indicators

5. **Dashboard Layout Redesign (Priority 1)**
   - Three horizontal cards at top (shorter height): Daily Pulse, Habit Trackers, Magic Inbox
   - "Today's Focus" section showing 3 priorities
   - Scrollable "Actions List" below for all tasks
   - Remove or relocate "Zone Status" card
   - Mobile-responsive grid layout

6. **Zone Management System (Priority 2)**
   - Default 6 zones for life compartmentalization (Life, Business, Learning, Health, Self Care, Client Care)
   - Ability to add custom zones
   - Zone color coding and icons
   - Task filtering and grouping by zone
   - Zone-based task statistics

## 5. Non-Goals (Out of Scope)

- **Energy-Aware Task Routing** - Requires AI integration and Daily Pulse correlation analysis (Phase 2)
- **Recurring Task System** - Covered by Habit Trackers and Goals table (Phase 2)
- **Client-Task Integration** - @mention tagging and client filtering (Phase 2)
- **Analytics Dashboard** - Will be implemented in OmniFlow module instead
- **Advanced AI features** - Beyond basic categorization
- **Complex workflow automation** - Phase 3
- **Team collaboration features** - Not needed for solopreneurs
- **Calendar integration** - Handled by OmniRhythm module
- **Voice processing** - Beyond basic capture
- **Offline capabilities** - Phase 4
- **Dark mode** - Phase 4

## 6. Design Considerations

**Color Palette**: Soft pastels (Primary: #6366F1, Secondary: #10B981, Accent: #F59E0B)
**Typography**: Inter font family with medium weight for task titles
**Layout**: Mobile-first with 44px minimum touch targets
**Animations**: Smooth, meditative transitions that feel calming
**Terminology**: Wellness-native terms (Pathways, Pulse, Journey, Complete, Begin, Release)

## 7. Technical Considerations

- Build on existing backend infrastructure (fully complete)
- Use existing React Query hooks and API endpoints
- Follow established shadcn/ui component patterns
- Implement proper TypeScript types throughout
- Ensure mobile responsiveness and touch optimization
- Integrate with existing Daily Pulse and zone systems

## 8. Success Metrics

- **User Engagement**: 80% of users actively use intelligent inbox within first week
- **Task Completion**: 15% increase in daily task completion rates
- **User Satisfaction**: 4.5+ star rating for ease of use
- **Mobile Usage**: 85% of task captures happen on mobile devices
- **AI Accuracy**: 80%+ approval rate for AI-generated task suggestions

## 9. Open Questions

- Should we implement voice input in Phase 1 or Phase 2?
- What's the optimal number of tasks to show in "Today's Focus" (research suggests max 3)?
- Should we include habit tracking as part of recurring tasks or separate system?
