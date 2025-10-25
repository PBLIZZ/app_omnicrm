// Shared types for AI connect functionality

// Re-export types from business-schemas for convenience
export type {
  InboxProcessingResultDTO,
  InboxProcessingContext,
} from "@/server/db/business-schemas";

// EmailClassification moved to business-schemas to prevent duplication

export interface WeeklyDigestInsight {
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  trends: string[];
  periodStart: string;
  periodEnd: string;
  emailCount: number;
}

export interface EmailSummaryItem {
  id: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  receivedAt: string;
  category: string;
  importance: "low" | "medium" | "high";
  summary: string;
  keyPoints: string[];
}

export interface ContactWithContext {
  id: string;
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  lifecycleStage?: string | null;
  createdAt: string;
  updatedAt: string;
  // Context information
  recentInteractions?: Array<{
    id: string;
    type: string;
    subject?: string;
    occurredAt: string;
    bodyText?: string;
  }>;
  notes?: Array<{
    id: string;
    title?: string;
    content: string;
    createdAt: string;
  }>;
  interactionCount?: number;
  lastContactDate?: string;
}

export interface EmailIntelligence {
  classification: {
    primaryCategory: string;
    subCategory: string;
    confidence: number;
    businessRelevance: number;
    reasoning: string;
    extractedMetadata: {
      senderDomain?: string;
      hasAppointmentLanguage?: boolean;
      hasPaymentLanguage?: boolean;
      isFromClient?: boolean;
      urgencyLevel?: "low" | "medium" | "high" | "urgent" | undefined;
    };
  };
  wisdom: {
    insights: string[];
    recommendations: string[];
    followUpActions: string[];
  };
  contactMatch: {
    contactId?: string;
    confidence?: number;
    matchingFactors?: string[];
  };
  processingMeta: {
    model: string;
    processedAt: Date;
    inputTokens: number;
    outputTokens: number;
  };
}
