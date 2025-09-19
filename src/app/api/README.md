# API Route Patterns Guide

**Date:** 2025-09-19

**Author:** Peter James Blizzard

## Purpose & Architecture

API routes in OmniCRM serve as thin HTTP handlers that delegate business logic to service layers while providing consistent request/response patterns, authentication, validation, and error handling across all endpoints.

**Key Benefits:**

- **Consistency**: Standardized patterns for authentication, validation, and responses
- **Thin Controllers**: Business logic delegated to service layer, keeping routes maintainable
- **Type Safety**: Full TypeScript validation with Zod schemas at API boundaries
- **Security**: CSRF protection, authentication, and proper error handling
- **Developer Experience**: Clear patterns for creating new endpoints with minimal boilerplate

**Architecture Overview:**

```bash
HTTP Request → Middleware → API Route → Service Layer → Repository → Database
     ↓            ↓           ↓            ↓             ↓         ↓
   Body/Query → Auth/CSRF → Validation → Business    → Data    → Storage
                                        Logic        Access
```

API routes handle:

- HTTP method routing (GET, POST, PUT, DELETE)
- Authentication and authorization
- Request validation and transformation
- Response formatting and error handling
- CSRF protection for mutating operations

## Core Patterns

### Thin Handler Principle

API routes should be thin controllers that delegate to service layers, not contain business logic:

```typescript
// ✅ GOOD - Thin handler pattern
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_list" },
  validation: {
    query: GetOmniClientsQuerySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_list", requestId);

  try {
    const params = {
      page: validated.query.page ?? 1,
      pageSize: validated.query.pageSize ?? 50,
      search: validated.query.search,
    };

    // Delegate to service layer
    const { items, total } = await listContactsService(userId, params);

    // Transform using adapter if needed
    const omniClients = toOmniClientsWithNotes(items);

    return api.success({ items: omniClients, total });
  } catch (error) {
    return api.error("Failed to fetch omni clients", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// ❌ BAD - Business logic in route handler
export async function GET(req: Request) {
  const userId = await getServerUserId();

  // ❌ Don't do complex business logic in routes
  const db = await getDb();
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, userId));

  // ❌ Don't do data transformation in routes
  const enrichedContacts = await Promise.all(contacts.map(async contact => {
    const insights = await generateAIInsights(contact);
    return { ...contact, insights };
  }));

  return Response.json({ contacts: enrichedContacts });
}
```

### Route Handler Factory Pattern

Use the `createRouteHandler` factory for consistent route behavior:

```typescript
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

export const GET = createRouteHandler({
  auth: true, // Requires authentication
  rateLimit: { operation: "contacts_list" }, // Rate limiting
  validation: {
    query: GetContactsQuerySchema, // Query validation
    // body: CreateContactSchema, // Body validation for POST/PUT
    // params: ContactParamsSchema, // Path params validation
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_list", requestId);

  try {
    // Route implementation
    const result = await contactService.listContacts(userId, validated.query);
    return api.success(result);
  } catch (error) {
    return api.error("Operation failed", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
```

### Repository Integration

API routes integrate with repositories through service layers:

```typescript
// ✅ CORRECT - Service → Repository pattern
export const POST = createRouteHandler({
  auth: true,
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_create", requestId);

  try {
    // Service layer handles business logic
    const contact = await contactService.createContact(userId, validated.body);
    return api.success({ item: contact }, undefined, 201);
  } catch (error) {
    return api.error("Failed to create contact", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// Service implementation
export async function createContact(userId: string, data: CreateContactDTO): Promise<ContactDTO> {
  // Business logic and validation
  if (data.primaryEmail) {
    const existing = await ContactsRepository.findContactByEmail(userId, data.primaryEmail);
    if (existing) {
      throw new Error("Contact with this email already exists");
    }
  }

  // Delegate to repository
  return ContactsRepository.createContact({ ...data, userId });
}
```

### Error Envelope Patterns

Use the ApiResponseBuilder for consistent error handling:

```typescript
export const GET = createRouteHandler({
  auth: true,
  validation: { params: z.object({ contactId: z.string().uuid() }) },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_get", requestId);

  try {
    const contact = await contactService.getContact(userId, validated.params.contactId);

    if (!contact) {
      return api.notFound("Contact not found");
    }

    return api.success({ item: contact });
  } catch (error) {
    const err = ensureError(error);

    if (err.message.includes("validation")) {
      return api.validationError("Invalid contact data", { error: err.message });
    }

    if (err.message.includes("permission")) {
      return api.forbidden("Access denied to this contact");
    }

    return api.databaseError("Failed to retrieve contact", err);
  }
});
```

