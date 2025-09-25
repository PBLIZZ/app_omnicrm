// New shared types for connect (email) domain

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

export interface EmailWisdom {
  keyInsights: string[];
  actionItems: string[];
  wellnessTags: string[];
  marketingTips?: string[];
  businessOpportunities?: string[];
  clientMood?: "positive" | "neutral" | "concerned" | "frustrated" | "excited";
  followUpRecommended?: boolean;
  followUpReason?: string;
}

export interface ContactMatch {
  contactId: string | null;
  confidence: number;
  matchingFactors: string[];
  suggestedNewContact?: {
    displayName: string;
    primaryEmail: string;
    estimatedStage: string;
    suggestedTags: string[];
  };
}

export interface EmailIntelligence {
  classification: EmailClassification;
  wisdom: EmailWisdom;
  contactMatch: ContactMatch;
  processingMeta: {
    model: string;
    processedAt: Date;
    inputTokens: number;
    outputTokens: number;
  };
}

export interface WeeklyDigestInsight {
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEmails: number;
    clientEmails: number;
    businessIntelligenceEmails: number;
    avgBusinessRelevance: number;
  };
  keyInsights: string[];
  businessOpportunities: string[];
  clientMoodTrends: {
    positive: number;
    neutral: number;
    concerned: number;
    frustrated: number;
  };
  marketingIntelligence: string[];
  actionItems: string[];
  recommendations: string[];
}

// Add more types as extracted

export interface ContactWithContext {
  contact: {
    displayName: string;
    stage?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    tags?: string[];
  };
  calendarEvents: Array<{
    title: string;
    start_time: string;
    event_type?: string;
  }>;
  interactions: Array<{
    type: string;
    occurredAt: Date;
    subject?: string;
  }>;
  notes: Array<{
    content: string;
  }>;
  timeline: Array<unknown>;
}
