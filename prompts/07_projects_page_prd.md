# PRD-007: Projects Page - Strategic Initiative Hub

## 🎯 **Overview**

The Projects page is where **strategic initiatives meet tactical execution**. Unlike individual tasks, projects represent larger wellness practice goals spanning weeks or months, with multiple tasks, deadlines, and stakeholders.

## 📐 **Layout Architecture**

### **Page Structure**

```
┌─────────────────────────────────────────────────────┐
│ [Context Sidebar] │  PROJECTS PAGE  │ [Chat Sidebar] │
├──────────────────┼─────────────────┼───────────────┤
│ Quick Filters:   │ ┌─────────────┐ │ AI Assistant  │
│ • Active         │ │  WIDGETS    │ │ Context:      │
│ • Planning       │ │ (4 widgets) │ │ "Q4 Workshop  │
│ • On Hold        │ └─────────────┘ │  project"     │
│ • Completed      │ ┌─────────────┐ │               │
│                  │ │  TOOLBAR    │ │ Suggestions:  │
│ Project Types:   │ └─────────────┘ │ • Add milestone│
│ • Client Growth  │ ┌─────────────┐ │ • Update tasks │
│ • Marketing      │ │             │ │ • Check budget │
│ • Operations     │ │  PROJECT    │ │               │
│ • Learning       │ │   CARDS     │ │               │
│                  │ │             │ │               │
└──────────────────┴─────────────────┴───────────────┘
```

## 🎨 **Widget Row (Top)**

### **Widget 1: Project Portfolio Health**

```typescript
interface ProjectPortfolioWidget {
  overview: {
    totalProjects: number;
    activeProjects: number;
    onTrackProjects: number;
    atRiskProjects: number;
    overBudgetProjects: number;
  };
  health: {
    overallScore: number; // 0-100
    trends: {
      completion: "up" | "down" | "stable";
      budget: "under" | "over" | "on-track";
      timeline: "ahead" | "behind" | "on-time";
    };
  };
  quickInsights: string[]; // "3 projects need attention", "Budget variance: +12%"
}
```

### **Widget 2: Resource Allocation**

```typescript
interface ResourceAllocationWidget {
  timeDistribution: {
    yourTime: { allocated: number; available: number; unit: "hours/week" };
    aiTime: { automated: number; oversight: number; unit: "hours/week" };
    outsourced: { contractors: number; cost: number; unit: "hours/week" };
  };
  skillGaps: {
    identified: string[]; // ["Social media management", "Email automation"]
    recommendations: string[]; // ["Consider training", "Hire specialist"]
  };
  utilization: {
    current: number; // 85%
    optimal: number; // 75%
    burnoutRisk: "low" | "medium" | "high";
  };
}
```

### **Widget 3: Milestone Tracker**

```typescript
interface MilestoneTrackerWidget {
  upcomingMilestones: {
    title: string;
    project: string;
    dueDate: Date;
    status: "on-track" | "at-risk" | "overdue";
    completion: number; // 0-100%
  }[];
  recentAchievements: {
    title: string;
    project: string;
    completedDate: Date;
    impact: string; // "Increased client retention by 15%"
  }[];
  criticalPath: {
    projectsBlocking: string[];
    dependenciesOverdue: number;
  };
}
```

### **Widget 4: ROI & Impact**

```typescript
interface ROIImpactWidget {
  financialMetrics: {
    totalInvestment: number;
    projectedRevenue: number;
    actualRevenue: number;
    roi: number; // Return on Investment %
  };
  businessImpact: {
    clientsSatisfied: number;
    processesImproved: number;
    timeAutomated: string; // "12 hours/week"
    efficiencyGain: number; // 23%
  };
  learningOutcomes: {
    skillsDeveloped: string[];
    certifications: string[];
    knowledgeAssets: number;
  };
}
```

## 🛠️ **Toolbar Specification**

### **Layout**

```
[Search projects...] [Status: All ▼] [Type: All ▼] [Owner: All ▼] [Timeline: All ▼] [Sort: Priority ▼] [View: Cards◉List○] [+ New Project]
```

### **Filter System**

