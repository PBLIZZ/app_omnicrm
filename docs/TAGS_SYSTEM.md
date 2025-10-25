# Tags System - Architecture Documentation

## Overview

The Tags System is a flexible, category-based labeling system that allows users to organize and filter Tasks, Contacts, Notes, and Goals. The system follows a **database-first approach** with maximum user flexibility, allowing users to create, edit, merge, and delete any tags they choose.

## Philosophy

### Maximum Flexibility

- **Users control their tags**: Users can edit or delete ANY tag, including starter tags
- **No hard-coded restrictions**: The system provides starter tags but doesn't enforce them
- **Merge capability**: Users can consolidate duplicate tags (e.g., "Weekday AM" + "Weekday PM" → "Weekdays")
- **Business-specific customization**: Users can remove irrelevant tags (e.g., a gym coach deleting "Yoga" and "Reiki" tags)

### Starter Tags System

- **Global tags** (`userId = null`): Pre-populated tags available to all new users
- **Onboarding choice**: Users can either:
  - **Accept**: Claim all starter tags (updates `userId` from `null` to user's ID)
  - **Reject**: Delete all starter tags and start fresh
- **Post-onboarding**: Tags become user-owned and fully customizable

## Architecture Layers

### 1. Database Schema (`src/server/db/schema.ts`)

#### Tags Table

```typescript
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),  // Nullable for global starter tags
  name: text("name").notNull(),
  category: tagCategoryEnum("category").notNull(),
  color: text("color").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Junction Tables (Many-to-Many)

- `contact_tags`: Links tags to contacts
- `task_tags`: Links tags to tasks
- `note_tags`: Links tags to notes
- `goal_tags`: Links tags to goals

Each junction table has:

- `id`: UUID primary key
- `<entity>_id`: Foreign key to entity
- `tag_id`: Foreign key to tag
- `created_at`: Timestamp
- Optional: `created_by` (for contact_tags only)

### 2. Repository Layer (`packages/repo/src/tags.repo.ts`)

**Pattern**: Constructor injection with `DbClient`, pure database operations

#### Key Methods

**Tag CRUD:**

- `listTags(userId, params)`: Returns tags for user + global tags (`userId = null`)
- `getTagById(userId, tagId)`: Get single tag
- `getTagByName(userId, name)`: Find tag by name (case-insensitive)
- `createTag(data)`: Create new tag
- `updateTag(userId, tagId, updates)`: Update user or global tag
- `deleteTag(userId, tagId)`: Delete user or global tag

**Tag Application:**

- `applyTagsToContact/Task/Note/Goal()`: Apply tags to entities
- `removeTagsFromContact/Task/Note/Goal()`: Remove tags from entities
- `getContactTags/TaskTags/NoteTags/GoalTags()`: Get tags for entity

#### User & Global Tag Access Pattern

```typescript
// All queries allow access to both user tags AND global tags
const conditions = [sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`];
```

### 3. Service Layer (`src/server/services/tags.service.ts`)

**Pattern**: Functional services, acquires `DbClient` via `getDb()`, wraps errors as `AppError`

#### Key Services

**Tag Management:**

- `listTagsService()`: List with pagination, search, and filtering
- `createTagService()`: Create tag with duplicate name check
- `updateTagService()`: Update tag with name conflict validation
- `deleteTagService()`: Delete tag (no restrictions)
- `countTagsService()`: Count tags with filters

**Tag Application:**

- `applyTagsService()`: Apply tags to any entity type
- `removeTagsService()`: Remove tags from any entity type
- `getEntityTagsService()`: Get tags for specific entity

**Onboarding:**

- `claimStarterTagsService()`: Update all global tags to user's ownership
- `rejectStarterTagsService()`: Delete all global tags

**Analytics:**

- `getTagUsageStatsService()`: Get tag usage statistics

### 4. Business Schemas (`src/server/db/business-schemas/tags.ts`)

**Pattern**: Pure Zod validation schemas for API requests/responses

#### Request Schemas

- `CreateTagBodySchema`: Name, category, color (no userId - added by service)
- `UpdateTagBodySchema`: Partial updates for name, category, color
- `GetTagsQuerySchema`: Pagination + filters (search, category, sort, order)
- `ApplyTagsBodySchema`: Entity type, entity ID, tag IDs array
- `RemoveTagsBodySchema`: Entity type, entity ID, tag IDs array

#### Response Schemas

- `TagResponseSchema`: `{ item: Tag }`
- `TagListResponseSchema`: `{ items: Tag[], pagination: {...} }`
- `TagUsageStatsResponseSchema`: `{ stats: TagUsageStats[] }`

### 5. API Routes (`src/app/api/tags/`)

**Pattern**: Use `handleAuth()` or `handleGetWithQueryAuth()` from `@/lib/api`

#### Endpoints

**`/api/tags`**

- `GET`: List tags with pagination/filtering
- `POST`: Create new tag

**`/api/tags/[tagId]`**

- `PATCH`: Update tag
- `DELETE`: Delete tag

**`/api/tags/apply`**

- `POST`: Apply tags to entities

**`/api/tags/remove`**

- `DELETE`: Remove tags from entities

**`/api/tags/bulk-delete`**

- `DELETE`: Bulk delete multiple tags

**`/api/tags/stats`**

- `GET`: Get tag usage statistics

### 6. React Hooks (`src/hooks/use-tags.ts`)

**Pattern**: TanStack React Query for data fetching and mutations

```typescript
export function useTags(params?: TagQueryParams) {
  // Query: Fetch tags
  const { data, isLoading, error } = useQuery({
    queryKey: ["tags", params],
    queryFn: () => fetchTagsClient(params),
  });

  // Mutations: Create, update, delete
  const createTagMutation = useMutation({
    mutationFn: createTagClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  return {
    tags: data?.items ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    createTag: createTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
  };
}
```

### 7. UI Components

#### Tag Settings Page (`src/app/(authorisedRoute)/settings/tags/page.tsx`)

**Pattern**: Pure database-driven UI, no client-side tag generation

Features:

- View tags grouped by category
- Create new tags
- Edit tag name/color/category
- Delete any tag
- Batch category color updates

#### TagManager (`src/components/TagManager.tsx`)

Badge display + modal for applying tags to entities

#### TagSelector (`src/components/TagSelector.tsx`)

Modal interface for selecting and creating tags

## Tag Categories

### 6 Wellness Categories

```typescript
export type TagCategory =
  | "services_modalities"      // Yoga, Massage, Therapy, etc.
  | "client_demographics"      // Senior, Young Adult, Professional, etc.
  | "schedule_attendance"      // Regular, Weekend Warrior, Early Bird, etc.
  | "health_wellness"          // Stress Relief, Weight Loss, Pain Management, etc.
  | "marketing_engagement"     // Instagram, Newsletter, Testimonial, etc.
  | "emotional_mental";        // Anxiety, Depression, Joy, Gratitude, etc.
```

### Category Colors (Tailwind Palette)

```typescript
export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  services_modalities: "#f5f3ff",    // Violet 50
  schedule_attendance: "#f0f9ff",    // Sky 50
  health_wellness: "#f0fdfa",        // Teal 50
  client_demographics: "#fefce8",    // Yellow 50
  marketing_engagement: "#fff7ed",   // Orange 50
  emotional_mental: "#fff1f2",       // Rose 50
};
```

## Data Flow Examples

### Creating a Tag

```typescript
// 1. UI: User creates tag
const newTag = await createTag({
  name: "Hot Yoga",
  category: "services_modalities",
  color: "#a78bfa"
});

// 2. API Route: /api/tags POST
export const POST = handleAuth(
  CreateTagBodySchema,
  TagResponseSchema,
  async (data, userId) => {
    return { item: await createTagService(userId, data) };
  }
);

// 3. Service: Validate + create
export async function createTagService(userId, input) {
  const db = await getDb();
  const repo = createTagsRepository(db);

  // Check duplicate
  const existing = await repo.getTagByName(userId, input.name);
  if (existing) throw new AppError("Tag exists", "TAG_NAME_EXISTS", ...);

  // Create
  return await repo.createTag({ ...input, userId, isSystem: false });
}

// 4. Repository: Insert
async createTag(data) {
  const [tag] = await this.db.insert(tags).values(data).returning();
  if (!tag) throw new Error("Insert returned no data");
  return tag;
}
```

### Applying Tags to a Contact

```typescript
// 1. UI: User selects tags in TagManager
await applyTags(contactId, ["tag-id-1", "tag-id-2"]);

// 2. API: /api/tags/apply POST
export const POST = handleAuth(
  ApplyTagsBodySchema,
  ApplyTagsResponseSchema,
  async (data, userId) => {
    return await applyTagsService(userId, data);
  }
);

// 3. Service: Route to correct repository method
export async function applyTagsService(userId, input) {
  const repo = createTagsRepository(await getDb());

  switch (input.entityType) {
    case "contact":
      await repo.applyTagsToContact(userId, input.entityId, input.tagIds, userId);
      return { applied: input.tagIds.length };
    // ... other entity types
  }
}

// 4. Repository: Insert junction records
async applyTagsToContact(userId, contactId, tagIds, createdBy) {
  // Verify tags belong to user
  const userTags = await this.getTagsByIds(userId, tagIds);
  if (userTags.length !== tagIds.length) throw new Error("Tags not found");

  // Insert junctions
  const contactTagData = tagIds.map(tagId => ({ contactId, tagId, createdBy }));
  return await this.db.insert(contactTags).values(contactTagData).returning();
}
```

## Onboarding Flow

### Initial State

- Database has ~70 starter tags with `userId = null`
- Tags are visible to all users but owned by nobody

### User Onboarding Choice

**Option A: Accept Starter Tags**

```typescript
await claimStarterTagsService(newUserId);
// SQL: UPDATE tags SET user_id = 'newUserId' WHERE user_id IS NULL
```

**Option B: Reject Starter Tags**

```typescript
await rejectStarterTagsService();
// SQL: DELETE FROM tags WHERE user_id IS NULL
```

### Post-Onboarding

- User has full control over their tags
- Can create, edit, delete, or merge as needed
- System provides no restrictions

## Migrations

### Key Migrations

**`54_tags_system_migration.sql`**

- Initial tags table and junction tables
- Tag category enum
- Indexes for performance

**`62_system_wellness_tags.sql`**

- Populate starter tags with `userId = NULL`
- 70 tags across 6 categories

**`63_fix_tag_colors_and_add_marketing_tags.sql`**

- Fix category colors to match constants
- Add missing marketing_engagement tags

## Testing Strategy

### Unit Tests

- Repository: Test all CRUD operations and junction table operations
- Service: Test business logic, error handling, duplicate detection
- Business Schemas: Test Zod validation

### Integration Tests

- API Routes: Test complete request/response flow
- Tag application: Test applying/removing tags from entities
- Onboarding: Test claim/reject starter tags

### E2E Tests

- Tag creation workflow
- Tag application to contacts
- Category color batch updates

## Performance Considerations

### Indexes

```sql
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON contact_tags(tag_id);
-- Similar indexes for task_tags, note_tags, goal_tags
```

### Query Optimization

- Use `sql` template for complex conditions (user OR global tags)
- Paginate list queries
- Batch tag application operations

## Security

### Authorization

- All tag operations require authentication (`handleAuth`)
- Users can only access their own tags + global tags
- Tag application validates entity ownership

### Data Validation

- Zod schemas validate all inputs
- Name uniqueness check (case-insensitive)
- Tag ID validation before application

## Common Patterns

### Get Tags for User (Including Global)

```typescript
const conditions = [sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`];
const results = await db.select().from(tags).where(and(...conditions));
```

### Batch Category Color Update

```typescript
const tagsInCategory = await repo.listTags(userId, { category: "services_modalities" });
await Promise.all(
  tagsInCategory.items.map(tag =>
    repo.updateTag(userId, tag.id, { color: newColor })
  )
);
```

### Tag Merge Operation (Client-Side)

```typescript
// 1. Create merged tag or select target tag
const targetTag = await createTag({ name: "Weekdays", ... });

// 2. Get all contacts with source tags
const tag1Contacts = await getContactsByTag(userId, "weekday-am-id");
const tag2Contacts = await getContactsByTag(userId, "weekday-pm-id");
const allContacts = [...new Set([...tag1Contacts, ...tag2Contacts])];

// 3. Apply target tag to all contacts
await applyTagsService(userId, {
  entityType: "contact",
  entityId: contactId, // repeat for each contact
  tagIds: [targetTag.id],
});

// 4. Delete source tags
await deleteTag("weekday-am-id");
await deleteTag("weekday-pm-id");
```

## Future Enhancements

### Potential Features

- **Tag hierarchies**: Parent/child tag relationships
- **Tag templates**: Predefined tag sets for common use cases
- **Tag statistics dashboard**: Visual analytics of tag usage
- **Bulk tag operations**: Apply/remove tags to multiple entities at once
- **Tag suggestions**: AI-powered tag recommendations based on entity content
- **Tag export/import**: Share tag sets between users

### Performance Optimizations

- **Materialized views**: Pre-computed tag counts per entity
- **Search indexing**: Full-text search on tag names
- **Caching**: Redis cache for frequently accessed tags

## Troubleshooting

### Common Issues

**Issue**: Tag not showing in list

- **Check**: User has access (user's tag OR global tag)
- **Check**: Pagination (tag might be on another page)

**Issue**: Cannot delete tag

- **Check**: Tag exists and user has access
- **Check**: No database constraints preventing deletion

**Issue**: Duplicate tag error

- **Check**: Name is unique for this user (case-insensitive)

**Issue**: Tag application fails

- **Check**: Tag IDs are valid
- **Check**: Entity exists and belongs to user
- **Check**: Entity type matches route

## Summary

The Tags System provides a **flexible, database-first approach** to organizing wellness business data. Key architectural decisions:

1. **No hard-coded tags**: All tags in database, full user control
2. **Starter tags system**: Optional pre-populated tags via onboarding
3. **Standard layered architecture**: Schema → Repo → Service → Route → Hook → UI
4. **Maximum flexibility**: Users can edit/delete any tag, merge duplicates
5. **Category-based organization**: 6 wellness categories with color coding
6. **Multi-entity support**: Tags work with Contacts, Tasks, Notes, Goals

This architecture supports the wellness practitioner use case while maintaining flexibility for any tagging needs.
