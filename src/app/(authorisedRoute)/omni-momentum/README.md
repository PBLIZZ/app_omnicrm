# OmniMomentum - AI-Powered Productivity Suite

**Status**: ✅ Core Implementation Complete
**Architecture**: Server + Client Component Separation
**Compliance**: Technical Debt Elimination Standards (Phase 1-16)

---

## Overview

OmniMomentum is the AI-powered productivity suite designed specifically for wellness practitioners. It provides an intelligent "dump everything" inbox where users can capture thoughts, tasks, and ideas, which are then automatically categorized into 6 life-business zones using AI.

### Key Features

- **AI-Powered Inbox**: "Dump everything" interface with intelligent categorization
- **Today's Focus**: Research-driven approach showing max 3 priorities to avoid overwhelm
- **Daily Pulse**: Wellness check-in with energy ratings, sleep tracking, and mood assessment
- **Wellness Zones**: 6 core life-business areas for holistic practice management
- **Progressive Disclosure**: Only shows what matters now, preventing cognitive overload

---

## Architecture

### Server Component Architecture (Phase 1-4)

Following the Technical Debt Elimination guidelines, OmniMomentum implements clean server/client component separation:

```
omni-momentum/
├── page.tsx                    # Server component - auth & metadata
├── _components/
│   ├── MomentumPageLayout.tsx  # Static layout shell (server-rendered)
│   ├── DailyPulseWidget.tsx    # Wellness check-in (client)
│   ├── OmniMomentumPage.tsx    # Main dashboard (client)
│   ├── TodaysFocusSection.tsx  # Focus management (client)
│   └── MomentumSidebar.tsx     # Navigation (client)
```

### Technical Compliance

#### ✅ DTO/Repository Pattern (Phases 5-8)
```typescript
// Uses validated DTOs from @omnicrm/contracts
import type { CreateInboxItemDTO, InboxItemDTO } from "@omnicrm/contracts";

// Hooks encapsulate repository pattern
const { quickCapture } = useInbox(); // Internally uses repository layer
```

#### ✅ TypeScript Strict Compliance (Phases 15-16)
- **Explicit return types** on all functions
- **No any types** - zero tolerance policy enforced
- **Runtime validation** via Zod schemas in DTOs
- **Proper error handling** without type assertions

#### ✅ ESLint Zero-Tolerance (Phase 15-16)
- No unused imports or variables
- No floating promises (proper void handling)
- Consistent component patterns
- Architectural boundary enforcement

---

## Research-Driven Design

### Wellness Practitioner Research Findings

Based on `docs/roadmap/implementation/RhythmModuleResearch.md`:

#### 1. **78% Prefer Simple Lists**
```typescript
// ✅ Implementation: Today's Focus limits to 3 items max
const focusItems = items
  .filter(item => item.status === "unprocessed")
  .slice(0, 3); // Hard limit per research findings
```

#### 2. **"Dump Everything" AI Inbox**
- **Top requested feature** among wellness practitioners
- Invisible AI processing (no overwhelming tech terminology)
- Quick capture between client sessions

#### 3. **Wellness Terminology**
- **"Focus"** instead of "Tasks"
- **"Pathways"** instead of "Projects"
- **"Journey"** instead of "Goals"
- **"Pulse"** instead of "Analytics"

#### 4. **Mobile-First Design**
- Large touch targets (44x44 pixels minimum)
- Quick capture accessible with minimal taps
- Fast loading of priority information

---

## Component Architecture

### Core Components

#### 1. **QuickCaptureInput**
```typescript
// AI-powered "dump everything" interface
function QuickCaptureInput(): JSX.Element {
  // ✅ Proper DTO validation
  const data: CreateInboxItemDTO = {
    rawText: rawText.trim(),
  };

  // ✅ No floating promises
  void quickCapture(data);
}
```

**Features:**
- Prominent placement for rapid thought capture
- ⌘+Enter keyboard shortcut for speed
- Voice integration placeholder (future enhancement)
- Wellness-appropriate messaging and feedback

#### 2. **TodaysFocusSection**
```typescript
// Research-driven: Max 3 priorities to avoid overwhelm
export function TodaysFocusSection(): JSX.Element {
  const focusItems = items
    .filter(item => item.status === "unprocessed")
    .slice(0, 3); // Hard research-based limit
}
```

**Features:**
- Maximum 3 priorities shown at once
- Simple list view (not Kanban boards)
- Progressive disclosure interface
- Process button for AI categorization

#### 3. **DailyPulseWidget**
```typescript
// Wellness check-in based on practitioner patterns
interface DailyPulseData {
  energyLevel: number; // 1-5 stars
  sleepHours: number;  // 3-7+ hours
  napMinutes: number;  // 0-60 minutes
  mood: string;        // Emoji-based selection
}
```

**Features:**
- 1-5 star energy rating (intuitive for practitioners)
- 3-7+ hour sleep slider (real practitioner patterns)
- Mood emoji selection with wellness language
- Quick morning input designed for friction-free use

#### 4. **MomentumSidebar**
```typescript
// Wellness-focused navigation with live stats
export function MomentumSidebar(): JSX.Element {
  const { data: stats } = useInboxStats();

  // Shows unprocessed count badge for motivation
  return (
    <SidebarContent>
      {/* Wellness terminology throughout */}
    </SidebarContent>
  );
}
```

