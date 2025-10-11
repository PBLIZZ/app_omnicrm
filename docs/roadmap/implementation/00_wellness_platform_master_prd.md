# OmniCRM by Omnipotency ai - Master PRD & Development Strategy

## 🎯 **Development Architecture Overview**

### **Dual Sidebar Layout Decision**

- **Left Sidebar**: Context-based navigation (auto-collapse to icons)
- **Right Sidebar**: AI Chat Assistant (persistent toggle, context-aware)
- **Main Content**: Widget → Toolbar → Table/Content pattern
- **Header**: Auth + Primary Navigation + Sidebar toggles

### **Core Design System**

```txt
ui/
├── components/
│   ├── layouts/
│   │   ├── AuthHeader.tsx
│   │   ├── ContextSidebar.tsx
│   │   ├── ChatSidebar.tsx
│   │   └── PageLayout.tsx
│   ├── widgets/
│   │   ├── MetricWidget.tsx
│   │   ├── SnapshotWidget.tsx
│   │   └── ActionWidget.tsx
│   ├── tables/
│   │   ├── ContactsTable.tsx
│   │   ├── TasksTable.tsx
│   │   └── BaseTable.tsx (TanStack)
│   └── interactions/
│       ├── HoverCard.tsx
│       ├── VoiceNote.tsx
│       └── QuickActions.tsx
└── styles/
    ├── animations.css (micro-interactions)
    ├── glassmorphism.css
    └── gradients.css
```

---

## 🚀 **Branch Strategy & Parallel Development**

### **10 Development Branches Required**

| Branch                | Component                    | Developer Type      | Dependencies  |
| --------------------- | ---------------------------- | ------------------- | ------------- |
| `feat/design-system`  | **Foundation**               | Design Systems Dev  | None (Base)   |
| `feat/auth-nav`       | **Auth Header & Navigation** | Frontend Lead       | design-system |
| `feat/layout-core`    | **Sidebar Layout & Routing** | Frontend Architect  | auth-nav      |
| `feat/dashboard`      | **Dashboard Page**           | Frontend Dev        | layout-core   |
| `feat/contacts`       | **Contacts Page**            | Table Specialist    | layout-core   |
| `feat/tasks`          | **Tasks Page**               | Frontend Dev        | layout-core   |
| `feat/projects`       | **Projects Page**            | Frontend Dev        | tasks         |
| `feat/ai-approvals`   | **AI Approvals Page**        | AI UX Specialist    | layout-core   |
| `feat/integrations`   | **Integrations Page**        | API Integration Dev | layout-core   |
| `feat/chat-assistant` | **Chat Sidebar**             | AI/Chat Specialist  | layout-core   |

---

## 📋 **Individual PRDs**

### **PRD-001: Design System Foundation**

**Branch:** `feat/design-system`
**Files:** `<200 lines each`

#### **Deliverables:**

- **Color palette constants** (emerald, amber, teal variations)
- **Typography scale** (headers, body, captions)
- **Spacing system** (4px base grid)
- **Component library base** (Button, Input, Card, Badge variants)
- **Animation constants** (durations, easings, micro-interactions)
- **Glassmorphism mixins** (backdrop-blur variations)
- **Gradient definitions** (wellness-themed)

#### **Technical Requirements:**

- Tailwind CSS custom theme
- CSS-in-JS tokens for dynamic theming
- Composable animation utilities
- Responsive breakpoint definitions

---

### **PRD-002: Auth Header & Navigation**

**Branch:** `feat/auth-nav`
**Dependencies:** design-system

#### Deliverables

- **AuthHeader component** with logo, user avatar, primary nav
- **Navigation state management** (active page, breadcrumbs)
- **User menu dropdown** (profile, settings, logout)
- **Sidebar toggle controls** (left/right sidebar triggers)
- **Search bar integration** (global search)
- **Notification bell** with badge count

#### **Layout Specification:**

```txt
[Logo] [Primary Nav: Dashboard|Contacts|Tasks|Integrations] [Search] [🤖] [Settings] [Avatar▼]
```

#### **Interactions:**

- **Hover states** on all nav items
- **Active state** highlighting
- **Smooth transitions** between pages
- **Responsive collapse** on mobile

---

### **PRD-003: Sidebar Layout & App Router**

**Branch:** `feat/layout-core`
**Dependencies:** auth-nav

#### **Context Sidebar (Left)**

