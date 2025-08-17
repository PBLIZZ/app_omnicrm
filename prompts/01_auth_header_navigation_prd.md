# PRD-002: Auth Header & Navigation - The Command Center

## 🎯 **Overview**

The Auth Header is the **primary navigation interface** that appears on every page. It provides instant access to core functions while maintaining a clean, professional wellness aesthetic that builds trust with practitioners.

## 📐 **Layout Specification**

### **Desktop Header (1024px+)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Logo] Wellness Hub │ Dashboard │ Contacts │ Tasks │ Integrations │ Settings │ [🔍 Search────] │ [🤖] │ [🔔3] │ [👤▼] │
└─────────────────────────────────────────────────────────────────────────┘
```

### **Tablet Header (768px - 1024px)**

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] [Logo] │ Dashboard │ Contacts │ Tasks │ [🔍] │ [🤖] │ [👤▼] │
└─────────────────────────────────────────────────────────────────┘
```

### **Mobile Header (<768px)**

```
┌───────────────────────────────────────┐
│ [☰] Wellness Hub     [🔍] [🤖] [👤▼] │
└───────────────────────────────────────┘
```

## 🎨 **Component Specifications**

### **Logo & Brand**

```typescript
interface LogoBrand {
  desktop: {
    logoSize: "32px";
    brandText: "Wellness Hub";
    brandFont: "text-xl font-bold text-slate-900";
    logoColors: {
      background: "#047857"; // emerald-700
      accent: "#f59e0b"; // amber-500
    };
  };
  mobile: {
    logoSize: "28px";
    brandText: "Wellness Hub"; // Full text, not abbreviated
    responsive: "hide-on-small-screens-only-if-needed";
  };
}
```

### **Primary Navigation**

```typescript
interface PrimaryNavigation {
  items: [
    {
      id: "dashboard";
      label: "Dashboard";
      href: "/dashboard";
      icon: "BarChart3";
      description: "Practice overview and daily briefing";
    },
    {
      id: "contacts";
      label: "Contacts";
      href: "/contacts";
      icon: "Users";
      description: "Client management and AI insights";
      badge?: number; // New clients, urgent items
    },
    {
      id: "tasks";
      label: "Tasks";
      href: "/tasks";
      icon: "CheckSquare";
      description: "Projects, tasks, and AI approvals";
      badge?: number; // Pending approvals
    },
    {
      id: "integrations";
      label: "Integrations";
      href: "/integrations";
      icon: "Zap";
      description: "Calendar, email, and app connections";
    },
  ];
  styling: {
    activeState: "border-b-2 border-emerald-500 text-emerald-600";
    hoverState: "text-emerald-700 bg-emerald-50";
    default: "text-slate-600 hover:text-slate-900";
  };
}
```

### **Global Search**

```typescript
interface GlobalSearch {
  placeholder: "Search clients, tasks, notes...";
  shortcuts: {
    trigger: "Cmd+K" | "Ctrl+K";
    modal: true; // Opens full search modal
  };
  scope: [
    "contacts.name",
    "contacts.email",
    "contacts.notes",
    "tasks.title",
    "tasks.description",
    "approvals.title",
  ];
  features: {
    recentSearches: true;
    searchSuggestions: true;
    quickActions: true; // "Add new client", "Create task"
  };
}
```

### **Utility Icons**

```typescript
interface UtilityIcons {
  aiAssistant: {
    icon: "🤖";
    tooltip: "AI Assistant";
    action: "toggle-chat-sidebar";
    badge?: "new-suggestions"; // When AI has new insights
  };
  notifications: {
    icon: "Bell";
    badge: number; // Count of unread notifications
    dropdown: NotificationDropdown;
    types: ["appointment-confirmed", "ai-approval-ready", "client-message"];
  };
  userMenu: {
    trigger: "avatar-with-dropdown-arrow";
    avatar: "initials-or-photo";
    name: "display-name";
    dropdown: UserMenuDropdown;
  };
}
```

## 🔍 **Global Search Implementation**

### **Search Modal (Cmd+K)**

