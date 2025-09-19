# DTO Architecture Guide

**Date:** 2025-09-19

**Author:** Peter James Blizzard

## Purpose & Architecture

Data Transfer Objects (DTOs) provide type-safe contracts between different layers of the application, ensuring consistent data shapes across API boundaries while maintaining independence from database schema changes.

### Key Benefits

- **API Stability**: Frontend components remain unaffected by database schema changes
- **Type Safety**: Full TypeScript compile-time checking with Zod runtime validation
- **Documentation**: Self-documenting contracts that serve as API specifications
- **Validation**: Automatic data validation and transformation at boundaries
- **Evolution**: Safe schema evolution without breaking existing consumers

### Architecture Overview

```bash
Frontend ←→ API Routes ←→ Services ←→ Repositories ←→ Database
    ↓          ↓           ↓          ↓           ↓
  DTOs ←→ DTOs ←→ DTOs ←→ DTOs ←→ Raw Schema
```

DTOs act as contracts at each boundary:

- **Frontend**: Receives predictable, validated data shapes
- **API**: Request/response validation and transformation
- **Services**: Business logic with type-safe inputs/outputs
- **Repositories**: Data access with validated returns

## Usage Examples

### Basic DTO Schema Structure

```typescript
// packages/contracts/src/contact.ts
import { z } from "zod";

/**
 * Contact DTO Schema
 *
 * Stable UI-focused contract for contact data.
 * Only includes fields actively used by frontend components.
 */
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.enum(["gmail_import", "manual", "upload", "calendar_import"]).nullable(),
  stage: z
    .enum([
      "Prospect",
      "New Client",
      "Core Client",
      "Referring Client",
      "VIP Client",
      "Lost Client",
      "At Risk Client",
    ])
    .nullable(),
  tags: z.array(z.string()).nullable(),
  confidenceScore: z.string().nullable(), // AI confidence as string (0.0-1.0)
  slug: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContactDTO = z.infer<typeof ContactDTOSchema>;
```

### CRUD DTO Patterns

```typescript
/**
 * Contact Creation DTO Schema
 *
 * Schema for creating new contacts - only required/optional fields for creation
 */
export const CreateContactDTOSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  source: z.enum(["gmail_import", "manual", "upload", "calendar_import"]).optional(),
  // ... other optional fields
});

export type CreateContactDTO = z.infer<typeof CreateContactDTOSchema>;

/**
 * Contact Update DTO Schema
 *
 * All fields optional for partial updates
 */
export const UpdateContactDTOSchema = CreateContactDTOSchema.partial();

export type UpdateContactDTO = z.infer<typeof UpdateContactDTOSchema>;
```

### Composite DTO Patterns

```typescript
/**
 * Contact with Notes DTO Schema
 *
 * Extended contact DTO that includes associated notes
 * Uses composition to build complex response shapes
 */
export const ContactWithNotesDTOSchema = ContactDTOSchema.extend({
  notes: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      contactId: z.string().uuid().nullable(),
      title: z.string().nullable(),
      content: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    }),
  ),
});

export type ContactWithNotesDTO = z.infer<typeof ContactWithNotesDTOSchema>;
```

### Business Domain Enums

```typescript
// AI Insights DTOs with strict business enums
export const AIInsightKindSchema = z.enum([
  "summary",
  "next_step",
  "risk_assessment",
  "persona_analysis",
  "engagement_score",
  "wellness_recommendation",
]);

export const AIInsightSubjectTypeSchema = z.enum(["contact", "interaction", "segment", "timeline"]);

export const AIInsightDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subjectType: AIInsightSubjectTypeSchema,
  subjectId: z.string().uuid().nullable(),
  kind: AIInsightKindSchema,
  content: z.object({
    title: z.string(),
    summary: z.string(),
    confidence: z.number().min(0).max(1),
    tags: z.array(z.string()),
    priority: z.enum(["low", "medium", "high", "critical"]),
    actionable: z.boolean(),
  }),
  model: z.string().nullable(),
  createdAt: z.coerce.date(),
  fingerprint: z.string().nullable(),
});
```

## Best Practices

### Do's and Don'ts

**✅ DO:**

- Use Zod schemas for all DTOs with strict validation
- Keep DTOs focused on UI/API needs, not database structure
- Use `.nullable()` for optional fields that can be null
- Use `.optional()` for fields that may not be present
- Include comprehensive JSDoc comments explaining purpose
- Use meaningful enum values that match business language
- Use `z.coerce.date()` for date fields to handle string/Date conversion
- Create separate DTOs for create/update/response scenarios

**❌ DON'T:**

