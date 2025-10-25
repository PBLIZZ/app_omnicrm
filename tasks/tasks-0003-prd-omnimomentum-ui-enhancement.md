# Relevant Files

## Priority 1 Components (Magic Inbox, Task List, CRUD, Dashboard Layout)

- `src/app/(authorisedRoute)/omni-momentum/_components/MagicInboxCard.tsx` - Magic Inbox card with AI processing
- `src/app/(authorisedRoute)/omni-momentum/_components/MagicInboxCard.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/TodaysFocusSection.tsx` - Already exists, needs enhancement for 3 priorities
- `src/app/(authorisedRoute)/omni-momentum/_components/ActionsListView.tsx` - Scrollable task list with filters
- `src/app/(authorisedRoute)/omni-momentum/_components/ActionsListView.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/TaskItem.tsx` - Individual task row with inline actions
- `src/app/(authorisedRoute)/omni-momentum/_components/TaskItem.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/TaskDetailSheet.tsx` - Full task edit sheet/modal
- `src/app/(authorisedRoute)/omni-momentum/_components/TaskDetailSheet.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/OmniMomentumPage.tsx` - Already exists, needs layout redesign

### Priority 2 Components (Projects Sidebar, Zones)

- `src/app/(authorisedRoute)/omni-momentum/_components/ProjectsSidebar.tsx` - Collapsible project tree for sidebar
- `src/app/(authorisedRoute)/omni-momentum/_components/ProjectsSidebar.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/ZoneManagement.tsx` - Zone CRUD and customization
- `src/app/(authorisedRoute)/omni-momentum/_components/ZoneManagement.test.tsx` - Unit tests
- `src/app/(authorisedRoute)/omni-momentum/_components/MomentumSidebar.tsx` - Already exists, needs project integration

### React Query Hooks

- `src/hooks/use-momentum.ts` - Already exists, may need enhancement
- `src/hooks/use-magic-inbox.ts` - Hook for Magic Inbox operations
- `src/hooks/use-tasks.ts` - Enhanced task operations hook
- `src/hooks/use-projects-sidebar.ts` - Hook for collapsible project tree

### Backend Integration (Already Complete)

- `src/server/ai/connect/intelligent-inbox-processor.ts` - AI processing service (exists)
- `src/server/services/inbox-approval.service.ts` - HITL approval workflow (exists)
- `src/server/services/momentum.service.ts` - Main service layer (exists)
- `packages/repo/src/momentum.repo.ts` - Repository layer (exists)

### Utilities

- `src/lib/keyboard-shortcuts.ts` - Global keyboard shortcut management
- `src/lib/task-filters.ts` - Task filtering and grouping utilities
- `src/lib/zone-utils.ts` - Zone color coding and management

### Notes

- Unit tests should be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `pnpm test` to run tests. Running without a path executes all tests found by the Vitest configuration.
- All components should follow the existing shadcn/ui patterns and wellness terminology established in the codebase.
- Backend infrastructure is complete, so focus on frontend implementation and AI integration.
- Testing is integrated into every task - not a separate final task.
- Current page has 3 cards: Daily Pulse, Habit Trackers, Quick Capture (to be renamed Magic Inbox)
- Focus on making top 3 cards shorter so Actions List can be prominent underneath

## Tasks

- [ ] 1.0 Redesign Dashboard Layout (3 Shorter Top Cards + Actions List)
  - [ ] 1.1 Update OmniMomentumPage.tsx to reduce height of top 3 cards (Daily Pulse, Habit Trackers, Magic Inbox)
  - [ ] 1.3 Get the "Zone Status" card in the current layout working so i can see what its supposed to do.
  - [ ] 1.4 Add new 3/4 width section below top cards for "Today's Focus" making 3 1/4 width cards for the top three priorities plus another 1/4 width card for Inspiring wellness productivity quotes.
  COmbine the Dump Everything Here card with the Magic Inbox card so it merges the two together, magic inbox is for dumping all your thoughts, we still need a floating plus button to add a stask from anywhere in the omnimomentum suite, its not available on other pages though, we will have a add new task option in the dashboard .

        "Actions List" full length beneath everything using tan stack table to list all tasks. Use pagination, filtering, search, grouping, and sorting. 
        Investigate tags set up globally and the tags tasks join table to see how to implemet tags for tasks
  - [ ] 1.5 Implement responsive grid that collapses properly on mobile (single column on small screens)
  - [ ] 1.6 Write unit tests for OmniMomentumPage layout changes and responsive behavior

- [ ] 2.0 Build Magic Inbox Card with AI Processing
  - [ ] 2.1 Create MagicInboxCard.tsx component replacing QuickCaptureInput functionality and dump everything
  - [ ] 2.2 Integrate with existing intelligent-inbox-processor.ts for AI categorization by zones
  - [ ] 2.3 Implement Human-in-the-Loop approval workflow UI showing AI suggestions with confidence scores
  - [ ] 2.4 Add keyboard shortcuts and voice input button for quick capture from anywhere in the omnimomentum suite.
  - [ ] 2.5 Create use-magic-inbox.ts React Query hook with optimistic updates and error handling
  - [ ] 2.6 Write unit tests for MagicInboxCard component, AI processing integration, and approval workflow

