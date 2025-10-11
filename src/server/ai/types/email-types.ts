// Email-related types for AI processing

export interface EmailClassification {
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
}
