# Error Handling & Observability Strategy

## 1. Philosophy

Our approach to error handling is foundational, not an afterthought. It is designed to be **proactive, layered, and developer-friendly**. The goal is to build a resilient application that gracefully handles failures, provides a good user experience even when things go wrong, and gives developers the precise information they need to fix bugs quickly.

This system is built on four core principles:

- **Never Lose an Error:** Every error, whether on the client or server, must be captured and reported.
- **Fail Gracefully:** A failure in one part of the UI should not crash the entire application.
- **Provide Clear Context:** Logs are not just messages; they are structured reports that tell us what happened, where, and why.
- **Standardize Everything:** We use consistent patterns for handling, logging, and responding to errors across the entire codebase.

## Overview

This codebase implements a comprehensive 5-layer error handling and observability system designed to provide robust error management, structured logging, and user experience optimization. The system follows security-first principles and provides different handling strategies based on error context and severity.

## 2. The Layers of Defense

Our system is a series of safety nets. When an error occurs, it falls through these layers until one is designed to catch it.

### Architecture: 5 Layers of Error Handling

### Layer 1: Global Application Error Boundary

**Location**: `src/app/global-error.tsx`  
**Purpose**: Catches catastrophic application-wide errors that would otherwise crash the entire app  
**Scope**: Root-level React errors, critical system failures

```tsx
// Catches unhandled React errors at the application root
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    logger.critical("Global application error", {
      error,
      category: "system",
      operation: "app-render",
      context: { userAgent: navigator.userAgent },
    });
  }, [error]);

  return (
    <html>
      <body>Something went wrong!</body>
    </html>
  );
}
```

**Current Status**: ✅ **Upgraded** - Now uses unified logger with critical severity

### Layer 2: Route-Level Error Boundaries (Next.js Route Boundaries)

**Location**: `src/app/(authorisedRoute)/*/error.tsx`  
**Purpose**: The main safety net for an entire page or route segment. Handles page-specific errors with contextual recovery options  
**Scope**: Route-level failures, page loading errors, component tree failures

> **How it Works:** If an unhandled error occurs during the render of a route, Next.js automatically finds the nearest `error.tsx` file in the directory tree. This file renders a full-page fallback UI and provides a `reset` button for the user to try again. **Our responsibility here is to use our logger to report the error.**

```tsx
// Example: contacts/error.tsx
export default function Error({ error, reset }) {
  useEffect(() => {
    logger.error("Contacts page render failed", {
      error,
      category: "ui",
      operation: "contacts-list-render",
      context: { route: "/contacts" },
    });
  }, [error]);

  return <div>Failed to load contacts</div>;
}
```

**Current Status**: ✅ **Upgraded** - Now uses unified logger with structured context

### Layer 3: Component Error Boundaries (React Component Boundaries)

**Location**: `src/components/error-boundaries.tsx`  
**Purpose**: This layer isolates rendering errors within a specific component, preventing a single broken widget from taking down an entire page. Granular error handling for individual components with recovery mechanisms  
**Scope**: Component-specific failures, UI rendering errors

> **How it Works:** We wrap specific, non-critical components (e.g., a complex data chart) with our custom `<ComponentErrorBoundary>`. If that component throws a rendering error, the boundary catches it, logs the error, and displays a localized fallback UI in its place, leaving the rest of the page interactive.

```tsx
// Already integrated with unified logger
export function ComponentErrorBoundary({ children, componentName }) {
  return (
    <BaseErrorBoundary
      level="component"
      onError={(error, errorInfo) => {
        logger.warn(
          "Component-level error boundary triggered",
          {
            operation: "component_error_boundary",
            component: componentName,
            additionalData: { componentStack: errorInfo.componentStack },
          },
          error,
        );
      }}
    >
      {children}
    </BaseErrorBoundary>
  );
}
```

**Current Status**: ✅ Fully integrated with unified logger

### Layer 4: API Route Error Handling (Server-Side)

**Location**: `src/server/utils/api-helpers.ts`, all API routes  
**Purpose**: This is the safety net for our backend API endpoints. Server-side error handling with standardized responses and security sanitization  
**Scope**: API endpoint failures, database errors, external service failures

> **How it Works:** All logic within our API Route Handlers is wrapped in a `try...catch` block. The `catch` block uses server-side helpers to log a detailed error and return a standardized JSON error envelope with the correct HTTP status code.

