/**
 * Google OAuth Components
 *
 * Comprehensive component system for testing Gmail sync functionality
 * with incremental authorization, error handling, and extensive logging
 */

export { GoogleLoginButton, useOAuthCallback } from "./GoogleLoginButton";
export { GmailSyncButton } from "./GmailSyncButton";
export {
  OAuthErrorBoundary,
  useOAuthErrorHandler,
  withOAuthErrorBoundary,
  OAuthConnectionErrorFallback,
} from "./OAuthErrorBoundary";

export type {
  GoogleOAuthScope,
  OAuthError,
  OAuthState,
  GoogleOAuthResponse,
  SyncStatus,
  GoogleLoginButtonProps,
  GmailSyncButtonProps,
  OAuthErrorBoundaryProps,
  SyncPreview,
  LogEntry,
} from "./types";