- Mirror database schema exactly in DTOs
- Use `any` or overly broad types
- Mix validation logic in DTOs (keep them pure)
- Create DTOs for every possible field combination
- Use database-specific types (use business types instead)
- Expose internal IDs or sensitive fields unnecessarily

### Zod Schema Patterns

```typescript
// ✅ Proper field validation
export const UserPreferencesSchema = z.object({
  // Required fields with validation
  userId: z.string().uuid("Invalid user ID format"),

  // Optional with defaults
  emailFrequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),

  // Nullable fields (can be null)
  timezone: z.string().nullable(),

  // Optional fields (may not be present)
  pushNotifications: z.boolean().optional(),

  // Arrays with validation
  interests: z.array(z.string().min(1)).max(10, "Too many interests"),

  // Nested objects
  privacy: z.object({
    profileVisibility: z.enum(["public", "private", "friends"]),
    dataSharing: z.boolean(),
  }),

  // Preprocessing and transformation
  createdAt: z.coerce.date(),
  settings: z.record(z.unknown()).default({}),
});
```

### Optional vs Nullable Handling

```typescript
// Understanding the distinction between optional and nullable
export const ContactUpdateSchema = z.object({
  // Optional: field may not be present in the request
  displayName: z.string().optional(),

  // Nullable: field is present but value can be null
  primaryEmail: z.string().email().nullable(),

  // Optional AND nullable: field may not be present OR be null
  notes: z.string().nullable().optional(),

  // Required: field must be present and not null
  userId: z.string().uuid(),
});

// Usage in exactOptionalPropertyTypes environment
type UpdateContactInput = {
  displayName?: string; // May not be present
  primaryEmail: string | null; // Present but can be null
  notes?: string | null; // May not be present, or present and null
  userId: string; // Always present and not null
};
```

## Schema Evolution Strategies

### Backward Compatible Changes

```typescript
// ✅ Safe evolution - adding optional fields
export const ContactDTOV1Schema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email().nullable(),
});

export const ContactDTOV2Schema = ContactDTOV1Schema.extend({
  // ✅ Adding optional fields is safe
  phone: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),

  // ✅ Adding fields with defaults is safe
  source: z.enum(["manual", "import"]).default("manual"),
});
```

### Breaking Changes Management

```typescript
// Managing breaking changes with versioned schemas
export const ContactDTOV1Schema = z.object({
  name: z.string(), // Old field name
  email: z.string().email(),
});

export const ContactDTOV2Schema = z.object({
  displayName: z.string(), // ❌ Breaking: renamed field
  email: z.string().email(),
  // New required field ❌ Breaking
  userId: z.string().uuid(),
});

// ✅ Migration strategy for breaking changes
export const ContactDTOV2Schema = z.object({
  displayName: z.string(),
  email: z.string().email(),
  // ✅ Add as optional first, then make required later
  userId: z.string().uuid().optional(),
});

// Migration function for handling legacy data
export function migrateContactV1ToV2(v1: ContactDTOV1): ContactDTOV2 {
  return {
    displayName: v1.name, // Handle field rename
    email: v1.email,
    userId: generateUserId(), // Provide default for new required field
  };
}
```

### Field Deprecation Patterns

```typescript
export const ContactDTOSchema = z
  .object({
    id: z.string().uuid(),
    displayName: z.string(),

    // ✅ Deprecation pattern - keep field but mark as deprecated
    /**
     * @deprecated Use displayName instead. Will be removed in v3.0
     */
    name: z.string().optional(),

    // ✅ Support both old and new field during transition
  })
  .transform((data) => {
    // Handle backward compatibility during transition
    if (data.name && !data.displayName) {
      data.displayName = data.name;
    }
    return data;
  });
```

## Common Pitfalls

### Type Safety Violations

**Problem**: Using `any` or overly permissive types

```typescript
// ❌ Broken - loses type safety
export const BadContactSchema = z.object({
  id: z.string(),
  data: z.any(), // ❌ No validation or type safety
  metadata: z.record(z.unknown()), // ❌ Too permissive
});
```

**Solution**: Use specific, validated types

```typescript
// ✅ Fixed - strict validation
export const GoodContactSchema = z.object({
  id: z.string().uuid(),
  data: z.object({
    preferences: z.array(z.string()),
    settings: z.record(z.string()),
  }),
  metadata: z.object({
    source: z.enum(["api", "import", "manual"]),
    version: z.number().int().positive(),
  }),
});
```

### Optional/Nullable Confusion

**Problem**: Misusing optional vs nullable

```typescript
// ❌ Broken - semantic confusion
export const ConfusingSchema = z.object({
  email: z.string().optional(), // ❌ Email can't be present but empty
  phone: z.string().nullable(), // ❌ Always present, but might be null?
});

// Usage confusion
const contact = {
  // email missing vs empty string vs null?
  phone: null, // Always required to be present?
};
```

