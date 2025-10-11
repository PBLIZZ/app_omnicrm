# OmniCRM by Omnipotency ai - UX Master PRD

## User Experience Architecture & Design Principles

---

## 🎯 **Core Philosophy**

### **The Sacred Client Relationship**

This platform exists to **strengthen the bond** between wellness practitioners and their clients through AI-powered insights, while maintaining absolute respect for privacy and consent. Every interaction should feel like a **gentle enhancement** of the practitioner's intuition, never a replacement for human connection.

### **Privacy-First by Design**

- **No difficult conversations** about data privacy with clients
- **100% consensual data collection** with clear indicators
- **Transparent AI reasoning** - practitioners always understand why the AI suggests something
- **Client sovereignty** - they own their wellness journey data

---

## 🗺️ **User Journey Architecture**

### **Morning Ritual: The Sacred Start**

```txt
Login → Initial Load → Dashboard = "Good morning, here's your day"
```

**Emotional Progression:**

1. **Welcome Back** - Feels like coming home to your practice
2. **AI Briefing** - Like having a trusted assistant who's prepared everything
3. **Client Focus** - Immediate shift to serving clients better
4. **Confident Action** - AI insights empower better decisions

### **Daily Workflow: The Client-Centric Hub**

```txt
Dashboard → Contacts Hub → Individual Client Insights → Action (Task/Communication)
```

**Core Interaction Pattern:**

- **Scan** - Quick visual overview of client status
- **Hover** - Progressive disclosure of deeper insights
- **Click** - Detailed exploration and action
- **Approve** - AI suggestions with full context and reasoning

---

## 📱 **Information Architecture**

### **The Core Spaces**

| Space                 | Purpose                        | User Mindset                             | Key Interactions                |
| --------------------- | ------------------------------ | ---------------------------------------- | ------------------------------- |
| **Dashboard**         | Morning briefing & approvals   | "What needs my attention?"               | Scan, approve, prioritize       |
| **Contacts Hub**      | Client relationship management | "How can I serve my clients better?"     | Search, explore, note, connect  |
| **Tasks & Approvals** | Workflow management            | "What actions will move things forward?" | Review, approve, assign, track  |
| **Integrations**      | Email Analysis and summary     | "How are my messages performing?"        | Read, compose, analyze          |
|                       | Schedule coordination          | "What's happening and when?"             | View, book, reschedule, prepare |

### **Navigation Hierarchy**

```txt
Primary Navigation (Always Visible)
├── Dashboard (Home base)
├── Contacts (The sacred hub)
├── Tasks & Approvals (Action center)
└── Integrations (Message and scheduling hub)

Context Sidebar (Page-Specific)
├── Filters & Quick Actions
└── Page-Specific Widgets

AI Chat Sidebar (Always Available)
├── Contextual Assistance
├── Client Insights
├── Quick Commands
└── Voice Input
```

---

## 🎨 **Design Language**

### **Visual Hierarchy Principles**

#### **Color Psychology & Usage**

```css
/* Primary Palette - From Logo */
Emerald (#10b981): Trust, growth, health
  - Use for: Primary actions, success states, "ready for upsell"
  - Avoid for: Error states, warnings

Teal (#14b8a6): Calm, professional, stability
  - Use for: Navigation, headers, professional elements
  - Context: Creates sense of reliability

Amber (#f59e0b): Attention, warmth, opportunity
  - Use for: Needs attention, opportunities, highlights
  - Context: Warm urgency, not alarming

Sky (#0ea5e9): Clarity, communication, openness
  - Use for: Communications, new information, clarity
  - Context: Fresh, clear thinking

Violet (#8b5cf6): Premium, VIP, special
  - Use for: VIP clients, premium features, insights
  - Context: Elevated experience

/* Neutral Palette */
Slate: Professional, readable, calm
  - Primary text: slate-900
  - Secondary text: slate-600
  - Subtle text: slate-500
  - Backgrounds: slate-50, slate-100
```

#### **Typography Scale**

```css
/* Semantic Typography */
H1: Dashboard page titles - text-3xl font-bold text-slate-900
H2: Section headers - text-2xl font-bold text-slate-900
H3: Widget titles - text-lg font-semibold text-slate-900
H4: Card titles - text-base font-semibold text-slate-900
Body: Primary content - text-sm text-slate-700
Caption: Metadata - text-xs text-slate-500
Label: Form fields - text-xs font-medium text-slate-700 uppercase tracking-wide
```

#### **Spacing & Layout**

```css
/* 4px Base Grid System */
Layout Spacing:
  xs: 8px   - Icon margins, tight spacing
  sm: 12px  - Button padding, form spacing
  md: 16px  - Card padding, standard gaps
  lg: 24px  - Section spacing, widget gaps
  xl: 32px  - Page margins, major sections
  2xl: 48px - Page headers, dramatic spacing

Component Spacing:
  - Cards: 16px internal padding, 8px between cards
  - Tables: 12px cell padding, 1px borders
  - Forms: 16px between fields, 12px button padding
  - Sidebars: 16px padding, 12px between items
```

