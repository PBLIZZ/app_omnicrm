# PRD-006: Tasks Page - Workflow Management Hub

## 🎯 **Overview**

The Tasks page is the **workflow command center** where wellness practitioners manage their daily tasks, AI-generated suggestions, and long-term projects. It balances human oversight with AI automation.

## 📐 **Layout Architecture**

### **Page Structure**

```
┌─────────────────────────────────────────────────────┐
│ [Context Sidebar] │   TASKS PAGE    │ [Chat Sidebar] │
├──────────────────┼─────────────────┼───────────────┤
│ Quick Filters:   │ ┌─────────────┐ │ AI Assistant  │
│ • My Tasks       │ │  WIDGETS    │ │ Context:      │
│ • AI Generated   │ │ (4 widgets) │ │ "12 tasks     │
│ • Due Today      │ └─────────────┘ │  selected"    │
│ • Overdue        │ ┌─────────────┐ │               │
│ • Completed      │ │  TOOLBAR    │ │ Suggestions:  │
│                  │ └─────────────┘ │ • Bulk update │
│ Widget Area:     │ ┌─────────────┐ │ • Prioritize  │
│ ┌──────────────┐ │ │             │ │ • Schedule    │
│ │ Task Stats   │ │ │[List][Kanban]│ │               │
│ │ • Total: 47  │ │ │             │ │               │
│ │ • Due: 8     │ │ │    TASKS    │ │               │
│ │ • AI: 23     │ │ │             │ │               │
│ └──────────────┘ │ │             │ │               │
└──────────────────┴─────────────────┴───────────────┘
```

## 🎨 **Widget Row (Top)**

### **Widget 1: Task Summary**

```typescript
interface TaskSummaryWidget {
  metrics: {
    totalTasks: number;
    dueToday: number;
    overdue: number;
    completed: number;
    aiGenerated: number;
  };
  trends: {
    completionRate: { value: number; trend: "up" | "down" | "stable" };
    avgTimeToComplete: { value: string; trend: "up" | "down" | "stable" };
  };
  quickActions: ["Add Task", "Bulk Complete"];
}
```

### **Widget 2: AI Suggestions**

```typescript
interface AISuggestionsWidget {
  suggestions: {
    type: "follow-up" | "scheduling" | "content" | "administrative";
    title: string;
    description: string;
    confidence: number; // 0-100
    estimatedTime: string;
    priority: "high" | "medium" | "low";
  }[];
  actions: ["Generate More", "Dismiss All", "Settings"];
  aiStatus: {
    lastRun: string;
    nextRun: string;
    processing: boolean;
  };
}
```

### **Widget 3: Team Workload**

```typescript
interface TeamWorkloadWidget {
  owners: {
    name: "You" | "AI Assistant";
    avatar: string;
    activeTasks: number;
    completedToday: number;
    workload: "light" | "moderate" | "heavy";
  }[];
  distribution: {
    yourTasks: number;
    aiTasks: number;
    sharedTasks: number;
  };
}
```

### **Widget 4: Quick Create**

```typescript
interface QuickCreateWidget {
  templates: [
    { name: "Client Follow-up"; icon: "Mail"; fields: ["client", "type"] },
    { name: "Session Notes"; icon: "FileText"; fields: ["client", "date"] },
    { name: "Marketing Task"; icon: "Megaphone"; fields: ["campaign", "deadline"] },
    { name: "Administrative"; icon: "Settings"; fields: ["category", "priority"] },
  ];
  recentlyUsed: string[]; // Show most used templates first
}
```

## 🛠️ **Toolbar Specification**

### **Layout**

```
[Search tasks...] [Owner: All ▼] [Priority: All ▼] [Due: All ▼] [Status: All ▼] [Sort: Due Date ▼] [List◉Kanban○] [Bulk Actions▼]
```

### **Filter System**

```typescript
interface TaskFilters {
  search: {
    scope: ["title", "description", "tags", "clientName"];
    placeholder: "Search tasks, clients, or descriptions...";
    debounce: 300; // ms
  };
  owner: {
    options: ["all", "me", "ai-assistant", "unassigned"];
    multiSelect: false;
  };
  priority: {
    options: ["all", "high", "medium", "low"];
    multiSelect: true;
    colors: { high: "red"; medium: "amber"; low: "slate" };
  };
  dueDate: {
    options: ["all", "overdue", "today", "tomorrow", "this-week", "next-week", "no-due-date"];
    multiSelect: false;
  };
  status: {
    options: ["all", "todo", "in-progress", "review", "completed"];
    multiSelect: true;
  };
  tags: {
    options: string[]; // Dynamic from existing tags
    multiSelect: true;
    autocomplete: true;
  };
}
```

### **View Toggle**

```typescript
interface ViewToggle {
  options: ["list", "kanban"];
  defaultView: "list";
  persistence: "localStorage";
  animation: "300ms ease-in-out";
}
```

## 📊 **List View Implementation**

### **TanStack Table Configuration**

