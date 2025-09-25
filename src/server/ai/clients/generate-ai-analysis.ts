// New file for generating AI analysis for contacts

import { generateText } from "@/server/ai/core/llm.service";
import { buildEnhancedAIAnalysisPrompt } from "@/server/ai/prompts/clients/enhanced-ai-analysis.prompt";
import { validateStage, validateTags } from "./utils/validation-utils";
import { z } from "zod"; // If needed for schema

interface CalendarEventData {
  title: string;
  description: string;
  start_time: string;
}

interface GmailInteractionData {
  subject: string | null;
  bodyText: string | null;
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
  firstEventDate: Date | null;
  lastEventDate: Date | null;
  averageEventsPerMonth: number;
}

interface GmailPatterns {
  totalEmails: number;
  recentEmails: number;
  outboundEmails: number;
  inboundEmails: number;
  uniqueThreads: number;
  communicationDays: number;
  firstEmailDate: Date | null;
  lastEmailDate: Date | null;
  averageEmailsPerMonth: number;
  responseRate: number;
  commonLabels: string[];
  contentInsights: any;
}

interface ContactInsightsWithNote {
  noteContent: string;
  lifecycleStage: string;
  tags: string[];
  confidenceScore: number;
}

interface AIContactIntelligenceResponse {
  notes?: string;
  lifecycleStage?: string;
  tags?: string[];
  confidenceScore?: number;
}

export async function generateAIAnalysis(
  userId: string,
  contactEmail: string,
  events: CalendarEventData[],
  gmailInteractions: GmailInteractionData[],
  eventAnalysis: EventPatterns,
  gmailAnalysis: GmailPatterns,
  basicOnly: boolean = false,
): Promise<ContactInsightsWithNote> {
  if (basicOnly) {
    // Compute lightweight heuristics without AI calls
    const totalEvents = events.length;
    const totalEmails = gmailInteractions.length;
    const recentActivity =
      events.filter((event) => {
        const eventDate = new Date(event.start_time);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return eventDate > thirtyDaysAgo;
      }).length +
      gmailInteractions.filter((interaction) => {
        const interactionDate = new Date(interaction.occurredAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return interactionDate > thirtyDaysAgo;
      }).length;

    // Determine stage based on activity levels
    let lifecycleStage = "Prospect";
    if (recentActivity > 5) {
      lifecycleStage = "Core Client";
    } else if (recentActivity > 2) {
      lifecycleStage = "New Client";
    } else if (totalEvents > 0 || totalEmails > 0) {
      lifecycleStage = "Prospect";
    }

    // Generate basic tags based on interaction patterns
    const tags: string[] = [];
    if (totalEvents > 0) tags.push("calendar-active");
    if (totalEmails > 0) tags.push("email-active");
    if (recentActivity > 3) tags.push("high-engagement");
    if (totalEvents > totalEmails) tags.push("meeting-focused");
    if (totalEmails > totalEvents) tags.push("email-focused");

    // Calculate confidence based on data completeness
    const confidenceScore = Math.min(
      1.0,
      Math.max(0.1, (totalEvents + totalEmails) / 10 + (recentActivity > 0 ? 0.3 : 0)),
    );

    const noteContent = `Contact with ${totalEvents} calendar events and ${totalEmails} email interactions. Recent activity: ${recentActivity} interactions in last 30 days.`;

    return {
      noteContent,
      lifecycleStage,
      tags,
      confidenceScore,
    };
  }
  // Else, proceed with AI generation
  const messages = buildEnhancedAIAnalysisPrompt({
    contactEmail,
    events,
    gmailInteractions,
    eventAnalysis,
    gmailAnalysis,
  });

  const response = await generateText<AIContactIntelligenceResponse>(userId, {
    model: "gpt-5",
    messages,
    temperature: 0.7,
    maxTokens: 2000,
    responseSchema: z.object({
      notes: z.string().optional(),
      stage: z.string().optional(),
      tags: z.array(z.string()).optional(),
      confidenceScore: z.number().optional(),
    }),
  });

  const result = response.data;

  const noteContent =
    result.notes ??
    `Contact with ${eventAnalysis.totalEvents} events and ${gmailAnalysis.totalEmails} emails`;
  const lifecycleStage = validateStage(result.lifecycleStage ?? "Prospect");
  const tags = validateTags(result.tags ?? []);
  const confidenceScore = Math.min(1.0, Math.max(0.0, result.confidenceScore ?? 0.5));

  return {
    noteContent,
    lifecycleStage,
    tags,
    confidenceScore,
  };
}

// Helper functions like validateStage, validateTags are imported at the top