```
┌─────────────────────────────────────────────────────┐
│ Search wellness practice...               [Esc]    │
├─────────────────────────────────────────────────────┤
│ Recent searches:                                    │
│ • Sarah Mitchell                                    │
│ • Follow-up tasks                                   │
│ • VIP clients                                       │
├─────────────────────────────────────────────────────┤
│ Quick actions:                                      │
│ • Add new client                          [Ctrl+N]  │
│ • Create task                            [Ctrl+T]  │
│ • Schedule session                       [Ctrl+S]  │
└─────────────────────────────────────────────────────┘
```

### **Search Results**

```typescript
interface SearchResults {
  categories: {
    clients: {
      icon: "Users";
      results: ClientSearchResult[];
      quickAction: "View profile";
    };
    tasks: {
      icon: "CheckSquare";
      results: TaskSearchResult[];
      quickAction: "Mark complete";
    };
    notes: {
      icon: "FileText";
      results: NoteSearchResult[];
      quickAction: "Open client";
    };
  };
  keyboard: {
    navigation: "arrow-keys";
    selection: "enter";
    actions: "ctrl+enter"; // Direct actions
  };
}
```

## 🔔 **Notification System**

### **Notification Dropdown**

```
┌─────────────────────────────────────┐
│ Notifications                  [×]  │
├─────────────────────────────────────┤
│ 🟢 Appointment confirmed            │
│    Sarah M. - Tomorrow 3:00 PM     │
│    2 minutes ago                    │
├─────────────────────────────────────┤
│ 🤖 AI approval ready               │
│    3 email drafts need review      │
│    15 minutes ago                   │
├─────────────────────────────────────┤
│ 📧 New client message              │
│    John D. asked about pricing     │
│    1 hour ago                       │
├─────────────────────────────────────┤
│ [Mark all as read] [View all]       │
└─────────────────────────────────────┘
```

### **Notification Types**

```typescript
interface NotificationTypes {
  appointments: {
    confirmed: { icon: "🟢"; priority: "medium"; sound: false };
    cancelled: { icon: "🔴"; priority: "high"; sound: true };
    reminder: { icon: "⏰"; priority: "medium"; sound: true };
  };
  ai: {
    approvalsReady: { icon: "🤖"; priority: "medium"; sound: false };
    insightsGenerated: { icon: "💡"; priority: "low"; sound: false };
    errorOccurred: { icon: "⚠️"; priority: "high"; sound: true };
  };
  clients: {
    newMessage: { icon: "📧"; priority: "medium"; sound: true };
    feedbackReceived: { icon: "⭐"; priority: "low"; sound: false };
    atRiskDetected: { icon: "🚨"; priority: "high"; sound: true };
  };
}
```

## 👤 **User Menu Dropdown**

### **Menu Structure**

```
┌─────────────────────────────────────┐
│ 👩‍💼 Joanne Smith                    │
│     joanne@wellnesshub.com          │
├─────────────────────────────────────┤
│ 👤 Profile & Settings              │
│ 🎨 Appearance                      │
│ 🔔 Notifications                   │
│ 💳 Billing & Subscription          │
├─────────────────────────────────────┤
│ 📊 Usage & Analytics               │
│ 🔗 Integrations                    │
│ ❓ Help & Support                  │
├─────────────────────────────────────┤
│ 🌟 What's New                      │
│ 📝 Send Feedback                   │
├─────────────────────────────────────┤
│ 🚪 Sign Out                        │
└─────────────────────────────────────┘
```

### **User Menu Actions**

```typescript
interface UserMenuActions {
  profile: { href: "/settings/profile"; icon: "User" };
  appearance: { href: "/settings/appearance"; icon: "Palette" };
  notifications: { href: "/settings/notifications"; icon: "Bell" };
  billing: { href: "/settings/billing"; icon: "CreditCard" };
  usage: { href: "/settings/usage"; icon: "BarChart" };
  integrations: { href: "/integrations"; icon: "Zap" };
  help: { action: "open-help-center"; icon: "HelpCircle" };
  whatsNew: { action: "open-changelog"; icon: "Sparkles" };
  feedback: { action: "open-feedback-form"; icon: "MessageSquare" };
  signOut: { action: "logout-with-confirmation"; icon: "LogOut" };
}
```

## 📱 **Mobile Navigation**

### **Mobile Menu Drawer**