```typescript
const tasksColumns: ColumnDef<Task>[] = [
  {
    id: 'select',
    header: ({ table }) => <SelectAllCheckbox table={table} />,
    cell: ({ row }) => <SelectRowCheckbox row={row} />,
    enableSorting: false,
    size: 40
  },
  {
    id: 'priority',
    header: '',
    cell: ({ row }) => <PriorityFlag priority={row.original.priority} />,
    enableSorting: true,
    size: 40
  },
  {
    id: 'task',
    header: 'Task',
    cell: ({ row }) => <TaskCell task={row.original} />,
    enableSorting: true,
    size: 300
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => <OwnerCell owner={row.original.owner} />,
    enableSorting: true,
    size: 100
  },
  {
    id: 'client',
    header: 'Client',
    cell: ({ row }) => <ClientCell client={row.original.client} />,
    enableSorting: true,
    size: 120
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusCell status={row.original.status} />,
    enableSorting: true,
    size: 100
  },
  {
    id: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => <DueDateCell dueDate={row.original.dueDate} />,
    enableSorting: true,
    size: 120
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <TaskActionsCell task={row.original} />,
    enableSorting: false,
    size: 100
  }
];
```

### **Task Cell Component**

```typescript
interface TaskCellProps {
  task: {
    id: string;
    title: string;
    description?: string;
    tags: string[];
    aiGenerated: boolean;
    estimatedTime?: string;
    project?: string;
  };
}

const TaskCell = ({ task }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <h3 className="font-medium text-slate-900">{task.title}</h3>
      {task.aiGenerated && (
        <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">
          <Bot className="h-3 w-3 mr-1" />
          AI
        </Badge>
      )}
    </div>
    {task.description && (
      <p className="text-sm text-slate-600 truncate">{task.description}</p>
    )}
    <div className="flex items-center gap-2">
      {task.project && (
        <Badge variant="secondary" className="text-xs">
          {task.project}
        </Badge>
      )}
      {task.tags.slice(0, 2).map(tag => (
        <Badge key={tag} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
      {task.estimatedTime && (
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.estimatedTime}
        </span>
      )}
    </div>
  </div>
);
```

### **Row Interaction States**

```css
.task-row {
  @apply hover:bg-slate-50 transition-colors;
}

.task-row.selected {
  @apply bg-emerald-50 border-l-4 border-emerald-500;
}

.task-row.overdue {
  @apply border-l-4 border-red-300 bg-red-50/50;
}

.task-row.ai-generated {
  @apply border-l-4 border-violet-300;
}

.task-row.due-today {
  @apply border-l-4 border-amber-300 bg-amber-50/50;
}
```

## 📋 **Kanban View Implementation**

### **Column Configuration**

```typescript
interface KanbanColumns {
  todo: {
    title: "To Do";
    color: "slate";
    allowedStatuses: ["todo"];
    maxItems?: undefined;
  };
  inProgress: {
    title: "In Progress";
    color: "sky";
    allowedStatuses: ["in-progress"];
    maxItems: 5; // Encourage focus
  };
  review: {
    title: "Review";
    color: "amber";
    allowedStatuses: ["review", "pending-approval"];
    maxItems?: undefined;
  };
  completed: {
    title: "Completed";
    color: "emerald";
    allowedStatuses: ["completed"];
    maxItems?: undefined;
    autoArchive: "7-days"; // Move to archive after 7 days
  };
}
```

### **Kanban Card Design**

```
┌─────────────────────────────────┐
│ 🔴 Draft follow-up email        │ ← Priority flag + title
│                                 │
│ Send personalized follow-up     │ ← Description
│ to 3 new leads based on...     │
│                                 │
│ 🤖 AI Generated                │ ← Badges
│ 📧 Follow-up   ⏱️ 15 min       │
│                                 │
│ 👤 AI Assistant  📅 Today      │ ← Owner + due date
└─────────────────────────────────┘
```

### **Drag & Drop Behavior**

```typescript
interface DragDropRules {
  allowedTransitions: {
    todo: ["in-progress"];
    "in-progress": ["todo", "review", "completed"];
    review: ["in-progress", "completed"];
    completed: ["review"]; // Allow reopening
  };
  restrictions: {
    aiGeneratedTasks: {
      requireApproval: ["completed"]; // AI tasks need approval to complete
      allowedColumns: ["todo", "in-progress", "review"];
    };
    userTasks: {
      freeMovement: true; // Users can move anywhere
    };
  };
  feedback: {
    validDrop: "border-emerald-300 bg-emerald-50";
    invalidDrop: "border-red-300 bg-red-50";
    dragging: "opacity-50 rotate-2 scale-105";
  };
}
```

## 🤖 **AI Integration Features**

### **Task Generation Engine**