### CSRF Protection Handling

All mutating operations require CSRF tokens:

```typescript
// CSRF protection is handled automatically by createRouteHandler
export const POST = createRouteHandler({
  auth: true, // Also enables CSRF protection for POST/PUT/DELETE
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  // CSRF validation already completed by middleware
  // Route implementation here
});

// For testing, include CSRF token in headers
const response = await fetch('/api/omni-clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': 'valid-csrf-token' // Required for mutating operations
  },
  body: JSON.stringify(contactData)
});
```

## Usage Examples

### Basic CRUD Operations

```typescript
// GET /api/omni-clients - List contacts
export const GET = createRouteHandler({
  auth: true,
  validation: {
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().optional(),
    }),
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_list", requestId);

  try {
    const params = {
      page: validated.query.page ?? 1,
      pageSize: validated.query.pageSize ?? 50,
      search: validated.query.search,
    };

    const result = await contactService.listContacts(userId, params);
    return api.success(result);
  } catch (error) {
    return api.error("Failed to fetch contacts", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// POST /api/omni-clients - Create contact
export const POST = createRouteHandler({
  auth: true,
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_create", requestId);

  try {
    const contact = await contactService.createContact(userId, validated.body);
    return api.success({ item: contact }, "Contact created successfully", 201);
  } catch (error) {
    const err = ensureError(error);

    if (err.message.includes("already exists")) {
      return api.validationError("Contact with this email already exists");
    }

    return api.error("Failed to create contact", "INTERNAL_ERROR", undefined, err);
  }
});
```

### Dynamic Route Parameters

```typescript
// GET /api/omni-clients/[clientId] - Get single contact
export const GET = createRouteHandler({
  auth: true,
  validation: {
    params: z.object({
      clientId: z.string().uuid("Invalid contact ID format"),
    }),
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_get", requestId);

  try {
    const contact = await contactService.getContact(userId, validated.params.clientId);

    if (!contact) {
      return api.notFound("Contact not found");
    }

    return api.success({ item: contact });
  } catch (error) {
    return api.error("Failed to retrieve contact", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// PUT /api/omni-clients/[clientId] - Update contact
export const PUT = createRouteHandler({
  auth: true,
  validation: {
    params: z.object({ clientId: z.string().uuid() }),
    body: UpdateContactDTOSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_update", requestId);

  try {
    const contact = await contactService.updateContact(
      userId,
      validated.params.clientId,
      validated.body
    );

    if (!contact) {
      return api.notFound("Contact not found");
    }

    return api.success({ item: contact }, "Contact updated successfully");
  } catch (error) {
    return api.error("Failed to update contact", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
```

### Complex Query Operations

```typescript
// GET /api/omni-clients/suggestions - Get contact suggestions
export const GET = createRouteHandler({
  auth: true,
  validation: {
    query: z.object({
      source: z.enum(["calendar", "gmail"]).optional(),
      timeRange: z.coerce.number().int().positive().max(365).optional(),
      limit: z.coerce.number().int().positive().max(50).optional(),
    }),
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_suggestions", requestId);

  try {
    const suggestions = await contactService.getContactSuggestions(userId, {
      source: validated.query.source,
      timeRangeDays: validated.query.timeRange ?? 30,
      limit: validated.query.limit ?? 20,
    });

    return api.success({
      items: suggestions,
      count: suggestions.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return api.error("Failed to generate suggestions", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
```

### Batch Operations

```typescript
// POST /api/omni-clients/bulk-delete - Bulk delete contacts
export const POST = createRouteHandler({
  auth: true,
  validation: {
    body: z.object({
      contactIds: z.array(z.string().uuid()).min(1).max(100),
    }),
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_bulk_delete", requestId);

  try {
    const deletedCount = await contactService.bulkDeleteContacts(
      userId,
      validated.body.contactIds
    );

    return api.success({
      deletedCount,
      requestedCount: validated.body.contactIds.length,
    }, `Successfully deleted ${deletedCount} contacts`);
  } catch (error) {
    return api.error("Failed to delete contacts", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
```

## Best Practices

### Do's and Don'ts

**✅ DO:**

- Use `createRouteHandler` factory for consistent behavior
- Delegate business logic to service layers
- Validate all inputs with Zod schemas
- Use `ApiResponseBuilder` for consistent response formatting
- Handle specific error cases with appropriate HTTP status codes
- Include meaningful error messages for debugging
- Use proper TypeScript types throughout

**❌ DON'T:**

- Put business logic directly in route handlers
- Access repositories directly from routes
- Skip input validation or use weak validation
- Return raw database objects without DTO validation
- Ignore error handling or use generic error responses
- Expose sensitive information in error messages
- Mix authentication logic with business logic

