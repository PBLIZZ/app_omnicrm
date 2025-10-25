# Tags Integration Guide

## Overview

This guide explains how to integrate the tags system into your components across Tasks, Goals, Notes, and Contacts modules.

## ✅ Current Status

- **Tasks**: ✅ Fully implemented in `TaskCard.tsx`
- **Goals**: ❌ Not implemented (mock UI only)
- **Notes**: ❌ Not implemented
- **Contacts**: ❌ Not implemented

## Architecture

The tags system consists of three main components:

### 1. TagManager Component (`src/components/TagManager.tsx`)

**Purpose**: High-level component that handles tag display and management for any entity type.

**Props**:
```typescript
interface TagManagerProps {
  tags: Tag[];                    // Current tags on the entity
  entityType: "task" | "note" | "goal" | "contact";
  entityId: string;               // ID of the entity
  maxVisible?: number;            // Max tags to show (default: 3)
  showModal: boolean;             // Control modal visibility
  onModalChange: (open: boolean) => void;
}
```

**Features**:
- Displays up to N tags (default: 3)
- Shows "+X more" for hidden tags
- Opens TagSelector modal on click
- Automatically handles tag persistence via `useTags` hook
- Supports tag creation inline

### 2. TagSelector Component (`src/components/TagSelector.tsx`)

**Purpose**: Modal dialog for selecting and creating tags.

**Features**:
- Search/filter tags
- Display suggested tags
- Show selected tags with remove buttons
- Create new tags inline
- Keyboard navigation (Enter to create)

### 3. useTags Hook (`src/hooks/use-tags.ts`)

**Purpose**: Provides all tag-related operations with automatic CSRF handling.

**Available Methods**:
```typescript
const {
  tags,                          // All available tags
  isLoading,                     // Loading state
  error,                         // Error state
  createTag,                     // Create new tag
  updateTag,                     // Update tag properties
  deleteTag,                     // Delete tag
  applyTagsToTask,               // Apply tags to task
  applyTagsToNote,               // Apply tags to note
  applyTagsToGoal,               // Apply tags to goal
  applyTagsToContact,            // Apply tags to contact
  removeTagFromTask,             // Remove tag from task
} = useTags();
```

## Implementation Guide

### Step 1: Import Dependencies

```typescript
import { useState } from "react";
import { TagManager } from "@/components/TagManager";
import { Tag } from "lucide-react"; // Icon for tag button
```

### Step 2: Add State for Modal Control

```typescript
const [showTagSelector, setShowTagSelector] = useState(false);
```

### Step 3: Ensure Your Entity Has Tags

Your entity type should include tags. Check the repository/service layer returns tags.

**Example for Tasks** (already implemented):
```typescript
// packages/repo/src/types/productivity.types.ts
export interface TaskListItem {
  id: string;
  name: string;
  // ... other fields
  tags: Array<{
    id: string;
    name: string;
    color: string;
    category?: string;
  }>;
}
```

### Step 4: Add TagManager to Your Component

```tsx
<TagManager
  tags={entity.tags || []}
  entityType="task"  // or "note", "goal", "contact"
  entityId={entity.id}
  maxVisible={3}
  showModal={showTagSelector}
  onModalChange={setShowTagSelector}
/>
```

### Step 5: Add UI Trigger (Optional)

If you want a button to open the tag selector:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowTagSelector(true)}
>
  <Tag className="w-4 h-4 mr-2" />
  Tags
</Button>
```

## Module-Specific Implementation Examples

### Notes Module

**File**: `src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteDetailView.tsx`

```tsx
// 1. Import TagManager
import { TagManager } from "@/components/TagManager";
import { useState } from "react";

// 2. Inside your component
export function NoteDetailView({ note }: { note: Note }) {
  const [showTagSelector, setShowTagSelector] = useState(false);

  return (
    <div>
      {/* Existing note content */}

      {/* Add tags section */}
      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Tags</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagSelector(true)}
          >
            <Tag className="w-4 h-4" />
          </Button>
        </div>

        <TagManager
          tags={note.tags || []}
          entityType="note"
          entityId={note.id}
          showModal={showTagSelector}
          onModalChange={setShowTagSelector}
        />
      </div>
    </div>
  );
}
```

### Contacts Module

**File**: `src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx`

```tsx
// 1. Import TagManager
import { TagManager } from "@/components/TagManager";
import { useState } from "react";
import { Tag } from "lucide-react";

