# API Boundary Pattern - Before & After

This document demonstrates the power of the new API boundary pattern that standardizes and simplifies API route handlers.

## Before: Manual Validation & Error Handling (37 lines)

```typescript
// src/app/api/omni-clients/route.ts - POST handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // Validate request body
    const validatedBody = CreateOmniClientSchema.parse(body);

    // Delegate to service layer
    const result = await OmniClientsService.createOmniClient(userId, validatedBody);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create omni client:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid client data", details: error.message },
        { status: 400 },
      );
    }

    // Handle auth errors
    if (error instanceof Error && "status" in error && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to create omni client",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
```

## After: Typed API Handler Pattern (3 lines)

```typescript
// src/app/api/omni-clients/route.ts - POST handler
import { handleAuth } from "@/lib/api";
import { CreateOmniClientSchema, OmniClientSchema } from "@/server/db/business-schemas/contacts";
import { OmniClientsService } from "@/server/services/omni-clients.service";

export const POST = handleAuth(
  CreateOmniClientSchema,
  OmniClientSchema,
  async (data, userId) => {
    return await OmniClientsService.createOmniClient(userId, data);
  }
);
```

## Benefits

### 🎯 **Massive Code Reduction**

- **Before**: 37 lines of boilerplate
- **After**: 3 lines of business logic
- **Reduction**: 92% less code

### 🛡️ **Automatic Type Safety**

- Input validation with Zod schemas
- Output validation ensures API contract compliance
- Full TypeScript inference for parameters and return types

### 🔒 **Built-in Security**

- Automatic authentication handling
- Consistent error responses
- No manual auth logic required

### 📐 **Standardized API Boundary**

- Consistent error format across all endpoints
- Unified validation and serialization
- Centralized error handling patterns

### 🧪 **Enhanced Testability**

- Pure business logic functions are easier to test
- No HTTP concerns mixed with business logic
- Mockable service layer

## GET Handler Example

```typescript
// Before: ~30 lines of manual query parsing and validation
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetOmniClientsQuerySchema.parse(queryParams);

    const result = await OmniClientsService.listOmniClients(userId, validatedQuery);
    return NextResponse.json(result);
  } catch (error) {
    // Manual error handling...
  }
}

// After: 3 lines
export const GET = handleGetWithQueryAuth(
  GetOmniClientsQuerySchema,
  ContactListResponseSchema,
  async (query, userId) => {
    return await OmniClientsService.listOmniClients(userId, query);
  }
);
```

## Available Handler Functions

1. **`handle`** - Basic POST/PUT handler with validation
2. **`handleAuth`** - Authenticated POST/PUT handler
3. **`handleGet`** - Simple GET handler
4. **`handleGetWithQuery`** - GET with query parameter validation
5. **`handleGetWithQueryAuth`** - Authenticated GET with query validation

## Migration Strategy

1. **Immediate**: Use for all new API routes
2. **Gradual**: Refactor existing routes during maintenance
3. **Priority**: Focus on routes with complex validation logic first

This pattern completes our type system migration by providing a clean, type-safe API boundary that eliminates boilerplate while ensuring consistency and security.