### Input Validation Patterns

```typescript
// ✅ GOOD - Comprehensive validation
const CreateContactSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  primaryEmail: z.string().email("Invalid email format").optional(),
  primaryPhone: z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone format").optional(),
  source: z.enum(["manual", "import", "calendar"]).default("manual"),
  tags: z.array(z.string().min(1)).max(20, "Too many tags").optional(),
}).strict(); // Reject unknown properties

// ✅ GOOD - Path parameter validation
const ContactParamsSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID format"),
});

// ✅ GOOD - Query parameter validation with coercion
const ContactListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().min(1).max(255).optional(),
  sortBy: z.enum(["displayName", "createdAt", "updatedAt"]).default("displayName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ❌ BAD - Weak validation
const WeakSchema = z.object({
  name: z.string(), // No length constraints
  email: z.string().optional(), // No email format validation
  data: z.any(), // No type safety
});
```

### Error Handling Patterns

```typescript
// ✅ GOOD - Specific error handling
export const POST = createRouteHandler({
  auth: true,
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_create", requestId);

  try {
    const contact = await contactService.createContact(userId, validated.body);
    return api.success({ item: contact }, undefined, 201);
  } catch (error) {
    const err = ensureError(error);

    // Handle specific business errors
    if (err.message.includes("duplicate email")) {
      return api.validationError("A contact with this email already exists", {
        field: "primaryEmail",
        code: "DUPLICATE_EMAIL"
      });
    }

    if (err.message.includes("invalid stage")) {
      return api.validationError("Invalid client stage provided", {
        field: "stage",
        validOptions: ["Prospect", "New Client", "Core Client"]
      });
    }

    if (err.message.includes("permission denied")) {
      return api.forbidden("You don't have permission to create contacts");
    }

    // Generic database/internal errors
    return api.databaseError("Failed to create contact", err);
  }
});

// ❌ BAD - Generic error handling
try {
  const contact = await contactService.createContact(userId, validated.body);
  return api.success({ item: contact });
} catch (error) {
  return api.error("Something went wrong", "ERROR"); // Too generic
}
```

### Response Formatting Patterns

```typescript
// ✅ GOOD - Consistent response structure
return api.success({
  items: contacts,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrev: page > 1
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }
});

// ✅ GOOD - Single item response
return api.success({
  item: contact,
  metadata: {
    lastModified: contact.updatedAt,
    version: "v1.0"
  }
}, "Contact retrieved successfully");

// ✅ GOOD - Operation result response
return api.success({
  success: true,
  affected: deletedCount,
  operation: "bulk_delete",
  timestamp: new Date().toISOString()
}, `Successfully deleted ${deletedCount} contacts`);
```

## Common Pitfalls

### Missing Authentication

**Problem**: Forgetting to add authentication to protected routes

```typescript
// ❌ BROKEN - Missing authentication
export const GET = createRouteHandler({
  // Missing auth: true
  validation: { query: ContactListQuerySchema },
})(async ({ validated, requestId }) => {
  // ❌ No userId available, anyone can access
  const contacts = await contactService.listContacts("any-user", validated.query);
  return api.success({ items: contacts });
});
```

**Solution**: Always specify authentication requirements

```typescript
// ✅ FIXED - Proper authentication
export const GET = createRouteHandler({
  auth: true, // Ensures userId is available and validated
  validation: { query: ContactListQuerySchema },
})(async ({ userId, validated, requestId }) => {
  // ✅ userId is guaranteed to be valid
  const contacts = await contactService.listContacts(userId, validated.query);
  return api.success({ items: contacts });
});
```

### Weak Input Validation

**Problem**: Insufficient validation allows invalid data through

```typescript
// ❌ BROKEN - Weak validation
const WeakSchema = z.object({
  name: z.string(), // Could be empty string
  email: z.string().optional(), // Could be invalid email format
  age: z.number(), // Could be negative or unrealistic
});

export const POST = createRouteHandler({
  auth: true,
  validation: { body: WeakSchema },
})(async ({ userId, validated }) => {
  // Garbage data makes it through validation
});
```

**Solution**: Use comprehensive validation with business rules

```typescript
// ✅ FIXED - Strong validation
const StrongSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(100, "Name too long"),
  primaryEmail: z.string().email("Invalid email format").optional(),
  age: z.number().int().min(0).max(150, "Invalid age").optional(),
  stage: z.enum(["Prospect", "New Client", "Core Client"]),
}).strict(); // Reject unknown properties

export const POST = createRouteHandler({
  auth: true,
  validation: { body: StrongSchema },
})(async ({ userId, validated }) => {
  // Only valid data reaches this point
});
```