```
┌─────────────────────────────────────┐
│ [×] Wellness Hub                    │
├─────────────────────────────────────┤
│ 📊 Dashboard                        │
│ 👥 Contacts                    [3]  │ ← Badge for new items
│ ✅ Tasks                      [12]  │
│ 🔗 Integrations                     │
├─────────────────────────────────────┤
│ ⚙️ Settings                         │
│ ❓ Help & Support                   │
│ 🚪 Sign Out                         │
└─────────────────────────────────────┘
```

### **Mobile Interactions**

- **Swipe from left** to open navigation drawer
- **Tap outside** to close drawer
- **Badge indicators** for urgent items
- **Touch-friendly** 44px minimum touch targets

## 🎨 **Visual Design**

### **Header Styling**

```css
.auth-header {
  height: 64px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.nav-item {
  transition: all 200ms ease-out;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}

.nav-item:hover {
  background: rgb(239, 246, 255); /* sky-50 */
  transform: translateY(-1px);
}

.nav-item.active {
  background: rgb(236, 253, 245); /* emerald-50 */
  color: rgb(4, 120, 87); /* emerald-700 */
  border-bottom: 2px solid rgb(16, 185, 129); /* emerald-500 */
}
```

### **Animation Guidelines**

```typescript
interface HeaderAnimations {
  navigation: {
    hover: "200ms ease-out transform, background";
    active: "300ms ease-out border-bottom";
    mobile: "250ms ease-in-out transform"; // Drawer slide
  };
  dropdown: {
    enter: "200ms ease-out opacity, scale";
    exit: "150ms ease-in opacity, scale";
  };
  notifications: {
    badge: "pulse 2s infinite"; // For new notifications
    dropdown: "200ms ease-out transform";
  };
}
```

## 🔌 **Integration Points**

### **State Management**

```typescript
interface HeaderState {
  currentPage: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    plan: "free" | "pro" | "enterprise";
  };
  notifications: Notification[];
  badges: {
    contacts: number;
    tasks: number;
    approvals: number;
  };
  chatSidebarOpen: boolean;
  contextSidebarOpen: boolean;
}
```

### **Event Handling**

```typescript
interface HeaderEvents {
  navigation: (page: string) => void;
  search: (query: string) => SearchResults;
  toggleChatSidebar: () => void;
  markNotificationRead: (id: string) => void;
  logout: () => Promise<void>;
  openUserSettings: () => void;
}
```

## 🔒 **Security Considerations**

### **Authentication State**

- **JWT token validation** on every page load
- **Auto-logout** on token expiration
- **Secure logout** clears all local storage
- **Session timeout** warnings before expiration

### **Authorization Checks**

```typescript
interface AuthorizationRules {
  navigation: {
    contacts: "authenticated";
    tasks: "authenticated";
    integrations: "authenticated + plan.pro";
    settings: "authenticated";
  };
  features: {
    aiAssistant: "authenticated + plan.pro";
    advancedAnalytics: "authenticated + plan.enterprise";
  };
}
```

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] Navigation highlights active page correctly
- [ ] Search modal opens/closes with keyboard shortcut
- [ ] Notifications display real-time updates
- [ ] Mobile drawer slides smoothly
- [ ] User menu actions execute correctly
- [ ] Badges update automatically
- [ ] Chat sidebar toggle works from header

### **Performance Requirements**

- [ ] Header renders within 100ms
- [ ] Search results appear within 300ms
- [ ] Dropdown animations are smooth (60fps)
- [ ] Mobile menu responds immediately to touch
- [ ] No layout shift during loading
- [ ] Notification polling doesn't impact performance

### **UX Requirements**

- [ ] Navigation is intuitive and discoverable
- [ ] Search provides helpful results
- [ ] Notifications are timely and relevant
- [ ] Mobile experience matches desktop functionality
- [ ] Visual feedback for all interactions
- [ ] Accessible via keyboard and screen readers

### **Visual Requirements**

- [ ] Matches wellness brand aesthetic
- [ ] Uses design system colors consistently
- [ ] Glassmorphism effects are subtle and professional
- [ ] Typography hierarchy is clear
- [ ] Icons are recognizable and meaningful
- [ ] Responsive design works on all screen sizes

**The Auth Header becomes the reliable, always-accessible command center that connects every part of the wellness platform experience.** ⚡
