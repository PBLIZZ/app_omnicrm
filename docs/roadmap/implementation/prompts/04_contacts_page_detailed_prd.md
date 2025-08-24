# PRD-005: Contacts Page - The Sacred Interface

## 🎯 **Overview**

The Contacts page is the **heart of the wellness platform** - the sacred interface between practitioner and AI-powered client insights. Every interaction must feel intuitive, respectful of privacy, and focused on enhancing client care.

## 📐 **Layout Architecture**

### **Page Structure**

```
┌─────────────────────────────────────────────────────┐
│ [Context Sidebar] │ CONTACTS PAGE │ [Chat Sidebar] │
├──────────────────┼─────────────────┼───────────────┤
│ • All Clients    │ ┌─────────────┐ │ AI Assistant  │
│ • Lifecycle      │ │  WIDGETS    │ │ Context:      │
│ • Tags           │ │ (4 widgets) │ │ "5 clients    │
│ • Risk Levels    │ └─────────────┘ │  selected"    │
│ • Filters        │ ┌─────────────┐ │               │
│                  │ │  TOOLBAR    │ │ Quick Actions │
│ Widget Area:     │ └─────────────┘ │ • Bulk Email  │
│ ┌──────────────┐ │ ┌─────────────┐ │ • Schedule    │
│ │ Quick Stats  │ │ │             │ │ • Add Tags    │
│ │ • Total: 124 │ │ │   TABLE     │ │               │
│ │ • Active: 89 │ │ │             │ │               │
│ │ • At Risk: 3 │ │ │             │ │               │
│ └──────────────┘ │ │             │ │               │
└──────────────────┴─────────────────┴───────────────┘
```

## 🎨 **Widget Row (Top)**

### **Widget 1: Client Stats**

```typescript
interface ClientStatsWidget {
  totalClients: number;
  activeClients: number;
  newThisWeek: number;
  atRisk: number;
  trend: "up" | "down" | "stable";
  percentageChange: number;
}
```

**Visual**: Card with 4 metrics, trend arrows, subtle background colors

### **Widget 2: Lifecycle Overview**

```typescript
interface LifecycleWidget {
  stages: {
    newLeads: number;
    onboarding: number;
    active: number;
    retention: number;
    winBack: number;
    advocacy: number;
  };
  progressChart: "donut" | "bar";
}
```

**Visual**: Donut chart with stage distribution, clickable segments to filter

### **Widget 3: Recent Activity**

```typescript
interface ActivityWidget {
  recentInteractions: {
    clientName: string;
    action: "session" | "email" | "social" | "call";
    timestamp: string;
    aiInsight?: string;
  }[];
  limitDisplay: 5;
}
```

**Visual**: Timeline of recent client interactions, AI insights highlighted

### **Widget 4: Quick Actions**

```typescript
interface QuickActionsWidget {
  actions: [
    { label: "Add Client"; icon: "UserPlus"; action: () => void },
    { label: "Import CSV"; icon: "Upload"; action: () => void },
    { label: "Export Data"; icon: "Download"; action: () => void },
    { label: "Send Newsletter"; icon: "Mail"; action: () => void },
  ];
}
```

**Visual**: 2x2 grid of action buttons with icons

## 🛠️ **Toolbar Specification**

### **Layout**

```
[Search────────────] [Stage: All ▼] [Tags: All ▼] [Risk: All ▼] [Sort: Name ▼] [View: List◉Table○] [Batch▼]
```

### **Search Bar**

- **Placeholder**: "Search clients by name, email, tags, notes..."
- **Real-time filtering** as user types
- **Search scope**: name, email, phone, tags, notes content
- **Debounced**: 300ms delay
- **Clear button** when text present

### **Filter Dropdowns**

```typescript
interface FilterState {
  stage: "all" | "new-leads" | "active" | "at-risk" | "vip";
  tags: string[]; // Multi-select
  riskLevel: "all" | "low" | "medium" | "high";
  lastSession: "all" | "7-days" | "30-days" | "90-days" | "never";
  sortBy: "name" | "last-session" | "created" | "stage" | "risk";
  sortDirection: "asc" | "desc";
}
```

