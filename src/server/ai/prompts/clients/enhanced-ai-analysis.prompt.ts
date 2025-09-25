// New file for enhanced AI analysis prompt

import { ChatMessage } from "@/server/ai/core/llm.service";

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
  contentInsights: any;
}

function extractEventType(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Common event type patterns
  if (text.includes("meeting") || text.includes("call") || text.includes("conference")) {
    return "meeting";
  }
  if (text.includes("class") || text.includes("workshop") || text.includes("training")) {
    return "class";
  }
  if (text.includes("appointment") || text.includes("consultation") || text.includes("session")) {
    return "appointment";
  }
  if (text.includes("event") || text.includes("seminar") || text.includes("webinar")) {
    return "event";
  }
  if (text.includes("lunch") || text.includes("dinner") || text.includes("coffee")) {
    return "social";
  }

  return "other";
}

function extractBusinessCategory(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Business category patterns
  if (
    text.includes("wellness") ||
    text.includes("health") ||
    text.includes("fitness") ||
    text.includes("yoga") ||
    text.includes("meditation")
  ) {
    return "wellness";
  }
  if (
    text.includes("business") ||
    text.includes("strategy") ||
    text.includes("planning") ||
    text.includes("review")
  ) {
    return "business";
  }
  if (
    text.includes("marketing") ||
    text.includes("promotion") ||
    text.includes("campaign") ||
    text.includes("social media")
  ) {
    return "marketing";
  }
  if (
    text.includes("sales") ||
    text.includes("client") ||
    text.includes("prospect") ||
    text.includes("lead")
  ) {
    return "sales";
  }
  if (
    text.includes("admin") ||
    text.includes("administrative") ||
    text.includes("paperwork") ||
    text.includes("billing")
  ) {
    return "administrative";
  }
  if (
    text.includes("personal") ||
    text.includes("family") ||
    text.includes("vacation") ||
    text.includes("holiday")
  ) {
    return "personal";
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
  const eventDetails = data.events.slice(0, 10).map((event) => ({
    title: event.title,
    description: event.description ?? "",
    date: event.start_time,
    type: extractEventType(event.title, event.description),
    category: extractBusinessCategory(event.title, event.description),
    location: event.location ?? "",
  }));

  const emailDetails = data.gmailInteractions.slice(0, 10).map((email) => ({
    subject: email.subject,
    bodyPreview: email.bodyText.substring(0, 200) + "...",
    date: email.occurredAt,
    isOutbound: email.isOutbound,
    labels: email.labels.slice(0, 3),
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
