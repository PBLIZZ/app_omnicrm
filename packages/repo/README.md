# Repository Pattern Guide

**Date** 2025-09-19

## Purpose & Architecture

The Repository Pattern provides a consistent abstraction layer between the business logic and data storage, ensuring clean separation of concerns and type safety throughout the application.

### Key Benefits

- **Type Safety**: Full TypeScript type enforcement with Zod validation at boundaries
- **Consistent API**: Standardized CRUD operations across all data access
- **DTO Boundary Enforcement**: Strict separation between database types and API contracts
- **Error Handling**: Centralized error management with proper error propagation
- **Database Agnostic**: Business logic isolated from database implementation details

### Architecture Overview

```bash
API Route Handler → Service Layer → Repository → Database
                     ↓              ↓          ↓
               Business Logic   Data Access   Raw SQL
```

The repository layer sits between services and the database, translating between:

- **Input**: DTOs from the service layer
- **Output**: Validated DTOs back to the service layer
- **Internal**: Raw database operations with proper type mapping

## Usage Examples

### Basic Repository Structure

```typescript
// packages/repo/src/contacts.repo.ts
import { getDb } from "./db";
import { ContactDTOSchema, type ContactDTO } from "@omnicrm/contracts";

export class ContactsRepository {
  /**
   * Critical Pattern: Always use getDb() async pattern
   */
  static async listContacts(userId: string, search?: string): Promise<ContactDTO[]> {
    const db = await getDb(); // ✅ Correct: async getDb()

    const rows = await db
      .select({
        // ✅ Object map select - explicit field mapping
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        // ... all required fields explicitly mapped
      })
      .from(contacts)
      .where(and(...conditions));

    // ✅ DTO validation at boundary
    return rows.map((row) => ContactDTOSchema.parse(row));
  }
}
```

### Database Connection Pattern

**✅ ALWAYS USE:**

```typescript
import { getDb } from "./db";

export class SomeRepository {
  static async someMethod() {
    const db = await getDb(); // ✅ Async connection
    return await db.select().from(table);
  }
}
```

**❌ NEVER USE:**

```typescript
import { db } from "@/server/db"; // ❌ Proxy import

export class SomeRepository {
  static async someMethod() {
    return await db.select().from(table); // ❌ Runtime error: .from is not a function
  }
}
```

### Object Map Select Statements

**✅ ALWAYS USE explicit field mapping:**

```typescript
const rows = await db
  .select({
    id: contacts.id,
    userId: contacts.userId,
    displayName: contacts.displayName,
    primaryEmail: contacts.primaryEmail,
    // ... all fields explicitly mapped
  })
  .from(contacts);
```

**❌ NEVER USE raw table select:**

```typescript
const rows = await db.select().from(contacts); // ❌ Breaks type safety
```

### Handling Optional Fields with exactOptionalPropertyTypes

```typescript
static async createContact(data: CreateContactDTO & { userId: string }): Promise<ContactDTO> {
  const db = await getDb();

  // ✅ Convert undefined to null for database nullable fields
  const insertValues = {
    userId: data.userId,
    displayName: data.displayName,
    primaryEmail: data.primaryEmail ?? null,
    primaryPhone: data.primaryPhone ?? null,
    source: data.source ?? null,
    // ... handle all optional fields
  };

  const [newContact] = await db
    .insert(contacts)
    .values(insertValues)
    .returning({
      // ✅ Object map for consistent return type
      id: contacts.id,
      userId: contacts.userId,
      displayName: contacts.displayName,
      // ... all fields
    });

  return ContactDTOSchema.parse(newContact);
}
```

### Error Handling with DTOs

```typescript
static async getContactById(userId: string, contactId: string): Promise<ContactDTO | null> {
  const db = await getDb();

  const rows = await db
    .select({
      id: contacts.id,
      userId: contacts.userId,
      // ... other fields
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
    .limit(1);

  if (rows.length === 0) {
    return null; // ✅ Explicit null return for not found
  }

  return ContactDTOSchema.parse(rows[0]); // ✅ DTO validation
}
```

## Best Practices

### Do's and Don'ts

**✅ DO:**

- Always use `getDb()` async pattern for database connections
- Use object map select statements for explicit field mapping
- Validate all outputs with Zod schemas at repository boundaries
- Handle optional fields with `?? null` for database compatibility
- Return DTOs, never raw database objects
- Use static methods for repository classes
- Implement proper error handling with null returns for not found

**❌ DON'T:**

- Import `db` directly from database client (causes runtime errors)
- Use raw `select()` without field mapping
- Return unvalidated database rows
- Mix business logic in repository methods
- Use repository methods outside of service layer
- Ignore TypeScript strict mode requirements

### Performance Considerations

```typescript
// ✅ Efficient batch operations
static async getContactsByIds(userId: string, contactIds: string[]): Promise<ContactDTO[]> {
  if (contactIds.length === 0) {
    return []; // ✅ Early return for empty arrays
  }

  const db = await getDb();

  const rows = await db
    .select({
      // ... object map
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));

  return rows.map(row => ContactDTOSchema.parse(row));
}

// ✅ Optimized count queries
static async deleteContactsByIds(userId: string, contactIds: string[]): Promise<number> {
  if (contactIds.length === 0) {
    return 0;
  }

  const db = await getDb();

  // ✅ Count first to avoid unnecessary operations
  const countRows = await db
    .select({ n: sql<number>`count(*)` })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)))
    .limit(1);

  const n = countRows[0]?.n ?? 0;

  if (n === 0) {
    return 0;
  }

  await db.delete(contacts).where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)));
  return n;
}
```

### Security Considerations