### **Batch Actions** (when items selected)

- **Replace toolbar** with batch action bar
- **Actions**: Send Message, Schedule Sessions, Add Tags, Change Stage, Export Selected
- **Selection counter**: "5 clients selected"
- **Clear selection** button

## 📊 **TanStack Table Implementation**

### **Column Configuration**

```typescript
const contactsColumns: ColumnDef<Contact>[] = [
  {
    id: 'select',
    header: ({ table }) => <SelectAllCheckbox table={table} />,
    cell: ({ row }) => <SelectRowCheckbox row={row} />,
    enableSorting: false,
    enableHiding: false,
    size: 40
  },
  {
    id: 'client',
    header: 'Client',
    cell: ({ row }) => <ClientCell contact={row.original} />,
    enableSorting: true,
    sortingFn: 'alphanumeric',
    size: 250
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <QuickActionsCell contact={row.original} />,
    enableSorting: false,
    enableHiding: false,
    size: 120
  },
  {
    id: 'stage',
    header: 'Lifecycle Stage',
    cell: ({ row }) => <LifecycleStageCell contact={row.original} />,
    enableSorting: true,
    size: 180
  },
  {
    id: 'aiInsights',
    header: 'AI Insights',
    cell: ({ row }) => <AIInsightsCell contact={row.original} />,
    enableSorting: false,
    size: 200
  },
  {
    id: 'notes',
    header: 'Notes',
    cell: ({ row }) => <HoverNotesCell contact={row.original} />,
    enableSorting: false,
    size: 120
  },
  {
    id: 'tags',
    header: 'Tags',
    cell: ({ row }) => <TagsCell contact={row.original} />,
    enableSorting: false,
    size: 150
  },
  {
    id: 'lastSession',
    header: 'Last Session',
    cell: ({ row }) => <LastSessionCell contact={row.original} />,
    enableSorting: true,
    size: 120
  }
];
```

### **Row Interaction States**

- **Default**: `hover:bg-slate-50`
- **Selected**: `bg-emerald-50 border-l-4 border-emerald-500`
- **AI Insight Active**: `bg-amber-50` (when AI has new insight)
- **At Risk**: `border-l-4 border-red-300`

## 🎯 **Sacred Hover Notes Implementation**

### **Trigger Behavior**

```typescript
interface HoverNotesTrigger {
  triggerElement: "notes-cell"; // Only the notes column cell
  hoverDelay: 500; // ms before popup shows
  exitDelay: 300; // ms before popup hides after mouse leave
  positioning: "top-right" | "top-left"; // Dynamic based on viewport
}
```

### **Popup Specifications**

```typescript
interface NotesPopup {
  dimensions: {
    width: 320; // px - fixed width
    maxHeight: 400; // px - scrollable if needed
    minHeight: 200; // px
  };
  styling: {
    background: "backdrop-blur-xl bg-white/95";
    border: "1px solid slate-200";
    borderRadius: "12px";
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)";
    zIndex: 50;
  };
  animation: {
    enter: "fade-in scale-95 to scale-100 duration-200";
    exit: "fade-out scale-100 to scale-95 duration-150";
  };
}
```

### **Popup Content Layout**

```txt
┌─────────────────────────────────┐
│ Notes - Sarah Mitchell      [×] │ ← Header with client name
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Existing notes content...   │ │ ← Scrollable notes area
│ │ • Prefers deep tissue       │ │
│ │ • Sensitive to lavender     │ │
│ │ • Works in tech, stressed   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [────────────────────] [🎤] [✓] │ ← Text input + voice + save
├─────────────────────────────────┤
│ [🎤 Record] [📋 Tasks] [👤 Card] │ ← Action buttons
└─────────────────────────────────┘
```

### **Action Buttons**

```typescript
interface NotesPopupActions {
  recordVoiceNote: {
    icon: "Mic";
    label: "Record Voice Note";
    behavior: "toggle-recording";
    visualFeedback: "pulsing-red-when-active";
  };
  openInTasks: {
    icon: "CheckSquare";
    label: "Create Task";
    behavior: "navigate-to-tasks-with-context";
  };
  openContactCard: {
    icon: "User";
    label: "Open Full Profile";
    behavior: "modal-or-navigate";
  };
  quickEdit: {
    icon: "Edit3";
    label: "Quick Edit";
    behavior: "inline-edit-mode";
  };
}
```

