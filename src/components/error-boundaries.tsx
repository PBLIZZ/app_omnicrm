/**
 * Comprehensive Error Boundary System
 * Catches and handles React errors at different component levels
 */

"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { toast } from "sonner";
import { logger } from "../lib/observability/unified-logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  level: "app" | "page" | "component";
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReload?: boolean;
  title?: string;
}

/**
 * Base Error Boundary Component
 */
export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error with full context
    void logger.error(
      "React Error Boundary caught error",
      {
        operation: `${this.props.level}_error_boundary`,
        component: this.constructor.name,
        additionalData: {
          errorId: this.state.errorId,
          componentStack: errorInfo.componentStack,
        },
      },
      error,
    );

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private handleReload = (): void => {
    this.setState({
      hasError: false,
      errorId: this.generateErrorId(),
    });
  };

  private handleGoHome = (): void => {
    window.location.href = "/";
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Level-specific error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI(): ReactNode {
    const { level, showReload = true, title } = this.props;
    const { error, errorId } = this.state;

    const titles = {
      app: "Application Error",
      page: "Page Error",
      component: "Component Error",
    };

    const descriptions = {
      app: "The application encountered an unexpected error. Please reload the page.",
      page: "This page encountered an error. You can try reloading or return to the home page.",
      component: "A component failed to load properly. This might be a temporary issue.",
    };

    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">{title ?? titles[level]}</CardTitle>
            </div>
            <CardDescription>{descriptions[level]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === "development" && error && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>Error ID:</strong> {errorId}
                <br />
                <strong>Error:</strong> {error.message}
              </div>
            )}

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              {showReload && (
                <Button onClick={this.handleReload} className="flex-1" variant="default">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}

              {level === "app" && (
                <Button onClick={this.handleGoHome} className="flex-1" variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * App-level error boundary - catches all unhandled errors
 */
export function AppErrorBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <BaseErrorBoundary
      level="app"
      title="Something went wrong"
      onError={(error, errorInfo) => {
        // Critical app-level error
        void logger.critical(
          "App-level error boundary triggered",
          {
            operation: "app_error_boundary",
            additionalData: {
              componentStack: errorInfo.componentStack,
            },
          },
          error,
        );

        // Show toast for user awareness
        toast.error("Application Error", {
          description: "The application encountered an error. Please reload the page.",
          duration: 10000,
        });
      }}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Page-level error boundary - catches page-specific errors
 */
export function PageErrorBoundary({
  children,
  pageName,
}: {
  children: ReactNode;
  pageName?: string;
}): React.JSX.Element {
  return (
    <BaseErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        void logger.error(
          "Page-level error boundary triggered",
          {
            operation: "page_error_boundary",
            ...(pageName && { component: pageName }),
            additionalData: {
              ...(pageName && { pageName }),
              ...(errorInfo.componentStack && { componentStack: errorInfo.componentStack }),
            },
          },
          error,
        );
      }}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Component-level error boundary - catches component-specific errors
 */
export function ComponentErrorBoundary({
  children,
  componentName,
  fallback,
}: {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
}): React.JSX.Element {
  return (
    <BaseErrorBoundary
      level="component"
      fallback={fallback}
      showReload={false}
      onError={(error, errorInfo) => {
        void logger.warn(
          "Component-level error boundary triggered",
          {
            operation: "component_error_boundary",
            ...(componentName && { component: componentName }),
            additionalData: {
              ...(componentName && { componentName }),
              ...(errorInfo.componentStack && { componentStack: errorInfo.componentStack }),
            },
          },
          error,
        );
      }}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Async boundary for Suspense fallbacks
 */
export function AsyncBoundary({
  children,
  fallback: _fallback,
  errorFallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
  errorFallback?: ReactNode;
}): React.JSX.Element {
  // Note: _fallback parameter is intentionally unused as AsyncBoundary uses ComponentErrorBoundary's fallback mechanism
  void _fallback; // Explicitly mark as used
  return (
    <ComponentErrorBoundary fallback={errorFallback}>
      <div>{children}</div>
    </ComponentErrorBoundary>
  );
}

/**
 * HOC for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    level?: "page" | "component";
    componentName?: string;
    fallback?: ReactNode;
  } = {},
): React.ComponentType<P> {
  const WrappedComponent = (props: P): React.JSX.Element => {
    const { level = "component", componentName, fallback } = options;

    if (level === "page") {
      return (
        <PageErrorBoundary {...(componentName && { pageName: componentName })}>
          <Component {...props} />
        </PageErrorBoundary>
      );
    }

    return (
      <ComponentErrorBoundary
        componentName={componentName ?? Component.displayName ?? Component.name}
        fallback={fallback}
      >
        <Component {...props} />
      </ComponentErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
}
