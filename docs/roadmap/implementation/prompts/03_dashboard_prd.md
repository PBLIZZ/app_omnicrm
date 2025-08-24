# PRD-004: Dashboard Page - Your Daily Wellness Practice Overview

## 🎯 **Overview**

The Dashboard is the **morning briefing headquarters** - where wellness practitioners start each day with AI-curated insights, pending approvals, and today's focus areas.

## 📐 **Layout Architecture**

### **Page Structure**

```
┌─────────────────────────────────────────────────────┐
│ Good morning, Joanne 👋                              │
│ Here's what's happening with your practice today.   │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │METRICS  │ │SCHEDULE │ │AI FOCUS │ │QUICK    │     │
│ │         │ │         │ │         │ │ACTIONS  │     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
├─────────────────────────────────────────────────────┤
│ ┌─[Day/Week Toggle]─────┐ ┌─────────────────────┐   │
│ │                       │ │                     │   │
│ │    TODAY'S SCHEDULE   │ │   PENDING APPROVALS │   │
│ │    (1/3 width)        │ │   (2/3 width)       │   │
│ │                       │ │   [AI Queue]        │   │
│ │                       │ │                     │   │
│ └───────────────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 📊 **Widget Row Specifications**

### **Widget 1: Practice Metrics**

```typescript
interface PracticeMetricsWidget {
  timeframe: "today" | "week" | "month";
  metrics: {
    newClients: { value: number; trend: number; period: string };
    sessionsToday: { value: number; confirmed: number; pending: number };
    revenue: { value: number; trend: number; target: number };
    satisfaction: { score: number; responses: number; trend: number };
  };
  quickActions: ["View Details", "Export Report"];
}
```

**Visual Design:**

- **Card with glassmorphism** backdrop
- **Large numbers** with trend indicators (↗️ +15%)
- **Progress bars** for goals (revenue target, session targets)
- **Color coding**: Green (good), Amber (attention), Red (urgent)

### **Widget 2: Today's Schedule**

```typescript
interface TodaysScheduleWidget {
  timeframe: "today" | "week";
  appointments: {
    time: string;
    client: string;
    service: string;
    status: "confirmed" | "pending" | "cancelled";
    aiNotes?: string; // Pre-session AI insights
  }[];
  summary: {
    total: number;
    confirmed: number;
    gaps: string[]; // Available time slots
  };
}
```

**Interactions:**

- **Click appointment** → Quick client preview
- **Drag to reschedule** (if calendar integration allows)
- **One-click confirmations** for pending appointments

### **Widget 3: AI Focus Areas**

```typescript
interface AIFocusWidget {
  insights: {
    type: "opportunity" | "risk" | "celebration";
    title: string;
    description: string;
    actionable: boolean;
    clientsAffected: number;
    suggestedAction?: string;
  }[];
  priorities: {
    high: number; // Needs immediate attention
    medium: number; // This week
    low: number; // Nice to have
  };
}
```

**Example Insights:**

- 🎯 **Opportunity**: "3 clients ready for package upgrades"
- ⚠️ **Risk**: "Emma hasn't booked in 3 weeks"
- 🎉 **Celebration**: "95% satisfaction rate this month!"

### **Widget 4: Quick Actions**

```typescript
interface QuickActionsWidget {
  primaryActions: [
    { label: "Add Client"; icon: "UserPlus"; color: "emerald" },
    { label: "Quick Note"; icon: "Edit3"; color: "sky" },
    { label: "Send Message"; icon: "MessageSquare"; color: "violet" },
    { label: "View Calendar"; icon: "Calendar"; color: "amber" },
  ];
  contextualActions: {
    // Changes based on time of day, pending items, etc.
    morning: ["Review Approvals", "Confirm Today"];
    afternoon: ["Session Notes", "Follow-ups"];
    evening: ["Day Summary", "Tomorrow Prep"];
  };
}
```

## ⏰ **Day/Week Toggle Implementation**

### **Toggle Behavior**

```typescript
interface TimeframeToggle {
  options: ["Today", "This Week"];
  defaultState: "Today";
  persistence: "session" | "localStorage";
  affects: ["schedule", "metrics", "approvals"];
  animation: "smooth-transition-300ms";
}
```

### **Data Changes on Toggle**

- **Today View**:
  - Schedule shows today's appointments
  - Metrics show daily numbers
  - Approvals show today's urgent items
- **Week View**:
  - Schedule shows next 7 days (rolling)
  - Metrics show weekly aggregates
  - Approvals show all pending items

## 🤖 **Pending Approvals Section (2/3 Width)**

### **Layout Specification**

```typescript
interface ApprovalsSection {
  header: {
    title: "Pending AI Actions";
    subtitle: "Review and approve AI-generated suggestions";
    controls: ["Approve All", "View Details", "Settings"];
  };
  queueDisplay: {
    maxVisible: 3; // Show 3, indicate "X more"
    expandable: true;
    sortBy: "priority" | "timeCreated" | "type";
  };
  cardFormat: "condensed"; // Full details in AI Approvals page
}
```

### **Condensed Approval Card**

```
┌─────────────────────────────────────────────────────┐
│ 🔴 HIGH │ Send follow-up to 5 new leads          [✓][✗] │
│         │ AI detected high engagement signals           │
│         │ Affects: Sarah M., John D., Emma R. +2        │
│ ────────┼─────────────────────────────────────────────  │
│ Created 2h ago │ Est. 15min review │ Opens: 3-5 emails │
└─────────────────────────────────────────────────────┘
```

### **Bulk Actions**

- **Approve All** button with confirmation
- **Smart grouping** (e.g., "Approve all follow-ups")
- **Quick reject** for low-priority items
- **Schedule for later** option

## 📱 **Responsive Adaptations**

### **Mobile Layout**

```
┌─────────────────┐
│ Good morning!   │
├─────────────────┤
│ ┌─────┐ ┌─────┐ │ ← 2x2 widget grid
│ │ M   │ │ S   │ │
│ └─────┘ └─────┘ │
│ ┌─────┐ ┌─────┐ │
│ │ AI  │ │ QA  │ │
│ └─────┘ └─────┘ │
├─────────────────┤
│ [Day][Week]     │ ← Toggle buttons
├─────────────────┤
│ TODAY'S SCHEDULE│ ← Stacked layout
│ (Full width)    │
├─────────────────┤
│ PENDING APPROVALS│
│ (Full width)    │
└─────────────────┘
```

### **Tablet Layout**

- **Widget row** becomes 2x2 grid
- **Main content** remains side-by-side
- **Touch-friendly** interaction targets

## 🔄 **Real-Time Updates**

### **Live Data Sources**

```typescript
interface RealTimeUpdates {
  webSocket: {
    url: "/ws/dashboard";
    events: ["new-approval", "appointment-confirmed", "client-activity"];
  };
  polling: {
    metrics: 60000; // 1 minute
    schedule: 30000; // 30 seconds
    approvals: 10000; // 10 seconds
  };
  optimisticUpdates: true;
}
```

### **Update Animations**

- **New approvals**: Slide in from top with gentle bounce
- **Metric changes**: Number counter animation
- **Schedule updates**: Highlight changed items
- **Error states**: Toast notifications with retry options

## 🎨 **Micro-Interactions**

### **Widget Interactions**

- **Hover states**: Subtle lift with shadow
- **Click feedback**: Brief scale animation
- **Loading states**: Skeleton shimmer
- **Success states**: Green checkmark flash

### **Approval Actions**

- **Approve button**: Green fill with checkmark
- **Reject button**: Red border with X
- **Batch approve**: Progress bar during processing
- **Error handling**: Shake animation + error message

## 📊 **Analytics Integration**

### **User Behavior Tracking**

```typescript
interface DashboardAnalytics {
  interactions: {
    widgetClicks: { widget: string; timestamp: Date }[];
    approvalActions: { action: "approve" | "reject"; type: string }[];
    timeOnPage: number;
    toggleUsage: { from: string; to: string; timestamp: Date }[];
  };
  performance: {
    loadTime: number;
    renderTime: number;
    errorRate: number;
  };
}
```

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] Widgets display accurate, real-time data
- [ ] Day/Week toggle updates all relevant sections
- [ ] Approval actions execute correctly and update UI
- [ ] Schedule integrates with calendar data
- [ ] Mobile layout works on all screen sizes
- [ ] Real-time updates appear within 30 seconds

### **Performance Requirements**

- [ ] Dashboard loads completely within 2 seconds
- [ ] Widget data refreshes without page flicker
- [ ] Approval actions provide immediate feedback
- [ ] Smooth animations at 60fps
- [ ] Works offline with cached data

### **UX Requirements**

- [ ] Morning briefing feels personal and relevant
- [ ] AI suggestions are clearly explained
- [ ] Quick actions are genuinely useful
- [ ] Information hierarchy guides attention naturally
- [ ] Accessible to screen readers and keyboard navigation

**The Dashboard becomes the practitioner's daily command center - efficient, insightful, and respectful of their time.** ⚡
