export interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  to?: string[];
  date: string;
  snippet: string;
  hasAttachments: boolean;
  labels: string[];
}

export interface ContactData {
  displayName?: string;
  email: string;
  emailCount: number;
}

export interface GmailConnectionStatus {
  isConnected: boolean;
  lastSync?: string | undefined;
  emailCount?: number;
  contactCount?: number;
  error?: string | undefined;
}

export interface GmailConnectionCardProps {
  onSettingsClick?: () => void;
  refreshTrigger?: number;
  // Props from parent's single useGmailSync hook instance
  isProcessingContacts: boolean;
  showSyncPreview: boolean;
  setShowSyncPreview: (show: boolean) => void;
  onApproveSync: () => void;
  onProcessContacts: () => void;
}

export interface JobStatus {
  jobs?: Array<{
    id?: string;
    kind?: string;
    status?: string;
  }>;
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

export interface GmailInsights {
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
}

export interface MarketingWikiItem {
  id: string;
  title: string;
  category: "strategy" | "content" | "automation" | "analytics";
  summary: string;
  tags: string[];
  dateAdded: string;
}