- **Auto-collapse to icons** after navigation
- **Context-aware menu items** per page:
  - **Dashboard**: Overview, Analytics, Today's Focus
  - **Contacts**: All Clients, Stages, Tags, Search
  - **Tasks**: My Tasks, Projects, Approvals, Calendar
  - **Integrations**: Gmail, Calendar, Drive, Settings
- **Widget areas** for page-specific tools
- **Filter panels** that slide out
- **Help & onboarding** contextual tips

#### **Chat Sidebar (Right)**

- **Persistent toggle** (🤖 button in header)
- **Context awareness** - knows current page and selected items
- **Chat history** preservation per session
- **Quick actions** relevant to current view
- **Voice input capability**

#### **App Router Implementation:**

- **Next.js App Router** with layouts
- **Context providers** for sidebar state
- **Shared state management** between sidebars
- **Page transition animations**

---

### **PRD-004: Dashboard Page**

**Branch:** `feat/dashboard`
**Dependencies:** layout-core

#### **Widget Layout (Top Row)**

```txt
[Metrics] [Today's Schedule] [AI Insights] [Quick Actions]
```

#### **Main Content:**

- **Pending Approvals** (2/3 viewport height)
- **Day/Week toggle** for all time-based data
- **Real-time updates** with optimistic UI
- **Drag-and-drop** for approval reordering

#### **Metrics Widget:**

- **4 key numbers** (new clients, pending, sessions, revenue)
- **Trend indicators** (up/down arrows, percentages)
- **Click-through** to detailed views

#### **AI Insights Widget:**

- **3 insight categories** (Ready for Upsell, Needs Attention, Social Activity)
- **Action counts** with quick navigation
- **Expandable details** on hover

---

### **PRD-005: Contacts Page**

**Branch:** `feat/contacts`
**Dependencies:** layout-core

#### Widget Layout (Top Row)

```txt
[Client Stats] [Lifecycle Overview] [Recent Activity] [Quick Add]
```

#### Toolbar

- **Search bar** (name, email, tags, notes)
- **Filter dropdowns** (Stage, Tags, Last Session, Risk Level)
- **View options** (Grid/List toggle)
- **Batch actions** (when items selected)
- **Export button**

#### **TanStack Table Implementation:**

```typescript
columns: [
  { id: "select", header: Checkbox },
  { id: "client", header: "Client", cell: PhotoNameEmail },
  { id: "actions", header: "Actions", cell: QuickActionButtons },
  { id: "stage", header: "Stage", cell: LifecycleStage },
  { id: "insights", header: "AI Insights", cell: RecentActivity },
  { id: "notes", header: "Notes", cell: HoverNotesCell },
  { id: "tags", header: "Tags", cell: TagBadges },
  { id: "lastSession", header: "Last Session", cell: SessionInfo },
];
```

#### **Hover Notes Interaction:**

- **Trigger**: Hover over notes cell
- **Popup**: 300px wide, max 400px height
- **Content**: Full notes + quick actions
- **Actions**:
  - 🎤 Record new entry (voice → text)
  - 📋 Open in Tasks
  - 👤 Open Contact Card
  - ✏️ Quick edit
  - ❌ Close

#### **Voice Note Recording:**

- **Click-to-record** button in hover popup
- **Visual indicator** while recording
- **Auto-transcription** and save
- **Append to existing notes** with timestamp

---

### **PRD-006: Tasks Page**

**Branch:** `feat/tasks`
**Dependencies:** layout-core

#### **Widget Layout (Top Row)\***

```txt
[My Tasks] [Due Today] [AI Suggestions] [Quick Create]
```

#### **View Toggle**

- **List View** (default) - TanStack table
- **Kanban View** - Drag-and-drop columns (Todo, In Progress, Review, Done)

#### **Toolbar**

- **Filter by**: Owner (Me/AI), Priority, Due Date, Project
- **Sort by**: Due Date, Priority, Created Date, Alphabetical
- **Group by**: Project, Owner, Status
- **Bulk actions**: Assign, Update Status, Delete

#### List View Columns

```typescript
columns: [
  { id: "select", header: Checkbox },
  { id: "task", header: "Task", cell: TaskTitleWithProject },
  { id: "owner", header: "Owner", cell: OwnerAvatar },
  { id: "status", header: "Status", cell: StatusBadge },
  { id: "priority", header: "Priority", cell: PriorityFlag },
  { id: "dueDate", header: "Due", cell: DueDateWithUrgency },
  { id: "actions", header: "Actions", cell: QuickActions },
];
```

---

### **PRD-007: Projects Page**

**Branch:** `feat/projects`
**Dependencies:** tasks