// 2. Inside your component
export function ContactDetailsCard({ contact }: { contact: Contact }) {
  const [showTagSelector, setShowTagSelector] = useState(false);

  return (
    <div className="space-y-4">
      {/* Existing contact details */}

      {/* Tags section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Tags</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagSelector(true)}
          >
            <Tag className="w-4 h-4" />
          </Button>
        </div>

        <TagManager
          tags={contact.tags || []}
          entityType="contact"
          entityId={contact.id}
          maxVisible={5}  // Show more tags for contacts
          showModal={showTagSelector}
          onModalChange={setShowTagSelector}
        />
      </div>
    </div>
  );
}
```

### Goals Module

Goals currently use mock data. You'll need to:

1. **Create the backend API** (`src/app/api/goals/route.ts`)
2. **Create the service layer** (`src/server/services/goals.service.ts`)
3. **Update the repository** (already exists: `packages/repo/src/goals.repo.ts`)
4. **Create the frontend hook** (`src/hooks/use-goals.ts`)
5. **Add TagManager** to goal components

**Example for when goals are implemented**:
```tsx
<TagManager
  tags={goal.tags || []}
  entityType="goal"
  entityId={goal.id}
  showModal={showTagSelector}
  onModalChange={setShowTagSelector}
/>
```

## Backend Requirements

### Database Schema

The database already has junction tables for all entity types:

- `task_tags` - Links tasks to tags
- `note_tags` - Links notes to tags
- `goal_tags` - Links goals to tags
- `contact_tags` - Links contacts to tags

See `src/server/db/schema.ts` for complete schema definitions.

### Repository Layer

The tag relationships are already defined in the schema. You need to ensure your repository methods include tag joins:

**Example from Tasks** (`packages/repo/src/productivity.repo.ts`):

```typescript
// Include tags in your query
const tasksWithTags = await db
  .select({
    // ... task fields
    tags: sql<TaskTag[]>`
      COALESCE(
        json_agg(
          json_build_object(
            'id', tags.id,
            'name', tags.name,
            'color', tags.color,
            'category', tags.category
          )
        ) FILTER (WHERE tags.id IS NOT NULL),
        '[]'
      )
    `,
  })
  .from(tasks)
  .leftJoin(taskTags, eq(tasks.id, taskTags.taskId))
  .leftJoin(tags, eq(taskTags.tagId, tags.id))
  .where(eq(tasks.userId, userId))
  .groupBy(tasks.id);
```

### API Layer

The tag API routes are already implemented:

- `POST /api/tags` - Create tag
- `PATCH /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `POST /api/tags/apply` - Apply tags to entity
- `POST /api/tags/remove` - Remove tag from entity

These routes handle all entity types via the `entityType` parameter.

## Tag Categories

Tags are organized into 6 wellness-themed categories (see `src/lib/tag-categories.ts`):

1. **Services & Modalities** - Violet theme (Crown Chakra)
2. **Schedule & Attendance** - Sky theme (Throat Chakra)
3. **Health & Wellness Goals** - Teal theme (Heart Chakra)
4. **Client Demographics** - Yellow theme (Solar Plexus Chakra)
5. **Marketing & Engagement** - Orange theme (Sacral Chakra)
6. **Emotional & Mental Focus** - Rose theme (Root Chakra)

Each category has:
- Fixed border color
- Fixed text color
- Customizable background color (via settings)

## Color Palette

10 preset colors available for tag backgrounds:
- Violet Mist (#f5f3ff)
- Sky Light (#f0f9ff)
- Teal Breeze (#f0fdfa)
- Sunlit Yellow (#fefce8)
- Warm Orange (#ffedd5)
- Rose Petal (#fff1f2)
- Emerald Glow (#ecfdf5)
- Soft Slate (#f8fafc)
- Pink Blush (#fdf2f8)
- Indigo Dream (#eef2ff)

## Best Practices

### 1. Always Handle Empty Tags

```tsx
<TagManager
  tags={entity.tags || []}  // Fallback to empty array
  // ... other props
/>
```

### 2. Control Modal State Properly

```tsx
const [showTagSelector, setShowTagSelector] = useState(false);

// Pass both the state and setter
showModal={showTagSelector}
onModalChange={setShowTagSelector}
```

### 3. Provide Appropriate maxVisible

- **Tasks**: 3 tags (compact cards)
- **Notes**: 3-4 tags (inline display)
- **Contacts**: 5+ tags (more space)
- **Goals**: 3-4 tags (depends on UI)

### 4. Position Tags Thoughtfully

**Good Placement**:
- Below main content
- Above action buttons
- In metadata sections

**Bad Placement**:
- Blocking primary content
- In cramped spaces
- Above critical information

### 5. Provide Visual Triggers

Add a button or icon that indicates tags are clickable:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowTagSelector(true)}
  className="text-gray-500 hover:text-gray-700"
>
  <Tag className="w-4 h-4 mr-1" />
  {tags.length > 0 ? `${tags.length} tags` : 'Add tags'}
</Button>
```

## Testing

### Unit Testing TagManager

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { TagManager } from "@/components/TagManager";
import { useTags } from "@/hooks/use-tags";

jest.mock("@/hooks/use-tags");

test("displays tags and opens modal on click", () => {
  const mockTags = [
    { id: "1", name: "Yoga", color: "#f5f3ff" },
    { id: "2", name: "Meditation", color: "#f0fdfa" },
  ];

  (useTags as jest.Mock).mockReturnValue({
    tags: [],
    applyTagsToTask: jest.fn(),
  });

  const onModalChange = jest.fn();

  render(
    <TagManager
      tags={mockTags}
      entityType="task"
      entityId="task-1"
      showModal={false}
      onModalChange={onModalChange}
    />
  );

  // Check tags are displayed
  expect(screen.getByText("Yoga")).toBeInTheDocument();
  expect(screen.getByText("Meditation")).toBeInTheDocument();

  // Click tag to open modal
  fireEvent.click(screen.getByText("Yoga"));
  expect(onModalChange).toHaveBeenCalledWith(true);
});
```

## Troubleshooting

### Tags Not Saving

**Problem**: Tags appear in UI but don't persist after refresh.

**Solution**: Ensure your repository includes tags in the SELECT query and uses proper LEFT JOINs.

### CSRF Errors

**Problem**: Getting `missing_csrf` errors when creating tags.

**Solution**: The `useTags` hook automatically handles CSRF. Ensure you're using the hook methods, not raw fetch calls.

### Tags Not Displaying

**Problem**: TagManager renders but tags don't appear.

**Solution**:
1. Check entity includes `tags` array in data structure
2. Verify repository includes tag joins
3. Ensure tag data matches the `Tag` interface

### Modal Won't Open

**Problem**: Clicking tags doesn't open the selector modal.

**Solution**:
1. Verify `showModal` state is defined
2. Check `onModalChange` is correctly wired to `setShowTagSelector`
3. Ensure Dialog component is not blocked by z-index issues

## Migration Checklist

Use this checklist when adding tags to a new module:

- [ ] Repository includes tag joins in SELECT queries
- [ ] Entity type includes `tags` array in TypeScript interface
- [ ] Service layer returns tags with entity data
- [ ] Component imports `TagManager` and `useState`
- [ ] Modal state (`showTagSelector`) is defined
- [ ] TagManager component is added to JSX
- [ ] Optional: Tag button/trigger is added to UI
- [ ] Tags display correctly with proper styling
- [ ] Tags can be added/removed via modal
- [ ] Changes persist after page refresh
- [ ] No CSRF errors in console
- [ ] Tests updated to handle tags

## Related Documentation

- [TAGS_SYSTEM.md](./TAGS_SYSTEM.md) - Complete tags system documentation
- [Tag Categories](../../src/lib/tag-categories.ts) - Tag category definitions
- [Database Schema](../../src/server/db/schema.ts) - Tag table definitions

## Support

If you encounter issues implementing tags:

1. Check this guide first
2. Review the TaskCard.tsx implementation (working reference)
3. Verify database schema includes proper junction tables
4. Test with the TagSelector in Settings to ensure backend is working
5. Check browser console for errors
