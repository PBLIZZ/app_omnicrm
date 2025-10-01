// Enhanced AI analysis prompt for contacts

import { ChatMessage } from "@/server/ai/core/llm.service";

// Configuration constants for analysis limits
const ANALYSIS_LIMITS = {
  maxEvents: 10,
  maxInteractions: 10,
  bodyPreviewLength: 200,
  maxLabels: 3,
} as const;

interface CalendarEventData {
  title: string;
  description?: string;
  start_time: string;
  location?: string;
}

interface GmailInteractionData {
  subject: string;
  bodyText: string;
  occurredAt: Date;
  isOutbound: boolean;
  labels: string[];
}

interface EventPatterns {
  totalEvents: number;
  recentEvents: number;
  eventTypes: string[];
  businessCategories: string[];
  relationshipDays: number;
  averageEventsPerMonth: number;
}

interface GmailPatterns {
  totalEmails: number;
  recentEmails: number;
  outboundEmails: number;
  inboundEmails: number;
  uniqueThreads: number;
  communicationDays: number;
  averageEmailsPerMonth: number;
  responseRate: number;
  commonLabels: string[];
  contentInsights: {
    sentiment: string;
    topics: string[];
    urgency: string;
    businessRelevance: string;
  };
}

// Event type patterns with case-insensitive word boundary matching
const EVENT_TYPE_PATTERNS = {
  meeting: /\b(meeting|call|conference|standup|sync)\b/i,
  class: /\b(class|workshop|training|lesson|course)\b/i,
  appointment: /\b(appointment|consultation|session|checkup|visit)\b/i,
  event: /\b(event|seminar|webinar|conference|presentation)\b/i,
  social: /\b(lunch|dinner|coffee|breakfast|drinks|party|gathering)\b/i,
} as const;

function extractEventType(title: string, description?: string): string {
  const text = `${title} ${description ?? ""}`;

  // Check patterns in order of precedence
  for (const [eventType, pattern] of Object.entries(EVENT_TYPE_PATTERNS)) {
    if (pattern.test(text)) {
      return eventType;
    }
  }

  return "other";
}

// Business category patterns with case-insensitive word boundary matching
const BUSINESS_CATEGORY_PATTERNS = [
  {
    category: "wellness",
    patterns: [/\b(wellness|health|fitness|yoga|meditation|mindfulness|therapy|counseling)\b/i],
  },
  {
    category: "business",
    patterns: [/\b(business|strategy|planning|review|management|operations)\b/i],
  },
  {
    category: "marketing",
    patterns: [/\b(marketing|promotion|campaign|social media|advertising|branding)\b/i],
  },
  {
    category: "sales",
    patterns: [/\b(sales|client|prospect|lead|customer|revenue)\b/i],
  },
  {
    category: "administrative",
    patterns: [/\b(admin|administrative|paperwork|billing|accounting|compliance)\b/i],
  },
  {
    category: "personal",
    patterns: [/\b(personal|family|vacation|holiday|break|time off)\b/i],
  },
] as const;

function extractBusinessCategory(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.trim().toLowerCase();

  // Check patterns in order of precedence
  for (const { category, patterns } of BUSINESS_CATEGORY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return category;
    }
  }

  return "general";
}

export function buildEnhancedAIAnalysisPrompt(data: {
  contactEmail: string;
  events: CalendarEventData[];
  gmailInteractions: GmailInteractionData[];
  eventAnalysis: EventPatterns;
  gmailAnalysis: GmailPatterns;
}): ChatMessage[] {
  const eventDetails = data.events.slice(0, ANALYSIS_LIMITS.maxEvents).map((event) => ({
    title: event.title,
    description: event.description ?? "",
    date: event.start_time,
    type: extractEventType(event.title, event.description),
    category: extractBusinessCategory(event.title, event.description),
    location: event.location ?? "",
  }));

  const emailDetails = data.gmailInteractions
    .slice(0, ANALYSIS_LIMITS.maxInteractions)
    .map((email) => ({
      subject: email.subject,
      bodyPreview: email.bodyText.substring(0, ANALYSIS_LIMITS.bodyPreviewLength) + "...",
      date: email.occurredAt,
      isOutbound: email.isOutbound,
      labels: email.labels.slice(0, ANALYSIS_LIMITS.maxLabels),
    }));

  const prompt = `
Analyze this contact's wellness journey using both calendar events and email communications:

CONTACT: ${data.contactEmail}

CALENDAR EVENTS (${data.eventAnalysis.totalEvents} total, ${data.eventAnalysis.recentEvents} recent):
${JSON.stringify(eventDetails, null, 2)}

EMAIL COMMUNICATIONS (${data.gmailAnalysis.totalEmails} total, ${data.gmailAnalysis.recentEmails} recent):
Outbound: ${data.gmailAnalysis.outboundEmails}, Inbound: ${data.gmailAnalysis.inboundEmails}
Response Rate: ${(data.gmailAnalysis.responseRate * 100).toFixed(1)}%
${JSON.stringify(emailDetails, null, 2)}

ANALYSIS PATTERNS:
Calendar: ${data.eventAnalysis.totalEvents} events over ${data.eventAnalysis.relationshipDays} days
Email: ${data.gmailAnalysis.totalEmails} emails over ${data.gmailAnalysis.communicationDays} days
Common Labels: ${data.gmailAnalysis.commonLabels.join(", ")}

Based on this comprehensive data, provide wellness insights as JSON:
{
  "stage": "Prospect|Active Client|Regular Client|VIP Client|At Risk|Lost Client|Non-Client",
  "tags": ["array of relevant wellness tags"],
  "confidenceScore": 0.0-1.0,
  "notes": "Personalized insights combining calendar and email patterns"
}

Consider:
- Email engagement patterns and response rates
- Calendar event frequency and types
- Communication style and preferences
- Overall relationship progression
- Wellness service preferences from both sources
`;

  return [{ role: "user", content: prompt }];
}