#### **Widget Layout:**

```txt
[Active Projects] [Progress Overview] [Team Workload] [New Project]
```

#### **Project Card Layout:**

- **Project title** and description
- **Progress bar** with percentage
- **Team members** (avatars)
- **Key milestones** and deadlines
- **Task count** breakdown
- **Quick actions** (View, Edit, Archive)

#### **Expandable Project Details:**

- **Task list** (inline TanStack table)
- **Timeline view** with Gantt-style visualization
- **Resource allocation** charts
- **Project chat** integration

---

### **PRD-008: AI Approvals Page**

**Branch:** `feat/ai-approvals`
**Dependencies:** layout-core

#### **Full-Screen Approval Interface:**

- **Approval queue** with infinite scroll
- **Batch approval** controls at top
- **Detailed reasoning** for each item
- **Preview modes** for emails/content
- **A/B testing** for AI suggestions

#### **Approval Card Design:**

- **Expandable details** (context, data points, reasoning)
- **Action buttons** (Approve, Reject, Edit, Schedule)
- **Preview overlays** for generated content
- **Learning feedback** (thumbs up/down for AI training)

---

### **PRD-009: Integrations Page**

**Branch:** `feat/integrations`
**Dependencies:** layout-core

#### **Tab Structure:**

```txt
[Gmail] [Calendar] [Drive] [Social Media] [Add Integration]
```

#### **Gmail Tab:**

- **Connection status** and sync controls
- **Inbox snapshot** (unread count, key emails)
- **AI email summary** (45-second read)
- **Email list** (title + 2 lines, last 7 days)
- **Permission management**

#### **Calendar Tab:**

- **Next 7 days view** (not Mon-Sun)
- **Sync status** and manual refresh
- **Appointment confirmations** needed
- **Calendar overlay** preferences

#### **Drive Tab:**

- **Folder access** permissions
- **Recent documents** accessed by AI
- **Storage usage** and cleanup suggestions
- **Privacy controls**

---

### **PRD-010: Settings & Profile**

**Branch:** `feat/settings`
**Dependencies:** layout-core

#### **Standard SaaS Layout:**

```txt
Settings/
├── Profile/
│   ├── Personal Info
│   ├── Avatar & Display
│   └── Timezone & Locale
├── Account/
│   ├── Subscription & Billing
│   ├── Usage & Limits
│   └── Data & Privacy
├── Integrations/
│   ├── Connected Apps
│   ├── API Keys
│   └── Webhooks
├── Preferences/
│   ├── Theme & Appearance
│   ├── Notifications
│   └── Defaults
└── Support/
    ├── Help Center
    ├── Contact Support
    └── Account Deletion (GDPR)
```

---

## 🎨 **Shared Design Guidelines**

### **Micro-Interactions:**

- **Hover states**: 150ms ease-out
- **Button presses**: Scale 0.98 + shadow
- **Loading states**: Skeleton → Fade in
- **Form validation**: Smooth error/success states

### **Glassmorphism:**

- **Cards**: `backdrop-blur-md bg-white/80`
- **Overlays**: `backdrop-blur-lg bg-slate-900/20`
- **Popups**: `backdrop-blur-xl bg-white/90`

### **Gradients:**

- **Primary**: Emerald to teal
- **Accent**: Amber to orange
- **Background**: Emerald-50 to sky-50

### **Component Standards:**

- **Max 200 lines** per file
- **Single responsibility** principle
- **Prop interfaces** with TypeScript
- **Error boundaries** for resilience
- **Loading/empty states** always included

---

## 🔄 **Integration Strategy**

### **Merge Order:**

1. `design-system` → `main`
2. `auth-nav` → `main`
3. `layout-core` → `main`
4. All feature branches → `main` (parallel)

### **Shared Context:**

- **Design tokens** from design-system
- **Layout components** from layout-core
- **Auth state** from auth-nav
- **API clients** shared across features

### **Testing Strategy:**

- **Component testing** per branch
- **Integration testing** on merge to main
- **E2E testing** for complete user flows
- **Visual regression** testing for design consistency

---

## 🎯 **Success Criteria**

Each PRD must deliver:

- ✅ **Pixel-perfect** designs matching vision
- ✅ **Responsive** mobile/tablet/desktop
- ✅ **Accessible** (WCAG 2.1 AA)
- ✅ **Performant** (<200ms interactions)
- ✅ **Composable** components for reuse
- ✅ **Type-safe** with TypeScript
- ✅ **Tested** with automated tests

Ready for parallel development! 🚀