```typescript
// Standardized API responses with security sanitization
export function err(status: number, error: string, details?: Record<string, unknown>) {
  const sanitizedError = sanitizeErrorMessage(error, status);

  if (status >= 500) {
    // Generic message for server errors to prevent internal details leakage
    return "Internal server error";
  }

  if (status >= 400) {
    // Remove sensitive patterns from client errors
    error = error.replace(/\btable\s+"[^"]+"/gi, 'table "[REDACTED]"');
    error = error.replace(/\/[^\s]+\.(ts|js|json|env)/gi, "[PATH_REDACTED]");
    error = error.replace(/\b[A-Z][A-Z0-9_]*_[A-Z0-9_]+\b/g, "[ENV_VAR]");
    return error.split("\n")[0]; // Only first line, no stack traces
  }

  return error;
}
```

**Current Status**: ⚠️ Validation enforcement needed across all routes

### Layer 5: Data Validation & Imperative Handling

**Location**: `src/lib/validation/schemas/*`, throughout application code, hooks, services  
**Purpose**: This is our first line of defense, preventing malformed data from ever entering our system. Also handles anticipated errors within our application logic, like a failed network request  
**Scope**: Form validation, API call failures, user input errors, data validation

> **How it Works:** We use Zod schemas to define the expected shape of all data. If validation fails, Zod throws a predictable error, which we can catch immediately and show the user a helpful message. For async operations, we wrap them in `try...catch` blocks that call our client-side error handler for user-friendly toast notifications.

```typescript
// Comprehensive error handling with user feedback
export const logger = {
  userError(title: string, error?: Error, context?: ErrorContext) {
    if (this.isClient) {
      toast.error(title, { description: error?.message });
    }
    console.error(`${title}:`, error); // Technical details for developers
    this.log("error", "ui", title, context, error);
  },
};
```

**Current Status**: ✅ Fully implemented with structured logging

## Error Classification System

The system uses a sophisticated error classification matrix that determines appropriate responses based on error type and context:

### Security Classifications

- **CRITICAL**: `SECURITY_BREACH`, `DATABASE_CORRUPTION`
- **ERROR**: `API_FAILURE`, `AUTH_FAILURE`
- **WARN**: `INTEGRATION_DEGRADED`, `VALIDATION_FAILED`
- **INFO**: `SYNC_COMPLETED`
- **DEBUG**: `DEBUG_INFO`

### Response Actions

Each classification defines:

- **User Notifications**: Toast visibility and type
- **Logging Strategy**: Console, file, and metrics tracking
- **Team Alerts**: When to notify development team
- **Security Handling**: Silent logging for security threats

```typescript
// Example: API failures show user toast + log for developers
API_FAILURE: {
  severity: 'error',
  category: 'api',
  action: {
    showToast: true,        // User sees error
    logToConsole: true,     // Developers see details
    logToFile: true,        // Persistent logging
    alertTeam: false,       // No immediate alert
    trackMetrics: true,     // Analytics tracking
    toastType: 'error',
    toastTitle: 'Request Failed'
  }
}
```

## Server-Side API Error Handling

### Security-First Error Sanitization

The API layer implements comprehensive error sanitization to prevent information disclosure:

```typescript
function sanitizeErrorMessage(error: string, status: number): string {
  if (status >= 500) {
    // Generic message for server errors to prevent internal details leakage
    return "Internal server error";
  }

  if (status >= 400) {
    // Remove sensitive patterns from client errors
    error = error.replace(/\btable\s+"[^"]+"/gi, 'table "[REDACTED]"');
    error = error.replace(/\/[^\s]+\.(ts|js|json|env)/gi, "[PATH_REDACTED]");
    error = error.replace(/\b[A-Z][A-Z0-9_]*_[A-Z0-9_]+\b/g, "[ENV_VAR]");
    return error.split("\n")[0]; // Only first line, no stack traces
  }

  return error;
}
```

### Standardized Response Format

All API routes use consistent response structures:

```typescript
// Success Response
interface OkResponse<T> {
  ok: true;
  data: T;
  message?: string;
  timestamp: string;
}

// Error Response
interface ErrorResponse {
  ok: false;
  error: string; // Sanitized error message
  code?: string; // Standardized error code
  details?: unknown; // Only in development/4xx errors
  timestamp: string;
  requestId?: string; // For correlation
}
```

### API Route Middleware

The system provides composable middleware for common patterns:

```typescript
// Authentication + Validation + Rate Limiting
export const GET = createRouteHandler({
  auth: true,
  validation: { query: GetContactsSchema },
  rateLimit: { maxRequests: 100, windowMs: 60000 },
})(async ({ userId, validated, requestId }, request) => {
  // Handler implementation with guaranteed auth + validation
});
```

## Logging Patterns

### Decision Matrix

The system follows a clear decision matrix for logging choices:

| Scenario                           | User Initiated? | User Needs to Know? | Pattern                             |
| ---------------------------------- | --------------- | ------------------- | ----------------------------------- |
| AI insight generation              |                 |                     | `toast.info()` → `toast.success()`  |
| AI insight failed                  |                 |                     | `toast.error()` + `console.error()` |
| Background email processing failed |                 |                     | `logger.debug()` only               |
| Network connection lost            |                 |                     | `toast()` warning                   |
| Invalid API response               |                 |                     | `logger.debug()` only               |