```typescript
interface ProjectFilters {
  search: {
    scope: ["title", "description", "goals", "tags", "stakeholders"];
    placeholder: "Search projects, goals, or outcomes...";
    intelligentSearch: true; // "marketing projects behind schedule"
  };
  status: {
    options: ["all", "planning", "active", "on-hold", "completed", "archived"];
    colors: {
      planning: "amber";
      active: "emerald";
      "on-hold": "slate";
      completed: "green";
      archived: "gray";
    };
  };
  type: {
    options: ["all", "client-growth", "marketing", "operations", "learning", "infrastructure"];
    icons: {
      "client-growth": "TrendingUp";
      marketing: "Megaphone";
      operations: "Settings";
      learning: "BookOpen";
      infrastructure: "Wrench";
    };
  };
  timeline: {
    options: ["all", "overdue", "due-this-week", "due-this-month", "future"];
    urgency: { overdue: "red"; "due-this-week": "amber"; "due-this-month": "yellow" };
  };
}
```

## 📋 **Project Card Design**

### **Card Layout (Cards View)**

```
┌─────────────────────────────────────────────────────┐
│ 🎯 Q4 Wellness Workshop Series              [⚙️▼]  │ ← Header with type icon
│ Client Growth • Active • Due Dec 31                │
├─────────────────────────────────────────────────────┤
│ Launch comprehensive workshop program to            │ ← Description
│ increase client retention and attract new...        │
├─────────────────────────────────────────────────────┤
│ Progress: ████████████████░░░░ 65%                 │ ← Progress bar
│ Budget: $2,400 / $3,000 (80%)                      │
├─────────────────────────────────────────────────────┤
│ 📅 Next: Book venue (Due Dec 15)                   │ ← Next milestone
│ 👤 Owner: You  👥 Team: AI Assistant               │ ← Ownership
├─────────────────────────────────────────────────────┤
│ ✅ 8 completed  🔄 3 in progress  📋 2 pending      │ ← Task summary
├─────────────────────────────────────────────────────┤
│ [📊 View Details] [✏️ Edit] [📝 Add Task]           │ ← Actions
└─────────────────────────────────────────────────────┘
```

### **Card Variants by Status**

```css
.project-card.planning {
  @apply border-l-4 border-amber-400 bg-amber-50;
}

.project-card.active {
  @apply border-l-4 border-emerald-500 bg-emerald-50;
}

.project-card.at-risk {
  @apply border-l-4 border-red-400 bg-red-50;
  /* Pulsing animation for attention */
}

.project-card.on-hold {
  @apply border-l-4 border-slate-400 bg-slate-50 opacity-75;
}

.project-card.completed {
  @apply border-l-4 border-green-500 bg-green-50;
}
```

## 📊 **Project Detail View**

### **Detail Modal/Page Layout**

```
┌─────────────────────────────────────────────────────────────┐
│ Q4 Wellness Workshop Series                           [×]   │
│ 🎯 Client Growth • Active • Created Nov 1 • Due Dec 31     │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Overview ──────┐ ┌─ Tasks ────────┐ ┌─ Timeline ──────┐ │
│ │ Description     │ │ ✅ Completed   │ │ [Gantt Chart]  │ │
│ │ Goals           │ │ 🔄 In Progress │ │                 │ │
│ │ Success Metrics │ │ 📋 Pending     │ │                 │ │
│ │ Budget          │ │ ➕ Add Task    │ │                 │ │
│ └─────────────────┘ └────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Updates & Notes ──────────────────────────────────────┐ │
│ │ [Timeline of progress updates, decisions, learnings]  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [💬 Add Update] [✏️ Edit Project] [📊 Generate Report]     │
└─────────────────────────────────────────────────────────────┘
```

### **Task Integration**

```typescript
interface ProjectTaskIntegration {
  taskViews: {
    embedded: "show-project-tasks-within-project-detail";
    linked: "deep-link-to-tasks-page-with-project-filter";
    hybrid: "summary-in-project + link-to-full-view";
  };
  taskCreation: {
    context: "automatically-assign-to-project";
    templates: "project-specific-task-templates";
    dependencies: "link-tasks-with-predecessor-relationships";
  };
  progressTracking: {
    automatic: "calculate-progress-from-task-completion";
    manual: "allow-manual-progress-updates";
    weighted: "tasks-have-different-weights";
  };
}
```

