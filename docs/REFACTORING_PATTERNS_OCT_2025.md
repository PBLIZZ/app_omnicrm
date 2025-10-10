# Refactoring Patterns (2025)

## Repository Pattern

```typescript
// File: packages/repo/src/example.repo.ts
import type { DbClient } from "@/server/db/client";
import type { Example } from "@/server/db/schema";

export class ExampleRepository {
  constructor(private readonly db: DbClient) {}

  async getExample(id: string, userId: string): Promise<Example | null> {
    const rows = await this.db
      .select()
      .from(examples)
      .where(and(eq(examples.id, id), eq(examples.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createExample(data: CreateExample): Promise<Example> {
    const [example] = await this.db.insert(examples).values(data).returning();
    if (!example) throw new Error("Insert returned no data");
    return example;
  }
}

export function createExampleRepository(db: DbClient): ExampleRepository {
  return new ExampleRepository(db);
}
```

## Service Pattern

```typescript
// File: src/server/services/example.service.ts
import { getDb } from "@/server/db/client";
import { createExampleRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

export async function getExampleService(
  userId: string,
  exampleId: string,
): Promise<Example | null> {
  const db = await getDb();
  const repo = createExampleRepository(db);

  try {
    return await repo.getExample(exampleId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get example",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
```

## API Route Pattern

```typescript
typescript; // File: src/app/api/examples/route.ts
import { handleAuth } from "@/lib/api";
import { getExampleService } from "@/server/services/example.service";
import { ExampleSchema } from "@/server/db/business-schemas";

export const GET = handleAuth(
  z.object({ exampleId: z.string() }),
  ExampleSchema,
  async (data, userId): Promise<Example> => {
    const example = await getExampleService(userId, data.exampleId);
    if (!example) {
      throw new AppError("Example not found", "NOT_FOUND", "validation", false);
    }
    return example;
  },
);
```

### Key Principles

```bash
Key Principles

Repositories: Pure DB operations, no business logic
Services: Business logic, data transformation, orchestration
Routes: Validation, call services, return responses
Errors: Throw AppError in services, let handlers catch
Types: Use raw DB types, transform in services if needed
```

## 📋 Error Handling by Layer

### Repository Layer `(packages/repo/src/)`

- **Pattern:** Throw generic errors directly

```typescript
export class ExampleRepository {
  constructor(private readonly db: DbClient) {}

  async getExample(id: string): Promise<Example | null> {
    const rows = await this.db.select()...;
    return rows[0] ?? null;  // ← Returns null if not found
  }

  async createExample(data: CreateExample): Promise<Example> {
    const [result] = await this.db.insert().returning();
    if (!result) throw new Error("Insert returned no data"); // ← Throw generic Error
    return result;
  }
}
```

#### Repository Rules

- ✅ Returns Promise<T>, Promise<T | null>, or Promise<T[]>
- ✅ Throws generic Error for database failures
- ✅ Returns null for "not found" (don't throw)
- ❌ NO AppError
- ❌ NO DbResult wrapper
- ❌ NO status codes

### Service Layer `(src/server/services/)`

- **Pattern:** Wrap repo errors with AppError + status codes

```typescript
export async function getExampleService(userId: string, id: string): Promise<Example | null> {
  // ← Can return null if repo returns null
  const db = await getDb();
  const repo = createExampleRepository(db);

  try {
    return await repo.getExample(id, userId); // ← Returns null if not found
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get example",
      "DB_ERROR",
      "database",
      false,
      500, // ← Status code here
    );
  }
}

export async function deleteExampleService(userId: string, id: string): Promise<void> {
  // ← Returns void, throws if fails
  const db = await getDb();
  const repo = createExampleRepository(db);

  try {
    const existing = await repo.getExample(id, userId);
    if (!existing) {
      throw new AppError(
        "Example not found",
        "NOT_FOUND",
        "validation",
        false,
        404, // ← Service decides this is 404
      );
    }
    await repo.deleteExample(id, userId);
  } catch (error) {
    if (error instanceof AppError) throw error; // ← Re-throw AppError
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}
```

#### Service Rules

```typescript
Service Rules:

✅ Wrap repo errors with AppError (includes status code)
✅ Return Promise<T | null> when "not found" is valid
✅ Throw AppError(404) when "not found" is an error
✅ Specific error codes: 404 (not found), 503 (service unavailable), 500 (server error)
❌ NO generic Error throws (always AppError)
```

### Route Layer `(src/app/api/)`

- **Pattern:** Call service, check nulls, let handleAuth catch AppError

#### Case A: `Service returns Promise<T | null>`

```typescript
typescriptexport const GET = handleAuth(
  RequestSchema,
  ResponseSchema,
  async (data, userId): Promise<ResponseType> => {
    const item = await getExampleService(userId, data.id);

    if (!item) {
      // Service returned null - throw AppError here
      throw new AppError("Example not found", "NOT_FOUND", "validation", false, 404);
    }

    return { item };
  }
);
```

#### Case B: `Service returns Promise<T> (throws if not found)`

```typescript
export const DELETE = handleAuth(
  RequestSchema,
  ResponseSchema,
  async (data, userId): Promise<ResponseType> => {
    // Service throws AppError(404) if not found
    await deleteExampleService(userId, data.id);
    return { success: true };
  },
);
```

#### Route Rules

- ✅ Let handleAuth catch AppError (auto-converts to HTTP response)
- ✅ Check for null when service returns T | null
- ✅ Throw AppError in route if null check fails
- ❌ NO try-catch (handleAuth does this)
- ❌ NO manual Response.json()

##### 🎯 Decision Tree: When to Throw vs Return Null

- **In Services:**

```bash
Scenario|Pattern|Reason|
|--------|-------|------|
|Optional resource (GET)|Return Promise<T | null>|"Not found" is a valid state|
|Required operation (DELETE)|Throw AppError(404)|"Not found" means operation failed|
|Create/Update returns nothing|Throw AppError(404)|Can't complete without resource|
|List operations|Return Promise<T[]> (empty array)|No items is valid|
```

- **Examples:**

```typescript
// GET - Not found is OK
async function getItemService(userId: string, id: string): Promise<Item | null> {
  // Returns null if not found
}

// DELETE - Not found is an error
async function deleteItemService(userId: string, id: string): Promise<void> {
  const item = await repo.getItem(id, userId);
  if (!item) throw new AppError("Item not found", "NOT_FOUND", "validation", false, 404);
  await repo.deleteItem(id, userId);
}

// UPDATE - Not found is an error
async function updateItemService(userId: string, id: string, data: UpdateData): Promise<Item> {
  const updated = await repo.updateItem(id, userId, data);
  if (!updated) throw new AppError("Item not found", "NOT_FOUND", "validation", false, 404);
  return updated;
}
```

### 📊 Summary: Consistent Error Pattern

```bash
| Layer | Throws | Returns | Status Codes |
|-------|--------|---------|--------------|
| **Repo** | Generic `Error` | `T`, `T\|null`, `T[]` | No |
| **Service** | `AppError` with status | `T`, `T\|null`, `T[]` | Yes (404, 500, 503) |
| **Route** | `AppError` for null checks | Data object | Yes (404) |
```
