/**
 * =================================================================
 * SINGLE SOURCE OF TRUTH for Omni-Connect Module Types
 * =================================================================
 * This file consolidates all shared types for the email connection
 * and intelligence dashboard. It is provider-agnostic where possible.
 */

// --- Provider-Agnostic Core Types ---

export interface ConnectConnectionStatus {
  isConnected: boolean;
  emailCount?: number;
  contactCount?: number;
  lastSync?: string;
  error?: string;
  expiryDate?: string | undefined;
  hasRefreshToken?: boolean | undefined;
  autoRefreshed?: boolean | undefined;
  service?: string | undefined; // 'gmail' | 'unified' | 'auth'
}

export interface Job {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number;
  message?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number;
  processedEmails?: number;
  newEmails?: number;
  chunkSize?: number;
  chunksTotal?: number;
  chunksProcessed?: number;
}

// --- Email-Specific Types (Can be used by Gmail, Outlook, etc.) ---

export interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  to?: string[];
  date: string;
  snippet: string;
  hasAttachments: boolean;
  labels: string[]; // For Gmail, this is labels; for Outlook, it could be categories.
}

export interface PreviewRange {
  from: string;
  to: string;
}

export interface SearchResult {
  subject: string;
  date: string;
  snippet: string;
  similarity: number;
  contactInfo?: {
    displayName?: string;
  };
}

// --- AI & Intelligence Types ---

export interface ContactData {
  displayName?: string;
  email: string;
  emailCount: number;
}

export interface EmailInsights {
  patterns?: string[];
  emailVolume?: {
    total: number;
    thisWeek: number;
    trend: "up" | "down" | "stable";
  };
  topContacts?: ContactData[];
}

export interface WeeklyDigest {
  id: string;
  title: string;
  date: string;
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  topContacts: string[];
  emailVolume: number;
  // Extended properties from lib/types
  weekStart?: string;
  weekEnd?: string;
  insights?: DigestInsight[];
  status?: "generating" | "ready" | "error";
  createdAt?: string;
}

export interface DigestInsight {
  category: "marketing" | "business" | "wellness" | "client";
  title: string;
  summary: string;
  sourceEmails: number;
  actionItems: string[];
  confidence: number;
}

export interface MarketingWikiItem {
  id: string;
  title: string;
  category: "strategy" | "content" | "automation" | "analytics";
  summary: string;
  tags: string[];
  dateAdded: string;
}

export interface TemplateStats {
  totalTemplates: number;
  recentlyUsed: number;
  draftsInProgress: number;
  activeSequences: number;
}

// --- Unified Dashboard State Type ---

/**
 * Defines the complete data structure for the Omni-Connect dashboard.
 * This is the expected return type from the `useOmniConnect` hook.
 */
export interface ConnectDashboardState {
  connection: ConnectConnectionStatus;

  // Configuration status for first-time setup flow
  hasConfiguredSettings?: boolean;

  // Comprehensive sync status
  syncStatus?: {
    googleConnected: boolean;
    serviceTokens: {
      google: boolean; // For backward compatibility
      gmail: boolean;
      calendar: boolean;
      unified: boolean;
    };
    flags: {
      gmail: boolean;
      calendar: boolean;
    };
    lastSync: {
      gmail: string | null;
      calendar: string | null;
    };
    lastBatchId: string | null;
    grantedScopes: {
      gmail: unknown;
      calendar: unknown;
    };
    jobs: {
      queued: number;
      done: number;
      error: number;
    };
    embedJobs: {
      queued: number;
      done: number;
      error: number;
    };
  };

  jobs: {
    active: Job[];
    summary: {
      queued: number;
      running: number;
      completed: number;
      failed: number;
    };
    currentBatch?: string | null;
    totalEmails?: number;
    processedEmails?: number;
  } | null;

  emailPreview: {
    emails: EmailPreview[];
    range: PreviewRange | null;
    previewRange?: PreviewRange | null; // Backward compatibility
  };

  // Future-facing data for the dashboard
  weeklyDigest?: WeeklyDigest | null;
  marketingWikiCount?: number;
  wikiInsightsCount?: number; // Backward compatibility
  templateStats?: TemplateStats | null;
}

// --- Backward Compatibility Types ---

/**
 * @deprecated Use ConnectConnectionStatus instead
 */
export interface GmailConnectionStatus {
  isConnected: boolean;
  lastSync?: string;
  emailCount?: number;
  contactCount?: number;
  error?: string;
}

/**
 * @deprecated Use ConnectConnectionStatus instead
 */
export interface GmailStats {
  emailsProcessed: number;
  suggestedContacts: number;
  lastSync: string | null;
  isConnected: boolean;
}

/**
 * @deprecated Use Job instead
 */
export interface JobStatusResponse {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number;
  message?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number;
  processedEmails?: number;
  newEmails?: number;
  chunkSize?: number;
  chunksTotal?: number;
  chunksProcessed?: number;
}

/**
 * @deprecated Use ConnectDashboardState.jobs instead
 */
export interface JobStatus {
  jobs: JobStatusResponse[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
}

/**
 * @deprecated Use EmailInsights instead
 */
export interface Insights {
  patterns?: string[];
  topContacts?: Array<{
    displayName?: string;
    email: string;
    emailCount: number;
  }>;
}

/**
 * @deprecated Use ConnectDashboardState instead
 */
export interface OmniConnectDashboardState extends ConnectDashboardState {
  activeJobs: {
    jobs: JobStatusResponse[];
    currentBatch: string | null;
    totalEmails?: number;
    processedEmails?: number;
  };
}
