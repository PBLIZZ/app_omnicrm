/**
 * OmniConnect Component Types
 *
 * Types for omni-connect intelligence components
 */

/**
 * Email Preview
 */
export interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  labels: string[];
}

/**
 * Preview Range
 */
export interface PreviewRange {
  from: string;
  to: string;
}

/**
 * Marketing Wiki Item
 */
export interface MarketingWikiItem {
  id: string;
  title: string;
  summary: string;
  category: "strategy" | "content" | "automation" | "analytics";
  dateAdded: string;
}

/**
 * Weekly Digest
 */
export interface WeeklyDigest {
  id: string;
  title: string;
  date: string;
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  topContacts: string[];
  emailVolume: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Connect Intelligence Dashboard Props
 */
