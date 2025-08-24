import { NextResponse } from "next/server";
import { log } from "@/server/log";

type ErrorShape = {
  ok: false;
  error: string;
  details?: Record<string, unknown> | null;
};

type OkShape<T> = {
  ok: true;
  data: T;
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<OkShape<T>> {
  const body: OkShape<T> = { ok: true, data };
  // eslint-disable-next-line no-restricted-syntax
  return NextResponse.json(body, init);
}

// SECURITY: Sanitize error messages to prevent information disclosure
function sanitizeErrorMessage(error: string, status: number): string {
  // For 5xx errors, return generic message to prevent internal details leakage
  if (status >= 500) {
    // Allow specific safe server errors but default to generic
    const safeServerErrors = [
      "Server misconfigured",
      "Service temporarily unavailable", 
      "Database connection failed",
      "External service unavailable"
    ];
    
    if (safeServerErrors.some(safe => error.includes(safe))) {
      return error;
    }
    return "Internal server error";
  }
  
  // For 4xx errors, sanitize sensitive patterns
  if (status >= 400) {
    // Remove database schema information
    error = error.replace(/\btable\s+"[^"]+"/gi, 'table "[REDACTED]"');
    error = error.replace(/\bcolumn\s+"[^"]+"/gi, 'column "[REDACTED]"');
    
    // Remove file paths
    error = error.replace(/\/[^\s]+\.(ts|js|json|env)/gi, '[PATH_REDACTED]');
    
    // Remove SQL error details
    error = error.replace(/\bSQL[^:]*:\s*[^\n]+/gi, 'SQL: [QUERY_REDACTED]');
    
    // Remove stack traces from client-facing errors
    const firstLine = error.split('\n')[0];
    error = firstLine ?? error; // Only first line, fallback to original if split fails
    
    // Remove environment variable names
    error = error.replace(/\b[A-Z][A-Z0-9_]*_[A-Z0-9_]+\b/g, '[ENV_VAR]');
    
    return error;
  }
  
  return error;
}

export function err(
  status: number,
  error: string,
  details?: Record<string, unknown> | null,
  logBindings?: Record<string, unknown>,
): NextResponse<ErrorShape> {
  // SECURITY: Log the full error details but sanitize the client response
  const sanitizedError = sanitizeErrorMessage(error, status);
  
  if (status >= 500) {
    log.error({ 
      status, 
      originalError: error, // Full error for server logs
      sanitizedError,
      details,
      ...logBindings 
    });
  } else if (status >= 400) {
    log.warn({ 
      status, 
      originalError: error,
      sanitizedError,
      details,
      ...logBindings 
    });
  }
  
  // SECURITY: Only return sanitized error to client
  const payload: ErrorShape = { 
    ok: false, 
    error: sanitizedError, 
    ...(status >= 500 ? {} : details ? { details } : { details: null }) // Never leak server error details to client
  };
  
  // eslint-disable-next-line no-restricted-syntax
  return NextResponse.json(payload, { status });
}

export function safeJson<T>(req: Request): Promise<T | undefined> {
  return req.json().catch(() => undefined);
}
