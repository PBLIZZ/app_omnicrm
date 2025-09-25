// Shared types for AI connect functionality

// Re-export types from contracts for convenience
export type { InboxProcessingResultDTO, InboxProcessingContext } from "@contracts/inbox";

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
      urgencyLevel?: "low" | "medium" | "high" | "urgent";
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
