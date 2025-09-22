// src/lib/observability/index.ts
// Minimal, unified observability exports with pragmatic shims to avoid breakage.

export { logger } from "@/lib/observability/unified-logger";

// We simplified to a single boundary + app wrapper.
import { AppErrorBoundary, ErrorBoundary } from "@/components/error-boundaries";

export { AppErrorBoundary, ErrorBoundary };

// --- Shims (keep the build green). These map old names to the new boundary.
// You can rip these out later once call-sites are updated.
export const PageErrorBoundary = ErrorBoundary;
export const ComponentErrorBoundary = ErrorBoundary;
export const AsyncBoundary = ErrorBoundary;

// Minimal HOC shim to satisfy existing imports; just wraps with ErrorBoundary.
import type { ComponentType } from "react";
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? "Anon"})`;
  return Wrapped;
}