### Business Logic in Routes

**Problem**: Route handlers containing complex business logic

```typescript
// ❌ BROKEN - Business logic in route
export const POST = createRouteHandler({
  auth: true,
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_create", requestId);

  // ❌ Complex business logic in route handler
  const existingContacts = await ContactsRepository.findContactByEmail(userId, validated.body.primaryEmail);
  if (existingContacts) {
    return api.validationError("Duplicate email");
  }

  const insights = await generateAIInsights(validated.body);
  const enrichedData = { ...validated.body, insights };

  const contact = await ContactsRepository.createContact({ ...enrichedData, userId });

  // ❌ More business logic
  await scheduleWelcomeEmail(contact.id);
  await updateUserMetrics(userId, "contact_created");

  return api.success({ item: contact });
});
```

**Solution**: Delegate to service layer

```typescript
// ✅ FIXED - Thin route handler
export const POST = createRouteHandler({
  auth: true,
  validation: { body: CreateContactDTOSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contact_create", requestId);

  try {
    // ✅ Service handles all business logic
    const contact = await contactService.createContact(userId, validated.body);
    return api.success({ item: contact }, undefined, 201);
  } catch (error) {
    return api.error("Failed to create contact", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// Service layer handles business logic
export async function createContact(userId: string, data: CreateContactDTO): Promise<ContactDTO> {
  // Check for duplicates
  if (data.primaryEmail) {
    const existing = await ContactsRepository.findContactByEmail(userId, data.primaryEmail);
    if (existing) {
      throw new Error("Contact with this email already exists");
    }
  }

  // Generate insights
  const insights = await generateAIInsights(data);
  const enrichedData = { ...data, insights };

  // Create contact
  const contact = await ContactsRepository.createContact({ ...enrichedData, userId });

  // Trigger side effects
  await scheduleWelcomeEmail(contact.id);
  await updateUserMetrics(userId, "contact_created");

  return contact;
}
```

## Migration Patterns

### From Legacy Response Pattern to ApiResponseBuilder

**Before** (legacy pattern):

```typescript
// ❌ Old pattern - Manual response handling
export async function GET(req: Request) {
  try {
    const userId = await getServerUserId();
    const url = new URL(req.url);
    const search = url.searchParams.get('search');

    const contacts = await listContactsService(userId, { search });

    return Response.json({
      success: true,
      data: contacts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to fetch contacts',
      details: error.message
    }, { status: 500 });
  }
}
```

**After** (using ApiResponseBuilder):

```typescript
// ✅ New pattern - ApiResponseBuilder
export const GET = createRouteHandler({
  auth: true,
  validation: {
    query: z.object({
      search: z.string().optional(),
    }),
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("contacts_list", requestId);

  try {
    const contacts = await listContactsService(userId, validated.query);
    return api.success({ items: contacts });
  } catch (error) {
    return api.error("Failed to fetch contacts", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
```

### Step-by-Step Migration Guide

1. **Replace Manual Route Functions**

   ```typescript
   // Replace export async function with createRouteHandler
   export const GET = createRouteHandler({ /* config */ })(async ({ }) => {});
   ```

2. **Add Proper Validation**

   ```typescript
   validation: {
     query: QuerySchema,
     body: BodySchema,
     params: ParamsSchema,
   }
   ```

3. **Use ApiResponseBuilder**

   ```typescript
   const api = new ApiResponseBuilder("operation_name", requestId);
   return api.success(data);
   ```

4. **Move Business Logic to Services**

   ```typescript
   const result = await serviceFunction(userId, validatedData);
   ```

5. **Handle Errors Properly**

   ```typescript
   catch (error) {
     return api.error("User message", "ERROR_CODE", undefined, ensureError(error));
   }
   ```

## Troubleshooting

### Common Issues and Solutions

**Issue**: "CSRF token mismatch" errors on POST requests
**Solution**: Ensure `x-csrf-token` header is included in all mutating requests

**Issue**: Route handler not receiving userId parameter
**Solution**: Add `auth: true` to createRouteHandler configuration

**Issue**: Validation errors not providing helpful messages
**Solution**: Use descriptive error messages in Zod schemas and proper error handling

**Issue**: Routes returning 500 errors without clear cause
**Solution**: Use `ensureError()` utility and ApiResponseBuilder for consistent error logging

**Issue**: TypeScript errors with request/response types
**Solution**: Ensure proper validation schemas and use provided types from createRouteHandler

This comprehensive API route patterns guide ensures consistent, secure, and maintainable HTTP endpoints across the OmniCRM application.
