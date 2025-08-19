/**
 * TypeScript interfaces for Google OAuth components
 * Supports incremental authorization flow for Gmail sync functionality
 */

export type GoogleOAuthScope = "gmail" | "calendar";

export interface OAuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface OAuthState {
  isLoading: boolean;
  isConnected: boolean;
  error: OAuthError | null;
  lastConnectedScope?: GoogleOAuthScope;
}

export interface GoogleOAuthResponse {
  success: boolean;
  error?: string;
  redirectUrl?: string;
  scope?: GoogleOAuthScope;
}

export interface SyncStatus {
  googleConnected: boolean;
  flags?: {
    gmail?: boolean;
    calendar?: boolean;
  };
  lastSync?: {
    gmail?: string | null;
    calendar?: string | null;
  };
  jobs?: {
    queued: number;
    done: number;
    error: number;
  };
  lastBatchId?: string;
}

export interface GoogleLoginButtonProps {
  scope?: GoogleOAuthScope;
  onError?: (error: OAuthError) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

export interface GmailSyncButtonProps {
  onSyncStart?: (batchId: string) => void;
  onSyncError?: (error: OAuthError) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

export interface OAuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }> | undefined;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface SyncPreview {
  gmail?: {
    countByLabel: Record<string, number>;
    sampleSubjects: string[];
  };
  calendar?: {
    count: number;
    sampleTitles: string[];
  };
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  action: string;
  scope?: GoogleOAuthScope;
  details?: Record<string, unknown>;
}