## 🗓️ **Timeline & Milestone Management**

### **Gantt Chart Integration**

```typescript
interface GanttChartFeatures {
  visualization: {
    tasks: "show-project-tasks-as-gantt-bars";
    milestones: "diamond-markers-for-key-dates";
    dependencies: "arrows-connecting-dependent-tasks";
    progress: "filled-bars-showing-completion";
  };
  interactions: {
    dragResize: "adjust-task-duration-by-dragging";
    linkTasks: "create-dependencies-by-connecting";
    addMilestones: "double-click-to-add-milestone";
    zoomLevels: ["days", "weeks", "months"];
  };
  criticalPath: {
    highlight: "show-critical-path-in-red";
    analysis: "identify-bottlenecks-automatically";
    optimization: "suggest-schedule-improvements";
  };
}
```

### **Milestone Types**

```typescript
interface MilestoneTypes {
  planning: {
    icon: "📋";
    examples: ["Project kickoff", "Requirements gathering", "Budget approval"];
    color: "amber";
  };
  execution: {
    icon: "🔧";
    examples: ["Development start", "First draft complete", "Testing phase"];
    color: "blue";
  };
  review: {
    icon: "👀";
    examples: ["Stakeholder review", "Quality check", "Client feedback"];
    color: "purple";
  };
  delivery: {
    icon: "🚀";
    examples: ["Launch date", "Go-live", "Project completion"];
    color: "green";
  };
}
```

## 🤖 **AI Integration Features**

### **Project Health Monitoring**

```typescript
interface AIProjectMonitoring {
  riskDetection: {
    scheduleRisk: "analyze-task-completion-rates";
    budgetRisk: "track-spending-vs-timeline";
    resourceRisk: "detect-overallocation-patterns";
    qualityRisk: "monitor-deliverable-feedback";
  };
  recommendations: {
    scheduling: "suggest-task-reordering";
    resources: "recommend-skill-development";
    budget: "identify-cost-optimization";
    scope: "detect-scope-creep-early";
  };
  automation: {
    statusUpdates: "auto-generate-progress-reports";
    stakeholderComms: "draft-update-emails";
    taskCreation: "suggest-missing-tasks";
    milestoneTracking: "alert-approaching-deadlines";
  };
}
```

### **Smart Project Templates**

```typescript
interface AIProjectTemplates {
  industrySpecific: {
    "wellness-workshop": {
      phases: ["Planning", "Marketing", "Delivery", "Follow-up"];
      defaultTasks: string[];
      estimatedDuration: "8-12 weeks";
      resourceRequirements: { time: "10-15 hours/week"; budget: "$2000-5000" };
    };
    "client-retention-program": {
      phases: ["Analysis", "Strategy", "Implementation", "Measurement"];
      defaultTasks: string[];
      estimatedDuration: "6-8 weeks";
      resourceRequirements: { time: "8-12 hours/week"; budget: "$1000-3000" };
    };
    "digital-marketing-campaign": {
      phases: ["Strategy", "Content Creation", "Launch", "Optimization"];
      defaultTasks: string[];
      estimatedDuration: "4-6 weeks";
      resourceRequirements: { time: "12-20 hours/week"; budget: "$500-2000" };
    };
  };
  customization: {
    userPatterns: "learn-from-past-projects";
    industryBenchmarks: "compare-to-similar-businesses";
    seasonalFactors: "adjust-for-wellness-industry-cycles";
  };
}
```

## 📈 **Project Analytics**

### **Performance Metrics**

```typescript
interface ProjectAnalytics {
  completionMetrics: {
    onTimeDelivery: number; // Percentage
    budgetAdherence: number; // Percentage
    scopeManagement: number; // Scope creep incidents
    qualityScores: number[]; // Stakeholder satisfaction
  };
  resourceMetrics: {
    teamEfficiency: number; // Output per hour
    skillUtilization: { [skill: string]: number };
    burnoutIndicators: { stress: number; workload: number };
    learningOutcomes: string[];
  };
  businessImpact: {
    revenueGenerated: number;
    costsSaved: number;
    clientsSatisfied: number;
    processesImproved: number;
  };
  trends: {
    projectComplexity: "increasing" | "stable" | "decreasing";
    deliverySpeed: "improving" | "stable" | "declining";
    qualityTrends: "improving" | "stable" | "declining";
  };
}
```