```typescript
interface AITaskGeneration {
  triggers: [
    "client-session-completed",
    "email-received",
    "calendar-event-ended",
    "social-media-mention",
    "manual-trigger",
  ];
  taskTypes: {
    followUp: {
      template: "Send follow-up email to {client} about {topic}";
      estimatedTime: "10 minutes";
      priority: "medium";
      dueDate: "+2 days";
    };
    sessionPrep: {
      template: "Review notes for {client} session on {date}";
      estimatedTime: "5 minutes";
      priority: "high";
      dueDate: "1 hour before session";
    };
    contentCreation: {
      template: "Create social media post about {topic}";
      estimatedTime: "20 minutes";
      priority: "low";
      dueDate: "+1 week";
    };
  };
  confidence: {
    high: "auto-create"; // >90% confidence
    medium: "suggest"; // 70-90% confidence
    low: "draft-only"; // <70% confidence
  };
}
```

### **Smart Prioritization**

```typescript
interface SmartPrioritization {
  factors: {
    dueDate: { weight: 0.4; calculation: "days-until-due" };
    clientImportance: { weight: 0.3; calculation: "vip-status + revenue" };
    taskType: { weight: 0.2; calculation: "predefined-urgency" };
    dependencies: { weight: 0.1; calculation: "blocking-other-tasks" };
  };
  algorithm: "weighted-score + machine-learning";
  userOverride: true; // Users can always manually set priority
  learningData: {
    userPriorityChanges: true;
    completionPatterns: true;
    contextualFactors: true;
  };
}
```

### **Batch Operations**

```typescript
interface BatchOperations {
  selection: {
    all: "select-all-visible";
    filtered: "select-all-matching-current-filter";
    manual: "checkbox-selection";
  };
  actions: {
    updateStatus: { options: ["todo", "in-progress", "review", "completed"] };
    changePriority: { options: ["high", "medium", "low"] };
    assignOwner: { options: ["me", "ai-assistant"] };
    addTags: { input: "tag-selector" };
    setDueDate: { input: "date-picker" };
    delete: { confirmation: true; undoable: true };
  };
  feedback: {
    progressBar: true;
    successToast: "X tasks updated successfully";
    errorHandling: "partial-failure-reporting";
  };
}
```

## 📱 **Mobile Adaptations**

### **Mobile List View**

```
┌─────────────────────────────┐
│ 🔴 Draft follow-up email    │ ← Priority + title
│ 🤖 AI • 📧 Follow-up • Today │ ← Quick meta info
│ ────────────────────────── │
│ 🟡 Review session notes     │
│ 👤 You • 📝 Notes • Tomorrow │
│ ────────────────────────── │
│ 🟢 Schedule social post     │
│ 🤖 AI • 📱 Social • Next week│
└─────────────────────────────┘
```

### **Mobile Kanban**

```
┌─────────────────────────────┐
│ [To Do] [In Progress] [Done] │ ← Horizontal scroll tabs
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ TO DO (8)               │ │ ← Current tab content
│ │                         │ │
│ │ [Task cards stacked]    │ │ ← Vertical scroll
│ │                         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### **Mobile Interactions**

- **Swipe left** on task → Quick actions (complete, delete, edit)
- **Swipe right** on task → Quick assign/reschedule
- **Long press** → Multi-select mode
- **Pull to refresh** → Sync with AI suggestions

## 🔄 **Real-Time Updates**

### **Live Synchronization**

```typescript
interface RealTimeFeatures {
  aiTaskGeneration: {
    polling: "30-seconds";
    notifications: "toast + badge-update";
    backgroundProcessing: true;
  };
  userActions: {
    optimisticUpdates: true;
    conflictResolution: "last-write-wins";
    undoSupport: "30-seconds";
  };
  collaboration: {
    simultaneousEditing: false; // Tasks are single-user
    lockingMechanism: "optimistic";
    changeNotifications: true;
  };
}
```

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] List and Kanban views display identical data
- [ ] Drag & drop works smoothly in Kanban view
- [ ] Filters apply instantly without page reload
- [ ] Batch operations execute correctly
- [ ] AI task generation creates appropriate tasks
- [ ] Search finds relevant tasks accurately
- [ ] Mobile views adapt properly to touch interaction

### **Performance Requirements**

- [ ] Table renders <500ms for 1000+ tasks
- [ ] View switching (List ↔ Kanban) completes <300ms
- [ ] Drag & drop operations feel responsive (<100ms)
- [ ] Filter changes apply within 200ms
- [ ] Batch operations provide immediate feedback
- [ ] AI suggestions appear within 60 seconds of triggers

### **UX Requirements**

- [ ] Task creation is quick and intuitive
- [ ] AI vs human tasks are clearly distinguished
- [ ] Priority levels are visually obvious
- [ ] Due dates create appropriate urgency
- [ ] Bulk operations save significant time
- [ ] Mobile experience equals desktop functionality
- [ ] Error states are helpful and recoverable

### **AI Integration Requirements**

- [ ] AI tasks include clear reasoning
- [ ] AI suggestions are contextually relevant
- [ ] AI confidence levels are transparent
- [ ] Users can easily override AI decisions
- [ ] AI learns from user patterns
- [ ] AI task quality improves over time

**The Tasks page becomes the efficient workflow hub where human insight and AI automation work together seamlessly.** ✅🤖