**Solution**: Use semantic meaning correctly

```typescript
// ✅ Fixed - clear semantics
export const ClearSchema = z.object({
  // Email might not be provided (optional)
  email: z.string().email().optional(),

  // Phone is always provided but might be null/empty
  phone: z.string().nullable(),

  // Bio might not be provided AND can be null if provided
  bio: z.string().nullable().optional(),
});
```

### Database Schema Coupling

**Problem**: DTOs mirror database schema exactly

```typescript
// ❌ Broken - too closely coupled to database
export const DatabaseMirrorSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(), // ❌ Database field name
  created_at: z.string(), // ❌ Database timestamp format
  updated_at: z.string(),
  metadata: z.string(), // ❌ Raw database JSON string
});
```

**Solution**: Design DTOs for API/UI needs

```typescript
// ✅ Fixed - UI-focused design
export const APIFriendlySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(), // ✅ camelCase for JavaScript
  createdAt: z.coerce.date(), // ✅ JavaScript Date objects
  updatedAt: z.coerce.date(),
  metadata: z.object({
    // ✅ Structured, validated object
    source: z.string(),
    tags: z.array(z.string()),
  }),
});
```

## Migration Patterns

### Converting Raw Types to DTOs

**Before** (raw TypeScript types):

```typescript
// ❌ Old pattern - raw types, no validation
export interface Contact {
  id: string;
  name: string;
  email?: string;
  created: string;
}

// Service returns unvalidated data
export async function getContact(id: string): Promise<Contact> {
  const row = await db.select().from(contacts).where(eq(contacts.id, id));
  return row[0] as Contact; // ❌ No validation, type assertion
}
```

**After** (Zod DTO schemas):

```typescript
// ✅ New pattern - validated DTOs
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  createdAt: z.coerce.date(),
});

export type ContactDTO = z.infer<typeof ContactDTOSchema>;

// Repository returns validated DTOs
export async function getContact(userId: string, id: string): Promise<ContactDTO | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)));

  if (rows.length === 0) return null;
  return ContactDTOSchema.parse(rows[0]); // ✅ Validated DTO
}
```

### Step-by-Step Migration Guide

1. **Create Zod Schema**

   ```typescript
   export const ExampleDTOSchema = z.object({
     // Define all fields with proper validation
   });

   export type ExampleDTO = z.infer<typeof ExampleDTOSchema>;
   ```

2. **Add Validation at Boundaries**

   ```typescript
   // Repository layer
   return ExampleDTOSchema.parse(rawData);

   // API layer
   const validated = ExampleDTOSchema.parse(requestBody);
   ```

3. **Update Type References**

   ```typescript
   // Replace interface usage with DTO types
   function processExample(data: ExampleDTO) {
     // Implementation
   }
   ```

4. **Add Input/Output Variants**

   ```typescript
   export const CreateExampleDTOSchema = ExampleDTOSchema.omit({ id: true, createdAt: true });
   export const UpdateExampleDTOSchema = CreateExampleDTOSchema.partial();
   ```

### Verification Steps

After migration, verify:

- [ ] All data boundaries use Zod validation
- [ ] No raw database types in API responses
- [ ] TypeScript compilation succeeds with strict mode
- [ ] Runtime validation catches invalid data
- [ ] API documentation reflects DTO schemas
- [ ] Frontend receives predictable data shapes

## Troubleshooting

### Common Issues and Solutions

**Issue**: Zod validation errors on valid data
**Solution**: Check for type mismatches (string vs Date, optional vs nullable)

**Issue**: TypeScript errors with `exactOptionalPropertyTypes`
**Solution**: Use `.optional()` vs `.nullable()` correctly based on semantics

**Issue**: Performance problems with large validation
**Solution**: Use `.passthrough()` for unknown fields or optimize schema structure

**Issue**: Breaking changes in API responses
**Solution**: Use schema versioning and gradual migration strategies

### Debug Patterns

```typescript
// ✅ Add validation error logging
export function safeParseDTO<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error(`DTO validation failed in ${context}:`, {
      errors: result.error.errors,
      data,
    });
    throw new Error(`Invalid ${context} data: ${result.error.message}`);
  }

  return result.data;
}

// Usage
const validatedContact = safeParseDTO(ContactDTOSchema, rawData, "ContactRepository.getContact");
```

### Integration Problems

**DTO → API Integration**:

- Ensure request/response schemas match API expectations
- Verify error handling for validation failures
- Check that all required fields are provided

**DTO → Frontend Integration**:

- Ensure generated TypeScript types match frontend expectations
- Verify date handling between backend and frontend
- Check null vs undefined handling in UI components