### **Report Generation**

```typescript
interface ProjectReporting {
  executiveSummary: {
    template: "one-page-overview";
    sections: ["Status", "Risks", "Achievements", "Next Steps"];
    frequency: "weekly-or-on-demand";
  };
  detailedReport: {
    template: "comprehensive-analysis";
    sections: ["Progress", "Budget", "Resources", "Quality", "Lessons"];
    frequency: "monthly-or-milestone";
  };
  stakeholderUpdate: {
    template: "client-friendly-summary";
    sections: ["Accomplishments", "Upcoming", "Any Concerns"];
    frequency: "bi-weekly";
  };
  postMortem: {
    template: "lessons-learned";
    sections: ["What Worked", "What Didn't", "Improvements", "Recommendations"];
    trigger: "project-completion";
  };
}
```

## 📱 **Mobile Adaptations**

### **Mobile Card Layout**

```
┌─────────────────────────────┐
│ 🎯 Q4 Workshop Series       │ ← Project title
│ Active • Due Dec 31         │ ← Status & deadline
├─────────────────────────────┤
│ Progress: 65% ████████░░░   │ ← Progress bar
│ Budget: 80% ($2,400/$3,000) │
├─────────────────────────────┤
│ Next: Book venue (Dec 15)   │ ← Next milestone
│ Owner: You                  │
├─────────────────────────────┤
│ [Details] [Tasks] [Edit]    │ ← Action buttons
└─────────────────────────────┘
```

### **Mobile Interactions**

- **Swipe left** → Quick actions (edit, archive, duplicate)
- **Swipe right** → Mark milestone complete
- **Long press** → Multi-select for bulk operations
- **Tap progress bar** → Quick progress update
- **Pull to refresh** → Sync project status

## 🔄 **Integration Points**

### **Task System Integration**

```typescript
interface TaskIntegration {
  bidirectional: {
    projectToTasks: "filter-tasks-by-project";
    tasksToProject: "update-project-progress-from-tasks";
  };
  automation: {
    taskCreation: "create-project-tasks-from-templates";
    progressUpdates: "auto-calculate-project-completion";
    milestoneTracking: "create-milestone-tasks-automatically";
  };
  reporting: {
    crossReference: "show-task-details-in-project-reports";
    workloadAnalysis: "analyze-resource-allocation-across-projects";
  };
}
```

### **Calendar Integration**

```typescript
interface CalendarIntegration {
  milestones: {
    sync: "add-project-milestones-to-calendar";
    notifications: "reminder-alerts-for-deadlines";
    scheduling: "block-time-for-project-work";
  };
  meetings: {
    projectMeetings: "schedule-regular-project-reviews";
    stakeholderUpdates: "calendar-invites-for-status-meetings";
    planning: "time-block-for-project-planning";
  };
}
```

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] Project cards display accurate progress and status
- [ ] Detail view shows comprehensive project information
- [ ] Task integration works bidirectionally
- [ ] Timeline view accurately represents project schedule
- [ ] AI recommendations are contextually relevant
- [ ] Templates create complete project structures
- [ ] Reports generate accurate project analytics

### **Performance Requirements**

- [ ] Project list loads within 1 second for 50+ projects
- [ ] Detail views open within 500ms
- [ ] Progress calculations update in real-time
- [ ] Gantt chart renders smoothly for complex projects
- [ ] Mobile interface responds immediately to gestures
- [ ] Bulk operations complete within 10 seconds

### **Business Requirements**

- [ ] Project health monitoring identifies risks early
- [ ] Resource allocation prevents team burnout
- [ ] Timeline management keeps projects on track
- [ ] Budget tracking prevents cost overruns
- [ ] Success metrics align with business goals
- [ ] Learning capture improves future projects

### **User Experience Requirements**

- [ ] Project creation is intuitive and guided
- [ ] Progress tracking feels automatic and accurate
- [ ] Collaboration features support team coordination
- [ ] Mobile experience provides essential functionality
- [ ] Visual design communicates project status clearly
- [ ] Navigation between projects and tasks is seamless

**The Projects page becomes the strategic command center where wellness practitioners plan, execute, and measure their most important business initiatives.** 🎯📊