- [ ] 3.0 Create Enhanced Task List Views (Today's Focus + Scrollable Actions)
  - [ ] 3.1 Enhance existing TodaysFocusSection.tsx to display exactly 3 priority tasks with prominent styling
  - [ ] 3.2 Create ActionsListView.tsx with scrollable container showing all tasks grouped by time (Morning/Afternoon/Evening/Night) use tanstack table to list all tasks.
  - [ ] 3.3 Implement TaskItem.tsx component with checkbox on left, task title, colored zone badges, and metadata
  - [ ] 3.4 Add smart filter controls (Today, Upcoming, High Priority, This Week, By Zone, By Project)
  - [ ] 3.5 Create use-tasks.ts hook for enhanced filtering, grouping, and real-time updates
  - [ ] 3.6 Write unit tests for TodaysFocusSection, ActionsListView, TaskItem, and filtering logic

- [ ] 4.0 Implement Task CRUD Operations (Inline Edit + Detail Sheet)
  - [ ] 4.1 Add inline editing to TaskItem.tsx with click-to-edit for task name and quick actions (complete, delete, edit)
  - [ ] 4.2 Create TaskDetailSheet.tsx using shadcn Sheet component for full task editing with all fields
  - [ ] 4.3 Implement subtask creation and management within TaskDetailSheet with nested task display
  - [ ] 4.4 Add optimistic UI updates using React Query mutations with rollback on error
  - [ ] 4.5 Integrate with existing momentum.service.ts and momentum.repo.ts for backend operations
  - [ ] 4.6 Write unit tests for inline editing, TaskDetailSheet, subtask operations, and optimistic updates

- [ ] 5.0 Build Collapsible Projects Sidebar (3-6 Projects with Tasks Tree)
  - [ ] 5.1 Create ProjectsSidebar.tsx component with collapsible tree structure (Project → Tasks → Subtasks)
  - [ ] 5.2 Integrate ProjectsSidebar into existing MomentumSidebar.tsx navigation
  - [ ] 5.3 Implement expand/collapse functionality with local state persistence (localStorage)
  - [ ] 5.4 Add drag-and-drop support using @dnd-kit for reordering projects and tasks
  - [ ] 5.5 Create use-projects-sidebar.ts hook for project tree data management and mutations
  - [ ] 5.6 Write unit tests for ProjectsSidebar, expand/collapse logic, drag-and-drop, and data persistence

- [ ] 6.0 Implement Zone Management System (6 Default + Custom Zones)
  - [ ] 6.1 Create ZoneManagement.tsx component for zone CRUD operations (add, edit, delete custom zones)
  - [ ] 6.2 Implement zone color picker and icon selector using shadcn components
  - [ ] 6.3 Add zone filtering controls to ActionsListView and task assignment in TaskDetailSheet
  - [ ] 6.4 Create src/lib/zone-utils.ts with zone color coding, icon mapping, and default zone constants
  - [ ] 6.5 Integrate with existing zones table in database and momentum.service.ts
  - [ ] 6.6 Write unit tests for ZoneManagement component, zone utilities, filtering, and database integration

- [ ] 7.0 Add Global Keyboard Shortcuts & Quick Capture
  - [ ] 7.1 Create src/lib/keyboard-shortcuts.ts with global keyboard event listener system
  - [ ] 7.2 Implement 'Q' key shortcut to open Magic Inbox from anywhere in the app
  - [ ] 7.3 Add keyboard navigation for task lists (arrow keys, enter to edit, space to complete)
  - [ ] 7.4 Implement escape key to close modals/sheets and save changes
  - [ ] 7.5 Add visual keyboard shortcut hints in UI (tooltips showing 'Q' for quick capture, etc.)
  - [ ] 7.6 Write unit tests for keyboard shortcuts system, event listeners, and navigation behavior

- [ ] 8.0 Mobile Optimization & Polish (Touch Targets, Responsive Design)
  - [ ] 8.1 Audit all interactive elements to ensure minimum 44px touch targets on mobile
  - [ ] 8.2 Implement swipe gestures for task actions (swipe right to complete, swipe left for options)
  - [ ] 8.3 Add mobile-specific optimizations (larger buttons, simplified navigation, bottom sheets instead of modals)
  - [ ] 8.4 Test and fix responsive layouts on mobile breakpoints (sm, md, lg) for all components
  - [ ] 8.5 Implement smooth animations and transitions using Tailwind and Framer Motion for calming UX
  - [ ] 8.6 Write integration tests for mobile touch interactions, swipe gestures, and responsive behavior