### **Micro-Interaction Standards**

#### **Hover States (Progressive Disclosure)**

```css
/* Contact Row Hover */
.contact-row:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 200ms ease-out;
}

/* Notes Hover Popup */
.notes-hover-trigger:hover + .notes-popup {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: all 300ms ease-out;
}

/* Action Button Reveals */
.table-row:hover .action-buttons {
  opacity: 1;
  transform: translateX(0);
  transition: all 200ms ease-out;
}
```

#### **Click Feedback**

```css
/* Button Press */
.btn:active {
  transform: scale(0.98);
  transition: transform 100ms ease-out;
}

/* Approval Action */
.approval-card.approving {
  border-left: 4px solid #10b981;
  background: rgba(16, 185, 129, 0.05);
  transition: all 300ms ease-out;
}

/* Card Selection */
.selectable-card.selected {
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
```

#### **Loading States**

```css
/* Skeleton Loading */
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

/* AI Processing */
.ai-thinking {
  background: linear-gradient(45deg, #ecfdf5, #f0fdfa);
  border-left: 3px solid #10b981;
  position: relative;
}

.ai-thinking::before {
  content: "🤖";
  animation: pulse 2s infinite;
}
```

---

## 🏗️ **Component Interaction Specifications**

### **The Sacred Contact Card Interface**

#### **Contact Table Row (Base State)**

```txt
[📸] [Name] [Stage Badge] [Notes Preview] [Tags] [Last Session] [Actions]
```

#### **Contact Table Row on Notes (Hover State)**

```txt
[📸] [Name] [Stage Badge] [Notes Preview ↗️] [Tags] [Last Session] [Actions]
                          [Hover Popup Shows]
```

#### **Notes Hover Popup (The Sacred Interface)**

```html
<!-- 320px width, max 400px height, positioned relative to notes cell -->
<div class="notes-popup">
  <header>
    <h4>Client Notes - [Client Name]</h4>
    <div class="privacy-indicator">🔒 Confidential & Consented</div>
  </header>

  <section class="notes-content">
    <!-- Full notes with timestamps -->
    <div class="note-entry">
      <time>2 days ago</time>
      <p>
        Excellent progress with flexibility goals. Noticed significant improvement in hip
        mobility...
      </p>
    </div>
  </section>

  <footer class="quick-actions">
    <button class="voice-note-btn">🎤 Voice Note</button>
    <button class="add-task-btn">📋 Add Task</button>
    <button class="full-card-btn">👤 Full Card</button>
    <button class="quick-edit-btn">✏️ Quick Edit</button>
  </footer>
</div>
```

#### **Voice Note Recording Interface**

```html
<div class="voice-recording-modal">
  <div class="recording-indicator">
    <div class="pulse-circle"></div>
    <span>Recording... 0:15</span>
  </div>

  <div class="waveform-visual">
    <!-- Live audio visualization -->
  </div>

  <div class="recording-controls">
    <button class="stop-btn">Stop</button>
    <button class="cancel-btn">Cancel</button>
  </div>

  <div class="transcription-preview">
    <p>Live transcription appears here...</p>
  </div>
</div>
```

### **AI Approval Card Interface**

#### **Approval Card Structure**

```html
<div class="approval-card">
  <header class="approval-header">
    <div class="approval-meta">
      <span class="type-badge">[Email/Task/Note]</span>
      <h3 class="client-name">[Client Name]</h3>
      <div class="priority-indicator"></div>
    </div>
    <div class="approval-actions">
      <button class="approve-btn">Approve</button>
      <button class="edit-btn">Edit</button>
      <button class="reject-btn">Reject</button>
    </div>
  </header>

  <section class="approval-content">
    <h4 class="subject-line">[Generated Subject/Title]</h4>
    <div class="content-preview">
      <!-- Email body, task description, or note content -->
    </div>
  </section>

  <footer class="ai-reasoning">
    <h5>🤖 AI Reasoning:</h5>
    <p>
      Client hasn't confirmed tomorrow's appointment and has been very engaged with flexibility work
      based on recent social posts.
    </p>
    <div class="reasoning-details">
      <span class="data-point">Last confirmation: 3 days ago</span>
      <span class="data-point">Social engagement: High</span>
      <span class="data-point">Topic relevance: 95%</span>
    </div>
  </footer>
</div>
```

### **AI Insights on contact card (Full Contact View)**

#### **Context-Aware Insights**