```typescript
// ✅ Always include userId in WHERE clauses for row-level security
static async updateContact(
  userId: string, // ✅ Required for data isolation
  contactId: string,
  data: UpdateContactDTO
): Promise<ContactDTO | null> {
  const db = await getDb();

  const [updatedContact] = await db
    .update(contacts)
    .set(updateValues)
    .where(and(
      eq(contacts.userId, userId), // ✅ User isolation
      eq(contacts.id, contactId)   // ✅ Resource identification
    ))
    .returning({
      // ... object map
    });

  if (!updatedContact) {
    return null; // ✅ Not found or no permission
  }

  return ContactDTOSchema.parse(updatedContact);
}
```

## Common Pitfalls

### Database Connection Errors

**Problem**: `TypeError: db.from is not a function`

```typescript
// ❌ Broken - proxy import pattern
import { db } from "@/server/db";
const result = await db.select().from(contacts); // Runtime error
```

**Solution**: Use async `getDb()` pattern

```typescript
// ✅ Fixed - async connection pattern
import { getDb } from "./db";
const db = await getDb();
const result = await db.select().from(contacts); // Works correctly
```

### Type Safety Violations

**Problem**: Unvalidated data returned to service layer

```typescript
// ❌ Broken - returns raw database object
static async getContact(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
  return row; // ❌ No validation, wrong return type
}
```

**Solution**: Validate with DTO schemas

```typescript
// ✅ Fixed - DTO validation at boundary
static async getContact(userId: string, id: string): Promise<ContactDTO | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      userId: contacts.userId,
      // ... explicit mapping
    })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, id)));

  if (rows.length === 0) return null;
  return ContactDTOSchema.parse(rows[0]); // ✅ Validated DTO
}
```

### Optional Field Handling

**Problem**: `exactOptionalPropertyTypes` conflicts with database nullable fields

```typescript
// ❌ Broken - undefined can't be inserted into nullable columns
const insertValues = {
  displayName: data.displayName,
  primaryEmail: data.primaryEmail, // ❌ might be undefined
};
await db.insert(contacts).values(insertValues); // Database error
```

**Solution**: Convert undefined to null

```typescript
// ✅ Fixed - handle optional fields properly
const insertValues = {
  displayName: data.displayName,
  primaryEmail: data.primaryEmail ?? null, // ✅ null for database
  primaryPhone: data.primaryPhone ?? null,
  source: data.source ?? null,
};
await db.insert(contacts).values(insertValues); // Works correctly
```

## Migration Patterns

### Converting Legacy Direct Database Access

**Before** (service directly using database):

```typescript
// ❌ Old pattern - service accessing database directly
export async function getContactsService(userId: string) {
  const db = await getDb();
  return await db.select().from(contacts).where(eq(contacts.userId, userId));
}
```

**After** (using repository pattern):

```typescript
// ✅ New pattern - service using repository
export async function getContactsService(userId: string) {
  return await ContactsRepository.listContacts(userId);
}

// Repository handles database access and DTO validation
export class ContactsRepository {
  static async listContacts(userId: string): Promise<ContactDTO[]> {
    const db = await getDb();
    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        // ... all fields
      })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    return rows.map((row) => ContactDTOSchema.parse(row));
  }
}
```

### Step-by-Step Migration Guide

1. **Create Repository Class**

   ```typescript
   export class ExampleRepository {
     // Start with one method
   }
   ```

2. **Add Database Connection**

   ```typescript
   static async someMethod() {
     const db = await getDb(); // ✅ Use getDb()
   }
   ```

3. **Implement Object Map Select**

   ```typescript
   const rows = await db
     .select({
       id: table.id,
       field1: table.field1,
       // ... map all fields explicitly
     })
     .from(table);
   ```

4. **Add DTO Validation**

   ```typescript
   return rows.map((row) => SomeDTOSchema.parse(row));
   ```

5. **Update Service Layer**

   ```typescript
   // Replace direct database calls with repository calls
   const data = await ExampleRepository.someMethod(userId, params);
   ```

### Verification Steps

After migration, verify:

- [ ] All database access goes through repositories
- [ ] All repository methods use `getDb()` pattern
- [ ] All selects use object mapping
- [ ] All returns are validated DTOs
- [ ] Services only call repositories, not database directly
- [ ] Type safety maintained throughout

## Troubleshooting

### Common Issues and Solutions

**Issue**: `db.from is not a function`
**Solution**: Use `const db = await getDb()` instead of importing `db` directly

**Issue**: TypeScript errors with optional fields
**Solution**: Use `?? null` for optional fields when inserting/updating

**Issue**: Zod validation errors on repository returns
**Solution**: Ensure object map select includes all required DTO fields

**Issue**: Performance problems with large datasets
**Solution**: Implement pagination, early returns, and count optimization

**Issue**: Missing user isolation in queries
**Solution**: Always include `eq(table.userId, userId)` in WHERE clauses

### Debug Patterns

```typescript
// ✅ Add logging for debugging
static async someMethod(userId: string): Promise<SomeDTO[]> {
  console.log(`Repository: someMethod called for user ${userId}`);

  const db = await getDb();
  const rows = await db
    .select({
      // ... object map
    })
    .from(table)
    .where(eq(table.userId, userId));

  console.log(`Repository: found ${rows.length} rows`);

  const validated = rows.map(row => {
    try {
      return SomeDTOSchema.parse(row);
    } catch (error) {
      console.error('DTO validation error:', error, 'Row:', row);
      throw error;
    }
  });

  return validated;
}
```

### Integration Problems

**Repository → Service Integration**:

- Ensure service methods call repository methods with correct parameters
- Verify repository return types match service expectations
- Check error handling propagation from repository to service

**Database → Repository Integration**:

- Verify schema field names match object map selects
- Ensure database connection configuration is correct
- Check that migrations have been applied properly
