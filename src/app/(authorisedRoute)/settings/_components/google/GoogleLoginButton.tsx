"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { GoogleLoginButtonProps, OAuthError, GoogleOAuthScope } from "./types";

/**
 * GoogleLoginButton - Handles Google OAuth flow with incremental authorization
 *
 * Features:
 * - Supports gmail and calendar scopes
 * - Comprehensive error handling and logging
 * - Toast notifications for user feedback
 * - Loading states and disabled states
 * - Follows existing design system patterns
 */
export function GoogleLoginButton({
  scope = "gmail",
  onError,
  disabled,
  className,
  variant = "outline",
  size = "default",
  children,
}: GoogleLoginButtonProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    setIsLoading(true);

    try {
      // Log the OAuth initiation
      logger.debug("Starting OAuth flow", { scope }, "GoogleLoginButton");

      toast.info(`Connecting to Google ${scope}...`, {
        description: "You'll be redirected to Google for authentication",
      });

      // Redirect to our OAuth endpoint
      const oauthUrl = `/api/google/oauth?scope=${scope}`;

      // Store current URL for potential return navigation
      const currentUrl = window.location.href;
      sessionStorage.setItem("oauth_return_url", currentUrl);
      sessionStorage.setItem("oauth_scope", scope);
      sessionStorage.setItem("oauth_initiated_at", new Date().toISOString());

      logger.debug(
        "Redirecting to OAuth URL",
        { oauthUrl, returnUrl: currentUrl, scope },
        "GoogleLoginButton",
      );

      // Perform the redirect
      window.location.href = oauthUrl;
    } catch (error: unknown) {
      const oauthError: OAuthError = {
        code: "oauth_initiation_failed",
        message: error instanceof Error ? error.message : "Failed to initiate Google OAuth flow",
        details: {
          scope,
          originalError: error instanceof Error ? error.message : String(error),
          userAgent: navigator.userAgent,
        },
        timestamp: new Date(),
      };

      logger.error("OAuth initiation failed", oauthError, "GoogleLoginButton");

      toast.error("Authentication failed", {
        description: oauthError.message,
      });

      onError?.(oauthError);
      setIsLoading(false);
    }
  };

  const getScopeDisplayName = (scope: GoogleOAuthScope): string => {
    switch (scope) {
      case "gmail":
        return "Gmail";
      case "calendar":
        return "Google Calendar";
      default:
        return "Google";
    }
  };

  const getScopeDescription = (scope: GoogleOAuthScope): string => {
    switch (scope) {
      case "gmail":
        return "Read-only access to your Gmail messages";
      case "calendar":
        return "Read-only access to your Google Calendar events";
      default:
        return "Access to your Google account";
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleLogin}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className={cn("relative", isLoading && "cursor-not-allowed", className)}
        aria-label={`Connect ${getScopeDisplayName(scope)} account`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
        <div className={cn("flex items-center gap-2", isLoading && "opacity-0")}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {children ?? `Connect ${getScopeDisplayName(scope)}`}
        </div>
      </Button>

      <p className="text-xs text-muted-foreground">{getScopeDescription(scope)}</p>
    </div>
  );
}

/**
 * Hook to detect OAuth callback completion
 * Useful for showing success messages or refreshing state after OAuth flow
 */
export function useOAuthCallback(): { isComplete: boolean } {
  const [isComplete, setIsComplete] = useState(false);

  React.useEffect(() => {
    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get("connected");
    const error = urlParams.get("error");

    if (connected === "google") {
      const initiatedScope = sessionStorage.getItem("oauth_scope") as GoogleOAuthScope;
      const returnUrl = sessionStorage.getItem("oauth_return_url");

      logger.info(
        "OAuth completed successfully",
        {
          scope: initiatedScope,
          returnUrl,
          timestamp: new Date().toISOString(),
        },
        "useOAuthCallback",
      );

      toast.success("Successfully connected to Google!", {
        description: initiatedScope
          ? `${initiatedScope} access granted`
          : "Authentication complete",
      });

      // Clean up session storage
      sessionStorage.removeItem("oauth_scope");
      sessionStorage.removeItem("oauth_return_url");
      sessionStorage.removeItem("oauth_initiated_at");

      setIsComplete(true);

      // Clean URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("connected");
      window.history.replaceState({}, "", newUrl.toString());
    }

    if (error) {
      const oauthError: OAuthError = {
        code: error,
        message: `OAuth failed: ${error}`,
        details: {
          url: window.location.href,
          referrer: document.referrer,
        },
        timestamp: new Date(),
      };

      logger.error("OAuth failed", oauthError, "useOAuthCallback");

      toast.error("Authentication failed", {
        description: `Error: ${error}`,
      });

      // Clean URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, []);

  return { isComplete };
}

// Make sure to import React for the useEffect hook
import React from "react";
