# Schema Synchronization Strategy

## Current State (Manual Sync)

```
┌─────────────────────────────────────────────────────────────────┐
│ Supabase Database (Source of Truth)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ MANUAL
┌─────────────────────────────────────────────────────────────────┐
│ database.types.ts (TypeScript types from Supabase Dashboard)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ MANUAL
┌─────────────────────────────────────────────────────────────────┐
│ schema.ts (Drizzle schema - ORM layer)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ MANUAL
┌─────────────────────────────────────────────────────────────────┐
│ Business Schemas (src/server/db/business-schemas/*.ts)          │
│ - Zod validation schemas                                        │
│ - API request/response types                                    │
│ - Business logic types                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Problems with Manual Sync

1. **Type Drift**: Changes in database not reflected in code
2. **No Validation**: No automatic checks for mismatches
3. **Error-Prone**: Easy to forget to update all layers
4. **Time-Consuming**: Manual updates across 4+ files per change

## Recommended Solution: Semi-Automated Workflow

### 1. Database Changes (Supabase SQL Editor)

```sql
-- Always make schema changes in Supabase first
ALTER TABLE contacts ADD COLUMN new_field TEXT;
```

### 2. Auto-Generate Types (Download from Dashboard)

```bash
# Supabase Dashboard → Database → TypeScript
# Download database.types.ts
# Save to: src/server/db/database.types.ts
```

**Alternative (CLI):**
```bash
# If using Supabase CLI
npx supabase gen types typescript --local > src/server/db/database.types.ts
```

### 3. Sync Drizzle Schema

```bash
# Pull schema changes from database
npx drizzle-kit pull

# This updates schema.ts automatically
# Review the diff before committing
```

### 4. Validate Schema Sync (Automated Script)

Create a validation script to catch drift:

```typescript
// scripts/validate-schema-sync.ts
import * as schema from '../src/server/db/schema';
import type { Database } from '../src/server/db/database.types';

// Compare table names
const schemaTableNames = Object.keys(schema);
const dbTableNames = Object.keys(Database['public']['Tables']);

const missing = dbTableNames.filter(t => !schemaTableNames.includes(t));
if (missing.length > 0) {
  console.error('❌ Missing tables in schema.ts:', missing);
  process.exit(1);
}

console.log('✅ Schema sync validated');
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "validate:schema": "tsx scripts/validate-schema-sync.ts"
  }
}
```

### 5. Business Schema Generation (Semi-Automated)

Use Supabase AI Assistant or script to generate Zod schemas:

```typescript
// scripts/generate-business-schema.ts
import { contacts } from '../src/server/db/schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Auto-generate base schemas
const ContactSchema = createSelectSchema(contacts);
const CreateContactSchema = createInsertSchema(contacts);

// Manual refinements for business logic
const ContactWithBusinessLogic = ContactSchema.extend({
  // Add custom validations
  primaryEmail: z.string().email().optional(),
  tags: z.array(z.string()).max(20),
});
```

## Proposed Workflow

### For New Tables

```bash
# 1. Create table in Supabase SQL Editor
# 2. Download database.types.ts from dashboard
# 3. Pull schema with Drizzle
npx drizzle-kit pull

# 4. Validate sync
pnpm validate:schema

# 5. Generate business schema (if needed)
pnpm generate:business-schema contacts

# 6. Review and refine generated schemas
# 7. Add to business-schemas/index.ts exports
```

### For Schema Changes

```bash
# 1. Modify table in Supabase
# 2. Download new database.types.ts
# 3. Pull updated schema
npx drizzle-kit pull

# 4. Validate
pnpm validate:schema

