# Logging Standards & Best Practices

## 🎯 Unified Logging Strategy

This document establishes the standardized logging approach across the entire codebase to ensure consistency, observability, and maintainability.

## 📋 Current State Assessment

### ✅ Unified Logger Design Intent

The `@/lib/observability` system provides:

- **Environment-aware routing**: Server-side uses structured console methods, client-side adds toast notifications
- **Structured logging**: Consistent format with operation context, timestamps, and correlation IDs
- **Security-conscious**: Silent logging for security events, masked user IDs for privacy
- **User experience integration**: Toast notifications for user-facing events
- **Error classification**: Standardized severity levels and categories

### ❌ Legacy Console Patterns (To Be Eliminated)

Direct console usage without context:

```typescript
// ❌ AVOID: No structure, no correlation, inconsistent formatting
console.error("Error:", error);
console.warn("Warning message");
```

## 🏆 Standardized Logging Patterns

### Server-Side API Routes (Required Standard)

```typescript
import { logger } from "@/lib/observability";

// ✅ PREFERRED: Structured info logging
await logger.info("Operation started", {
  operation: "api.endpoint.action",
  additionalData: {
    userId: userId.slice(0, 8) + "...", // Always mask user IDs
    requestId,
    relevantData,
  },
});

// ✅ PREFERRED: Error logging with full context
await logger.error(
  "Operation failed",
  {
    operation: "api.endpoint.action",
    additionalData: {
      userId: userId.slice(0, 8) + "...",
      errorCode,
      requestParams,
    },
  },
  error,
);

// ✅ PREFERRED: Warning with context
await logger.warn("Degraded functionality detected", {
  operation: "api.endpoint.action",
  additionalData: { fallbackUsed: true, reason: "external_service_down" },
});
```

### Client-Side Components

```typescript
import { logger } from "@/lib/observability";

// ✅ User-facing success (shows toast + logs)
logger.success("Contact saved successfully", "Your changes have been saved");

// ✅ User-facing error (shows error toast + logs)
logger.userError("Failed to save contact", error, {
  operation: "contacts.save",
  additionalData: { contactId, formData },
});

// ✅ Progress updates (shows info toast)
logger.progress("Syncing contacts...", "This may take a few moments");
```

### Security Events

```typescript
// ✅ Security logging (silent, no user notification)
await logger.security("Unauthorized access attempt", {
  operation: "auth.access_attempt",
  additionalData: {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    attemptedResource: req.url,
  },
});
```

## 🚫 When Console Logging is Acceptable

**Limited exceptions where direct console usage is permitted:**

1. **Development debugging** (temporary, must be removed before commit)
2. **System initialization** (startup logs, configuration validation)
3. **Critical system failures** where unified logger might not be available
4. **Third-party library integration** where structured logging isn't feasible

```typescript
// ✅ ACCEPTABLE: System initialization
if (process.env.NODE_ENV === "development") {
  console.warn("🔍 Development mode: Enhanced logging enabled");
}

// ✅ ACCEPTABLE: Critical system failure
try {
  await initializeLogger();
} catch (error) {
  console.error("CRITICAL: Logger initialization failed:", error);
  process.exit(1);
}
```

## 📊 Migration Priority

### High Priority (Immediate Fix Required)

- API routes with mixed console/logger patterns
- Security-sensitive endpoints using console.error
- User-facing operations without proper error handling

### Medium Priority (Next Sprint)

- Debug endpoints (can retain console for development)
- Internal service communications
- Background job processors

### Low Priority (Future Cleanup)

- Development utilities
- Test files
- Build scripts

## 🔧 Implementation Guidelines

### 1. Operation Naming Convention

Use dot notation for hierarchical operations:

```typescript
"api.contacts.create";
"sync.gmail.preview";
"auth.oauth.callback";
"jobs.process.email_intelligence";
```

### 2. User ID Masking

Always mask user IDs in logs for privacy:

```typescript
userId: userId.slice(0, 8) + "...";
```

### 3. Error Context

Include relevant context for debugging:

```typescript
additionalData: {
  requestId,
  userAgent: req.headers["user-agent"],
  endpoint: req.url,
  method: req.method
}
```

### 4. Async Logging

Use await for server-side logging to ensure proper sequencing:

```typescript
await logger.error("Database connection failed", context, error);
```

## 🎯 Benefits of Standardization

### For Developers

- **Consistent debugging experience** across all components
- **Structured search** through logs using operation names
- **Correlation tracking** via request IDs
- **Type safety** with TypeScript integration

### For Users

- **Clear feedback** through toast notifications
- **No technical jargon** in user-facing messages
- **Consistent UX** across all operations

### For Operations

- **Centralized monitoring** through structured logs
- **Security event tracking** with proper classification
- **Performance metrics** embedded in log context
- **Error aggregation** by operation and severity

## 🔄 Migration Checklist

- [ ] Replace `console.error()` with `logger.error()`
- [ ] Replace `console.warn()` with `logger.warn()`
- [ ] Replace `console.log()` with `logger.info()`
- [ ] Add operation context to all log calls
- [ ] Mask sensitive data (user IDs, tokens, etc.)
- [ ] Add proper error objects to error logs
- [ ] Implement user-facing toast notifications where appropriate
- [ ] Remove temporary debug console statements

## 📚 Related Documentation

- [Error Classification System](./error-classification.md)
- [API Response Standards](./api-response-standards.md)
- [Security Logging Guidelines](./security-logging.md)