**Navigation Structure:**
- **Your Momentum**: Focus Dashboard, Today's Focus, Quick Capture
- **Life + Business Zones**: Pathways, Journey, Tasks & Actions
- **Wellness Intelligence**: Daily Pulse, Flow Analytics, Rhythm Sync

---

## Integration Points

### 1. **Sidebar Navigation Integration**
```typescript
// AppSidebarController.tsx routing
if (pathname.startsWith("/omni-momentum")) {
  return <MomentumSidebar />;
}
```

### 2. **Backend API Integration**
```typescript
// Hooks use repository pattern internally
const { quickCapture, processItem } = useInbox({
  filters: { status: ["unprocessed"] }
});

// ✅ All API calls go through repository layer
// ✅ Runtime validation via DTO schemas
// ✅ Proper error handling and optimistic updates
```

### 3. **State Management**
- **React Query** for server state with optimistic updates
- **Factory patterns** for test data (packages/testing)
- **Clean error boundaries** with user-friendly messaging

---

## Wellness Zones (6 Core Areas)

Based on wellness practitioner business patterns:

1. **Personal Wellness** - Self-care, personal health goals
2. **Self Care** - Mindfulness, energy management, boundaries
3. **Admin & Finances** - Business operations, invoicing, taxes
4. **Business Development** - Growth, partnerships, strategy
5. **Social Media & Marketing** - Content creation, campaigns, engagement
6. **Client Care** - Client sessions, follow-ups, program delivery

### AI Categorization
```typescript
// Future implementation: AI automatically routes captured items
// into appropriate wellness zones based on content analysis
const aiSuggestion = await processItem({
  id: itemId,
  userContext: {
    currentEnergy: dailyPulse.energyLevel,
    availableTime: schedule.freeMinutes,
  }
});
```

---

## Development Guidelines

### Adding New Components

1. **Follow Server/Client Separation**
```typescript
// Server components: page.tsx, static layouts
export default async function Page() {
  await getServerUserId(); // Auth check
  return <MomentumPageLayout />;
}

// Client components: interactive elements
"use client";
export function InteractiveComponent(): JSX.Element {
  // React hooks and state management
}
```

2. **Use DTO Contracts**
```typescript
// ✅ Always import from @omnicrm/contracts
import type { CreateInboxItemDTO } from "@omnicrm/contracts";

// ✅ Runtime validation happens automatically
const validatedData = CreateInboxItemDTO.parse(formData);
```

3. **Follow ESLint Rules**
```typescript
// ✅ Explicit return types required
function handleAction(): Promise<void> {
  // ✅ No floating promises
  void asyncOperation();
}

// ✅ No any types allowed
function processData(data: unknown): ProcessedData {
  // Use type guards instead of assertions
  if (isValidData(data)) {
    return data.processed;
  }
  throw new Error("Invalid data");
}
```

### Testing Patterns

```typescript
// ✅ Use factory patterns from packages/testing
import { InboxItemFactory } from "@omnicrm/testing";

const mockItem = InboxItemFactory.build({
  status: "unprocessed",
  rawText: "Test wellness task"
});

// ✅ Mock repositories, not database calls
const mockInboxRepo = mockDeep<InboxRepository>();
```

---

## Future Enhancements

### Phase 2 Features (Planned)
- **Voice Integration**: Voice-to-text capture for mobile use
- **AI Zone Routing**: Automatic categorization into wellness zones
- **Calendar Integration**: Sync with omni-rhythm for time-aware suggestions
- **Energy-Based Prioritization**: Tasks suggested based on daily pulse data

### Phase 3 Features (Research)
- **Wellness Analytics**: Flow state tracking and insights
- **Client Integration**: Connect tasks to specific client needs
- **Template Pathways**: Pre-built workflows for common wellness business tasks
- **Team Collaboration**: Multi-practitioner wellness business support

---

## Troubleshooting

### Common Issues

#### 1. **TypeScript Errors**
```bash
# Check for direct database imports (should use repository pattern)
grep -r "from.*@/server/db\"" src/ --exclude="*.test.*"

# Verify DTO usage
pnpm typecheck
```

#### 2. **ESLint Violations**
```bash
# Auto-fix simple issues
pnpm lint --fix

# Check architectural compliance
pnpm lint:architecture
```

#### 3. **Component Not Loading**
```bash
# Verify server/client component separation
# Server components: No hooks, no browser APIs
# Client components: "use client" directive required
```

### Performance Monitoring

```bash
# Component compilation time
pnpm typecheck --timing

# Bundle size analysis
pnpm build && npx @next/bundle-analyzer

# Test suite performance
pnpm test --reporter=verbose
```

---

## Documentation References

- **Product Requirements**: `docs/roadmap/Product Requirements Document_ Wellness Task Management App.md`
- **Research Findings**: `docs/roadmap/implementation/RhythmModuleResearch.md`
- **Technical Standards**: `docs/TECHNICAL_DEBT_ELIMINATION.md`
- **Implementation Guide**: `docs/omni-momentum-implementation-guide.md`
- **Architecture Patterns**: `eslint.config.mjs` (enforcement rules)

---

**Last Updated**: September 20, 2025
**Maintainer**: OmniCRM Development Team
**Status**: Core implementation complete, ready for Phase 2 enhancements