```html
<div class="ai-insights-panel">
  <header>
    <h3>🤖 Client Insights</h3>
    <div class="context-indicator">Viewing: [Current Page/Selection]</div>
  </header>

  <section class="insights-content">
    <!-- Dynamic based on current context -->
    <div class="insight-card ready-for-upsell">
      <h4>Ready for Upsell</h4>
      <p>3 clients showing high engagement and satisfaction scores</p>
      <button class="view-details">View Details</button>
    </div>

    <div class="insight-card needs-attention">
      <h4>Needs Attention</h4>
      <p>1 client hasn't booked in 3 weeks - automated follow-up sent</p>
      <button class="view-details">View Details</button>
    </div>

    <div class="insight-card social-activity">
      <h4>Social Activity</h4>
      <p>5 clients posted wellness-related content - engagement opportunities</p>
      <button class="view-details">View Details</button>
    </div>
  </section>

  <footer class="chat-interface">
    <input type="text" placeholder="Ask me about your clients..." />
    <button class="voice-input">🎤</button>
  </footer>
</div>
```

---

## 🔐 **Privacy-First Design Patterns**

### **Consent Indicators**

```html
<!-- Throughout the interface, show consent status -->
<div class="data-consent-indicator">
  <span class="consent-status consented">🔒 Consented</span>
  <span class="data-type">Social Media</span>
</div>

<div class="data-consent-indicator">
  <span class="consent-status pending">⏳ Pending</span>
  <span class="data-type">Email Analytics</span>
</div>
```

### **Data Source Transparency**

```html
<!-- Always show where AI insights come from -->
<div class="ai-insight-source">
  <p class="insight">Client showing high engagement with flexibility content</p>
  <div class="source-info">
    <span class="source">Source: Instagram activity (consented)</span>
    <span class="confidence">Confidence: 94%</span>
    <span class="last-updated">Updated: 2 hours ago</span>
  </div>
</div>
```

### **Privacy Controls**

```html
<!-- Easy access to privacy controls -->
<div class="privacy-controls">
  <button class="data-usage-btn">View Data Usage</button>
  <button class="consent-management-btn">Manage Consent</button>
  <button class="export-data-btn">Export Client Data</button>
</div>
```

---

```typescript
/* Desktop */
@media (min-width: 1024px) {
  .app-layout {
    /* Full dual-sidebar layout */
    display: grid;
    grid-template-columns: 250px 1fr 320px;
  }

  .hover-popups {
    /* Enable hover interactions */
    pointer-events: auto;
  }
}
```

---

## 🚀 **Implementation Priority**

### **Phase 1: Foundation (Weeks 1-2)**

1. **Design System** - Colors, typography, spacing, basic components
2. **Layout Architecture** - Header, dual sidebars, responsive grid
3. **Navigation Patterns** - Primary nav, context switching, state management

### **Phase 2: Core Interfaces (Weeks 3-4)**

1. **Contact Table** - Basic table with hover states
2. **Notes Popup** - Sacred interface with voice recording
3. **Approval Cards** - AI reasoning display and actions
4. **AI Insights Panel** - Context-aware sidebar

### **Phase 3: Advanced Interactions (Weeks 5-6)**

1. **Voice Recording** - Full transcription workflow
2. **Advanced Filters** - Multi-criteria searching and sorting
3. **Batch Operations** - Select multiple items, bulk actions

### **Phase 4: Polish & Performance (Weeks 7-8)**

1. **Micro-Interactions** - Smooth animations, feedback
2. **Accessibility** - Screen reader optimization, keyboard navigation
3. **Performance** - Lazy loading, virtualization, caching
4. **User Testing** - Real practitioner feedback and refinement

---

## 📝 **Developer Handoff Checklist**

### **Each Component PRD Must Include:**

- [ ] **Interaction States** - Default, hover, active, disabled, loading
- [ ] **Props Interface** - TypeScript definitions with examples
- [ ] **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- [ ] **Error Handling** - What happens when data fails to load
- [ ] **Loading States** - Skeleton screens and progressive enhancement
- [ ] **Privacy Considerations** - How sensitive data is handled
- [ ] **AI Integration Points** - Where AI insights appear and how they're triggered

### **Quality Gates:**

- [ ] **Design Review** - Matches vision specs exactly
- [ ] **UX Review** - Interaction patterns feel natural and efficient
- [ ] **Privacy Review** - All data handling respects consent and transparency
- [ ] **Accessibility Audit** - WCAG 2.1 AA compliance verified
- [ ] **Performance Check** - Interactions under 200ms, no janky animations
- [ ] **Integration Testing** - Plays well with other components

---

**This UX Master PRD establishes the complete user experience vision that individual component PRDs will implement. Every developer should internalize these principles before building their specific piece of the wellness platform.**

The goal is not just functional software, but a **sacred interface** that strengthens the practitioner-client relationship through thoughtful, privacy-first AI assistance.