### Security Logging

Security events receive special handling:

```typescript
// Security threats - NEVER show to users
logger.security("SQL injection attempt detected", { query, ip });
// → Silent logging only, no user notification
// → Secure log file + team alerting
// → Never exposed in browser console
```

### User-Facing vs Technical Logging

The system clearly separates user-facing notifications from technical logging:

```typescript
// User sees: "Failed to generate insights"
// Developer sees: Full error details, stack trace, context
userErrors.show("Failed to generate insights", technicalError);
```

## Integration Points

### Toast Notifications (Sonner)

- **Success**: `toast.success()` for completed user actions
- **Info**: `toast.info()` for progress updates
- **Warning**: `toast()` for user warnings
- **Error**: `toast.error()` for user-facing failures

### Structured Logging

All logs include structured context:

```typescript
logger.error(
  "Operation failed",
  {
    operation: "contact_sync",
    component: "ContactService",
    userId: "user_123",
    requestId: "req_456",
    additionalData: { contactCount: 150 },
  },
  error,
);
```

### Error Boundaries Integration

Components can be wrapped with appropriate error boundaries:

```typescript
// HOC pattern
export default withErrorBoundary(MyComponent, {
  level: "component",
  componentName: "ContactList"
});

// Direct usage
<ComponentErrorBoundary componentName="ContactForm">
  <ContactForm />
</ComponentErrorBoundary>
```

## Current Status & Planned Upgrades

### Completed

- Unified logging system with error classification
- Component error boundaries with structured logging
- API response standardization with security sanitization
- Comprehensive error classification matrix
- Security-conscious error handling patterns

### Pending Upgrades

#### 1. Error.tsx Logger Integration

**Status**: Completed  
**Scope**: Replace `console.error` with unique logger instances in:

- `src/app/global-error.tsx`
- `src/app/(authorisedRoute)/contacts/error.tsx`
- `src/app/(authorisedRoute)/contacts/[id]/error.tsx`

```typescript
// Current (to be upgraded)
console.error("Route error:", error);

// Target pattern
const routeLogger = logger.createScope("route_error");
routeLogger.error(
  "Route error occurred",
  {
    operation: "route_error_boundary",
    route: "/contacts/[id]",
  },
  error,
);
```

#### 2. API Route Validation Enforcement

**Status**: Scheduled  
**Scope**: Ensure all API routes use validation middleware

```typescript
// Target pattern for all API routes
export const POST = withApiResponse("create-contact")(
  withValidation({ body: CreateContactSchema })(async (apiResponse, { validated }) => {
    // Guaranteed validated input
  }),
);
```

## Usage Examples

### Quick Setup for New Components

```typescript
import { ComponentErrorBoundary, logger } from '@/lib/observability';

function MyComponent() {
  const handleAction = async () => {
    try {
      await performAction();
      logger.success('Action completed successfully');
    } catch (error) {
      logger.userError('Action failed', error);
    }
  };

  return (
    <ComponentErrorBoundary componentName="MyComponent">
      <button onClick={handleAction}>Perform Action</button>
    </ComponentErrorBoundary>
  );
}
```

### API Route Setup

```typescript
import { withApiResponse, ApiResponseBuilder } from "@/lib/observability";

export const GET = withApiResponse("get-contacts")(async (apiResponse) => {
  try {
    const contacts = await getContacts();
    return apiResponse.success(contacts);
  } catch (error) {
    return apiResponse.databaseError("Failed to fetch contacts", error);
  }
});
```

### Error Classification Usage

```typescript
import { logger, ERROR_CLASSIFICATION } from "@/lib/observability";

// Automatic classification and appropriate response
await logger.withErrorHandling(
  () => syncContacts(),
  { operation: "contact_sync" },
  {
    classification: "API_FAILURE",
    showUserError: true,
    fallbackValue: [],
  },
);
```

## Development Validation

The system includes development-time validation:

```typescript
import { validateObservabilitySetup } from "@/lib/observability";

// In development, validates system setup
validateObservabilitySetup();
// → Logs system status and validates configuration
```

## Best Practices

1. **Always use structured logging** with operation context
2. **Never expose server errors** to client (sanitization is automatic)
3. **Use appropriate error boundaries** for component isolation
4. **Follow the decision matrix** for user notification choices
5. **Security events are silent** - never notify users of security issues
6. **Validate all API inputs** using the middleware system
7. **Use correlation IDs** for request tracing across layers

This observability system provides comprehensive error handling while maintaining security, user experience, and developer productivity. The layered approach ensures appropriate error handling at each level of the application stack.
