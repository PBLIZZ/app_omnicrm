// Extracted Gmail patterns analyzer

import { logger } from "@/lib/observability";
import {
  analyzeSentimentTrend,
  detectEmailIntents,
  identifyBusinessContext,
  assessUrgencyLevel,
  determineRelationshipStage,
  extractKeyTopics,
  generateContentSummary,
} from "./utils/email-analysis-utils";

// Define types:
interface GmailPatterns {
  totalEmails: number;
  validEmails: number;
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
  contentInsights: EmailContentInsights;
}
interface GmailInteractionData {
  threadId: string;
  subject: string;
  bodyText: string;
  occurredAt: string;
  isOutbound: boolean;
  labels: string[];
}
interface EmailContentInsights {
  sentimentTrend: string;
  intents: string[];
  businessContexts: string[];
  urgencyLevels: string[];
  relationshipStages: string[];
  keyTopics: string[];
  summaries: string[];
}

export async function analyzeGmailPatterns(
  gmailInteractions: GmailInteractionData[],
): Promise<GmailPatterns> {
  const totalEmails = gmailInteractions.length;

  // Filter interactions with valid occurredAt timestamps
  const validInteractions = gmailInteractions.filter((interaction) => {
    const occurredAt = interaction.occurredAt;
    if (!occurredAt) {
      logger.warn("Gmail interaction missing occurredAt timestamp, dropping from analysis");
      return false;
    }
    const date = new Date(occurredAt);
    if (isNaN(date.getTime())) {
      logger.warn("Gmail interaction has invalid occurredAt timestamp, dropping from analysis");
      return false;
    }
    return true;
  });

  // Sort interactions by occurredAt for chronological analysis
  validInteractions.sort((a, b) => {
    const dateA = new Date(a.occurredAt);
    const dateB = new Date(b.occurredAt);
    return dateA.getTime() - dateB.getTime();
  });

  const validEmails = validInteractions.length;
  const recentEmails = validInteractions.filter((email) => {
    const daysSince = (Date.now() - new Date(email.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }).length;

  const outboundEmails = validInteractions.filter((email) => email.isOutbound).length;
  const inboundEmails = validEmails - outboundEmails;

  const threadIds = [...new Set(validInteractions.map((email) => email.threadId).filter(Boolean))];
  const uniqueThreads = threadIds.length;

  const firstEmailDate =
    validInteractions.length > 0 && validInteractions[0]
      ? new Date(validInteractions[0].occurredAt)
      : null;
  const lastEmailDate =
    validInteractions.length > 0 && validInteractions[validInteractions.length - 1]
      ? new Date(validInteractions[validInteractions.length - 1]!.occurredAt)
      : null;

  const communicationDays =
    firstEmailDate && lastEmailDate
      ? Math.floor((lastEmailDate.getTime() - firstEmailDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const allLabels = validInteractions.flatMap((email) => email.labels);
  const labelCounts = allLabels.reduce(
    (acc, label) => {
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  await logger.debug("Gmail analysis", {
    operation: "analyze_gmail_patterns",
    additionalData: {
      totalEmails,
      validEmails,
      recentEmails,
      outboundEmails,
      inboundEmails,
      uniqueThreads,
      communicationDays,
      topLabels: Object.entries(labelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([label]) => label),
    },
  });

  return {
    totalEmails,
    validEmails,
    recentEmails,
    outboundEmails,
    inboundEmails,
    uniqueThreads,
    communicationDays,
    firstEmailDate,
    lastEmailDate,
    averageEmailsPerMonth: communicationDays > 0 ? validEmails / (communicationDays / 30) : 0,
    responseRate: inboundEmails > 0 ? outboundEmails / inboundEmails : 0,
    commonLabels: Object.entries(labelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label]) => label),
    contentInsights: analyzeEmailContent(validInteractions),
  };
}

// Subfunction (move to utils if needed)
function analyzeEmailContent(interactions: GmailInteractionData[]): EmailContentInsights {
  const emailContents = interactions.map((i) => ({
    subject: i.subject,
    body: i.bodyText,
    isOutbound: i.isOutbound,
  }));
  const sentimentTrend = analyzeSentimentTrend(emailContents);
  const intents = detectEmailIntents(emailContents);
  const businessContexts = identifyBusinessContext(emailContents);
  const urgencyLevels = assessUrgencyLevel(emailContents);
  const relationshipStages = determineRelationshipStage(emailContents);
  const keyTopics = extractKeyTopics(emailContents);
  const summaries = generateContentSummary(emailContents);
  return {
    sentimentTrend,
    intents,
    businessContexts,
    urgencyLevels,
    relationshipStages,
    keyTopics,
    summaries,
  };
}
