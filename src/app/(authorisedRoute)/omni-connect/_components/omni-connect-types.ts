export interface GmailStats {
  emailsProcessed: number;
  suggestedContacts: number;
  lastSync: string | null;
  isConnected: boolean;
}

export interface JobStatusResponse {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number | undefined;
  message?: string | undefined;
  batchId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number | undefined;
  processedEmails?: number | undefined;
  newEmails?: number | undefined;
  chunkSize?: number | undefined;
  chunksTotal?: number | undefined;
  chunksProcessed?: number | undefined;
}

export interface JobStatus {
  jobs: JobStatusResponse[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
}

export interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface SearchResult {
  subject: string;
  similarity: number;
  date: string;
  snippet: string;
  contactInfo?: {
    displayName: string;
  };
}

export interface Insights {
  patterns?: string[];
  topContacts?: Array<{
    displayName?: string;
    email: string;
    emailCount: number;
  }>;
}
