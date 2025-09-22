"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { logger } from "@/lib/observability";

/**
 * Creates a short, unique error id suitable for correlating UI errors in logs.
 */
function makeId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Props for the ErrorBoundary components.
 */
type Props = { children: ReactNode };

/**
 * Internal state tracked by the ErrorBoundary.
 * - `hasError`: toggles fallback UI
 * - `id`: unique error correlation id (logged + optionally displayed in dev)
 * - `error`: the caught error, only attached in error state
 */
type State = { hasError: boolean; id: string; error?: Error };

/**
 * # ErrorBoundary (minimal, production-ready)
 *
 * A **single** client-side error boundary that:
 * - Catches render/lifecycle errors in its subtree
 * - Logs them via the unified `logger` with operation metadata
 * - Shows a small, accessible fallback with “Try again” and “Home”
 * - Avoids leaking details in prod; shows basics in dev to speed debugging
 *
 * This keeps UI safety without over-engineering or multiple variants.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, id: makeId() };
  }

  /**
   * React lifecycle: invoked after an error is thrown by a descendant.
   * Returning state here triggers the fallback UI.
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, id: makeId() };
  }

  /**
   * React lifecycle: receive the error and component stack.
   * We log with sufficient context for observability/debugging.
   */
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void logger.error(
      "React error boundary",
      {
        operation: "ui.error_boundary",
        additionalData: {
          errorId: this.state.id,
          componentStack: info.componentStack,
        },
      },
      error,
    );
  }

  /**
   * Clears the error state so the subtree re-renders.
   * Useful when transient UI glitches occur.
   */
  private reset = (): void => {
    this.setState({ hasError: false, id: makeId() });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    // Minimal, accessible fallback UI.
    // In dev we show the id + error message to speed debugging.
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="mx-auto w-full max-w-md rounded-xl border p-4">
          <div className="mb-2 font-medium">Something went wrong.</div>

          {process.env.NODE_ENV === "development" && (
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
              id: {this.state.id}
              {this.state.error ? `\n${this.state.error.message}` : null}
            </pre>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded bg-black px-3 py-2 text-white"
              onClick={this.reset}
              aria-label="Try again"
            >
              Try again
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={() => (window.location.href = "/")}
              aria-label="Go to home page"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * # AppErrorBoundary
 *
 * Thin convenience wrapper for root usage (e.g., `app/layout.tsx`).
 * Keeps the pattern obvious across the codebase.
 */
export function AppErrorBoundary({ children }: Props): React.JSX.Element {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