## 🎤 **Voice Note Recording**

### **Recording Flow**

1. **Click Record** → Button turns red, shows "Recording..." with pulse animation
2. **While Recording** → Waveform visualization, timer display
3. **Click Stop** → Shows "Processing..." with spinner
4. **Transcription** → Text appears in input field, editable
5. **Save** → Appends to notes with timestamp

### **Technical Implementation**

```typescript
interface VoiceNoteRecording {
  mediaRecorder: MediaRecorder;
  audioChunks: Blob[];
  transcriptionService: "whisper" | "browser-speech-api";
  maxRecordingDuration: 60; // seconds
  autoStop: true;
  format: "webm" | "mp3";
}

interface VoiceNoteUI {
  recordingIndicator: {
    icon: "pulsing-red-mic";
    timer: "mm:ss";
    waveform: "simple-bars";
  };
  transcriptionState: "recording" | "processing" | "ready" | "error";
  editableTranscript: true;
}
```

### **Permissions & Fallbacks**

- **Request microphone permission** on first use
- **Graceful fallback** to text-only if permission denied
- **Error handling** for unsupported browsers
- **Privacy notice** about voice processing

## 🤖 **AI Integration Points**

### **Soft Schema Generation**

```typescript
interface ContactAIGeneration {
  triggers: ["new-note-added", "session-completed", "email-received", "social-mention"];
  generatedFields: {
    mood: "positive" | "neutral" | "stressed" | "excited";
    preferences: string[];
    concerns: string[];
    goals: string[];
    riskFactors: string[];
    opportunities: string[];
  };
  updateFrequency: "real-time" | "batch-overnight";
}
```

### **Context Awareness**

- **Chat Sidebar** knows selected contacts
- **AI suggestions** relevant to current view/selection
- **Background processing** of new information
- **Privacy controls** for AI data usage

## 📱 **Responsive Behavior**

### **Mobile (< 768px)**

- **Single column** layout
- **Swipe actions** on rows (left: select, right: actions)
- **Simplified toolbar** with drawer for filters
- **Touch-optimized** hover states become tap-to-expand

### **Tablet (768px - 1024px)**

- **Condensed widgets** (2x2 instead of 1x4)
- **Collapsible sidebars**
- **Touch and mouse** input support

### **Desktop (> 1024px)**

- **Full layout** as specified
- **Keyboard shortcuts** for common actions
- **Advanced interactions** (multi-select, drag-drop)

## 🔐 **Privacy & Security**

### **Data Handling**

- **Encrypted notes** at rest and in transit
- **Audit logging** for note access/modifications
- **GDPR compliance** for data export/deletion
- **Client consent** tracking for AI processing

### **Permission Levels**

- **Read-only** for assistant staff
- **Full access** for practice owners
- **Audit trail** for sensitive operations

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] All 4 widgets display correct data and update real-time
- [ ] Search filters work instantly and accurately
- [ ] Table sorts/filters without page reload
- [ ] Hover notes popup appears reliably and quickly
- [ ] Voice recording works in supported browsers
- [ ] Batch operations execute correctly
- [ ] Mobile layout adapts properly
- [ ] AI insights update in background

### **Performance Requirements**

- [ ] Table renders <500ms for 1000+ contacts
- [ ] Search results appear <200ms after typing
- [ ] Hover popup appears within 500ms
- [ ] Voice transcription completes <3s for 30s audio
- [ ] No memory leaks during extended use

### **UX Requirements**

- [ ] Interactions feel instant and responsive
- [ ] Visual feedback for all user actions
- [ ] Graceful error handling with user messaging
- [ ] Consistent design language throughout
- [ ] Accessible keyboard navigation
- [ ] Clear loading states for async operations

**This specification ensures the Contacts page becomes the sacred, privacy-respecting interface between wellness practitioners and their AI-enhanced client insights.** 🌟
