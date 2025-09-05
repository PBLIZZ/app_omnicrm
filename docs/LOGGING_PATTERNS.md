# Logging Patterns and Best Practices

## Overview

This document defines consistent logging patterns for user-facing feedback vs developer debugging.

## Pattern Rules

### 1. User Progress/Status Messages

**Use:** `toast.info()` or `toast.success()`

```typescript
// User initiated action - show progress
toast.info("Generating AI insights...");
toast.success("Contact sync completed!");
```

### 2. User-Facing Errors

**Use:** `toast.error()` + `console.error()` for debugging

```typescript
// User tried to do something that failed
toast.error("Failed to generate insights");
console.error("AI insights error:", error); // For developers
```

### 3. Technical/Background Errors

**Use:** `logger.debug()` (dev console only)

```typescript
// Internal processing errors users shouldn't see
logger.debug("Failed to decode Gmail message part", error);
logger.debug("Invalid OpenRouter response format", responseData);
```

### 4. User-Facing Warnings

**Use:** `toast()` with appropriate variant

```typescript
// User should know about this
toast("Gmail sync may take longer than usual", {
  description: "Large mailbox detected",
});
```

### 5. Technical Warnings

**Use:** `console.warn()` (dev console only)

```typescript
// Developer should know, user shouldn't
console.warn("Deprecated API endpoint used:", endpoint);
```

## Decision Matrix

| Scenario                           | User Initiated? | User Needs to Know? | Pattern                             |
| ---------------------------------- | --------------- | ------------------- | ----------------------------------- |
| AI insight generation progress     | ✅              | ✅                  | `toast.info()`                      |
| AI insight generation failed       | ✅              | ✅                  | `toast.error()` + `console.error()` |
| Background email processing failed | ❌              | ❌                  | `logger.debug()`                    |
| Network connection lost            | ❌              | ✅                  | `toast.error()`                     |
| Invalid API response format        | ❌              | ❌                  | `logger.debug()`                    |
| Contact sync completed             | ✅              | ✅                  | `toast.success()`                   |

## Import Patterns

```typescript
// For user-facing feedback
import { toast } from "sonner";

// For technical debugging
import { logger } from "@/lib/logger";
```

## Examples

### ❌ Bad (shows technical errors to users)

```typescript
logger.error("Failed to decode Gmail message part", error); // User sees toast!
```

### ✅ Good (appropriate separation)

```typescript
// User-facing
toast.error("Failed to sync Gmail");
console.error("Gmail sync error:", error);

// Technical
logger.debug("Failed to decode message part", error);
```