# 5. Update affected business schemas manually
# (Check TypeScript errors to find affected files)
pnpm typecheck
```

## Best Practices

### 1. Single Source of Truth

**Supabase Database** is the source of truth. Never modify:
- `database.types.ts` manually (always download from Supabase)
- `schema.ts` manually for existing tables (use `drizzle-kit pull`)

### 2. Version Control

```bash
# Commit schema changes together
git add src/server/db/database.types.ts
git add src/server/db/schema.ts
git add src/server/db/business-schemas/contacts.ts
git commit -m "feat: add photoUrl field to contacts"
```

### 3. CI/CD Validation

Add to `.github/workflows/ci.yml`:

```yaml
- name: Validate schema sync
  run: pnpm validate:schema

- name: TypeScript type check
  run: pnpm typecheck
```

### 4. Documentation

Update `CLAUDE.md` when you change schemas:

```markdown
## Recent Schema Changes

- 2025-10-01: Added `photo_access_audit` table for HIPAA compliance
- 2025-10-01: Added `photoUrl` to contacts table
```

## Current Schema Files

### Core Schema Files (Do NOT edit manually)

1. **`src/server/db/database.types.ts`**
   - Downloaded from Supabase Dashboard
   - Raw TypeScript types from database
   - **Never edit manually**

2. **`src/server/db/schema.ts`**
   - Drizzle ORM schema
   - Generated with `npx drizzle-kit pull`
   - **Only edit for new tables before migration**

### Business Logic Files (Edit as needed)

3. **`src/server/db/business-schemas/*.ts`**
   - Zod validation schemas
   - API request/response types
   - Business logic validations
   - **Edit to add custom validation rules**

4. **`packages/repo/src/*.repo.ts`**
   - Repository layer (data access)
   - Uses Drizzle schema
   - **Edit for new queries/mutations**

5. **`src/server/services/*.service.ts`**
   - Business logic services
   - Uses business schemas
   - **Edit for business rules**

## Type Safety Guarantees

### 1. Database → TypeScript

```typescript
// database.types.ts is generated from database
// Guarantees: Types match actual database structure
type Contact = Database['public']['Tables']['contacts']['Row'];
```

### 2. TypeScript → Drizzle

```typescript
// schema.ts should match database.types.ts
// Validate with:
export const contacts: typeof Database['public']['Tables']['contacts']['Row'];
```

### 3. Drizzle → Zod

```typescript
// Use drizzle-zod for automatic schema generation
import { createSelectSchema } from 'drizzle-zod';
const ContactSchema = createSelectSchema(contacts);
// Then refine with custom validations
```

## Automated Sync Tools (Future)

Consider these tools for better automation:

1. **Supabase CLI** - Generate types from local/remote database
2. **Drizzle Kit** - Already using for schema introspection
3. **Drizzle Zod** - Auto-generate Zod schemas from Drizzle
4. **Custom Scripts** - Validate schema consistency

## Quick Reference

```bash
# After database change workflow:
1. Make SQL change in Supabase Dashboard
2. Download database.types.ts from Dashboard → TypeScript tab
3. npx drizzle-kit pull  # Update schema.ts
4. pnpm typecheck        # Find affected business schemas
5. Update business-schemas/*.ts manually
6. pnpm validate:schema  # Verify sync
7. git commit -am "schema: add new field"
```

## Testing Your Photo URL Implementation

Since you've already run the SQL migration, follow this checklist:

### Immediate Steps

1. **Download latest database.types.ts**
   - Supabase Dashboard → Database → TypeScript
   - Save to `src/server/db/database.types.ts`
   - Should include `photo_access_audit` table

2. **Verify schema.ts has photoAccessAudit**
   ```bash
   grep -A 10 "photoAccessAudit" src/server/db/schema.ts
   ```

3. **Test in browser** (see: `docs/testing/test-photo-url-optimization.md`)
   - Open http://localhost:3000/contacts
   - DevTools → Network → Should see 1 API call (not 101)
   - Photos should load instantly with signed URLs

4. **Check audit logs**
   ```sql
   SELECT * FROM photo_access_audit ORDER BY accessed_at DESC LIMIT 5;
   ```

Your implementation is ready to test! The browser DevTools Network tab will show you immediately if it's working (1 API call vs 101).
