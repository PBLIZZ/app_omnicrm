// Email Intelligence Service for Gmail raw events processing
// Extends existing LLM service for email categorization and business intelligence extraction

import {
  getOpenRouterConfig,
  assertOpenRouterConfigured,
  openRouterHeaders,
} from "@/server/providers/openrouter.provider";
import { withGuardrails } from "@/server/ai/with-guardrails";
import { logger } from "@/lib/observability";
import { getDb } from "@/server/db/client";
import { contacts, interactions, rawEvents, aiInsights } from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse<T = unknown> {
  data: T;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

// Type guards for OpenRouter responses
interface OpenRouterChatResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function isOpenRouterChatResponse(data: unknown): data is OpenRouterChatResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as OpenRouterChatResponse).choices) &&
    (data as OpenRouterChatResponse).choices.length > 0 &&
    typeof (data as OpenRouterChatResponse).choices[0]?.message?.content === "string"
  );
}

// Email Intelligence Types
export interface EmailClassification {
  primaryCategory:
    | "client_communication"
    | "business_intelligence"
    | "personal"
    | "educational"
    | "administrative"
    | "marketing"
    | "spam";
  subCategory:
    | "marketing"
    | "thought_leadership"
    | "course_content"
    | "client_inquiry"
    | "appointment_related"
    | "invoice_payment"
    | "general_business"
    | "newsletter"
    | "promotion"
    | "personal_note"
    | "spam_likely";
  confidence: number; // 0.0 to 1.0
  businessRelevance: number; // 0.0 to 1.0 - relevance to wellness practice
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
  keyInsights: string[]; // 2-4 most important insights
  actionItems: string[]; // actionable next steps
  wellnessTags: string[]; // relevant wellness/health tags
  marketingTips?: string[]; // marketing insights if applicable
  businessOpportunities?: string[]; // growth opportunities identified
  clientMood?: "positive" | "neutral" | "concerned" | "frustrated" | "excited";
  followUpRecommended?: boolean;
  followUpReason?: string;
}

export interface ContactMatch {
  contactId: string | null;
  confidence: number; // 0.0 to 1.0
  matchingFactors: string[]; // what factors led to the match
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

/**
 * Core LLM call wrapper with guardrails
 */
async function callOpenRouter<T>(
  userId: string,
  messages: ChatMessage[],
  responseSchema?: object,
): Promise<LLMResponse<T>> {
  assertOpenRouterConfigured();
  const config = getOpenRouterConfig();

  let rawData: OpenRouterChatResponse | null = null;
  let parsedContent: T | null = null;

  const result = await withGuardrails(userId, async () => {
    const headers = openRouterHeaders();

    const requestBody = {
      model: config.summaryModel,
      messages,
      temperature: 0.2, // Lower temperature for more consistent classification
      max_tokens: 2000, // Increased for comprehensive analysis
      ...(responseSchema && { response_format: { type: "json_object" } }),
    };

    await logger.info("Email intelligence LLM request started", {
      operation: "llm_call",
      additionalData: {
        op: "email_intelligence.llm_request",
        userId,
        model: config.summaryModel,
        messageCount: messages.length,
      },
    });

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    rawData = (await response.json()) as unknown as OpenRouterChatResponse;

    if (!isOpenRouterChatResponse(rawData)) {
      throw new Error("Invalid OpenRouter response format");
    }

    const content = rawData.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenRouter response");
    }

    try {
      if (responseSchema) {
        const parsed = JSON.parse(content) as unknown;
        parsedContent = parsed as T;
      } else {
        parsedContent = content as unknown as T;
      }
    } catch (parseError) {
      await logger.warn(
        "Failed to parse email intelligence LLM response as JSON",
        {
          operation: "llm_call",
          additionalData: {
            op: "email_intelligence.parse_error",
            userId,
            content,
            error: parseError,
          },
        },
        parseError instanceof Error ? parseError : undefined,
      );
      parsedContent = responseSchema ? ({} as T) : (content as unknown as T);
    }

    return {
      data: parsedContent,
      model: rawData.model,
      inputTokens: rawData.usage?.prompt_tokens ?? 0,
      outputTokens: rawData.usage?.completion_tokens ?? 0,
      costUsd: 0,
    };
  });

  if ("error" in result) {
    throw new Error(`Email intelligence LLM request failed: ${result.error}`);
  }

  if (!rawData || parsedContent === null) {
    throw new Error("Failed to process OpenRouter response");
  }

  const finalRawData = rawData as OpenRouterChatResponse;
  const finalParsedContent = parsedContent as T;

  await logger.info("Email intelligence LLM request completed successfully", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.llm_success",
      userId,
      model: finalRawData.model,
      creditsLeft: result.creditsLeft,
    },
  });

  return {
    data: finalParsedContent,
    model: finalRawData.model,
    inputTokens: finalRawData.usage?.prompt_tokens ?? 0,
    outputTokens: finalRawData.usage?.completion_tokens ?? 0,
    costUsd: 0,
  };
}

/**
 * Main email categorization function
 */
export async function categorizeEmail(
  userId: string,
  emailData: {
    subject?: string;
    bodyText?: string;
    senderEmail?: string;
    senderName?: string;
    recipientEmails?: string[];
    occurredAt: Date;
  },
): Promise<EmailClassification> {
  const { subject = "", bodyText = "", senderEmail = "", senderName = "" } = emailData;

  // Extract sender domain for metadata
  const senderDomain = senderEmail.includes("@") ? senderEmail.split("@")[1] : undefined;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI assistant that analyzes emails for wellness practitioners (yoga, massage, meditation, therapy, coaching).
Your task is to categorize emails and assess their business relevance.

Primary Categories:
- client_communication: Direct communication from/to clients
- business_intelligence: Industry insights, thought leadership, business strategy
- educational: Courses, training, certifications, learning materials
- administrative: Invoices, payments, legal, compliance, operations
- marketing: Promotions, newsletters, advertising materials
- personal: Personal messages, social invitations
- spam: Obvious spam or irrelevant promotional content

Sub Categories:
- marketing: Promotional content, deals, advertising
- thought_leadership: Industry insights, expert opinions
- course_content: Educational materials, training content
- client_inquiry: Questions from clients or prospects
- appointment_related: Booking, scheduling, appointment management
- invoice_payment: Financial transactions, billing
- general_business: Other business communications
- newsletter: Regular updates, industry news
- promotion: Special offers, deals, discounts
- personal_note: Personal communications
- spam_likely: Likely spam or irrelevant content

Respond with valid JSON matching this schema:
{
  "primaryCategory": string,
  "subCategory": string,
  "confidence": number, // 0.0 to 1.0
  "businessRelevance": number, // 0.0 to 1.0 for wellness practice
  "reasoning": string,
  "extractedMetadata": {
    "senderDomain": string,
    "hasAppointmentLanguage": boolean,
    "hasPaymentLanguage": boolean,
    "isFromClient": boolean,
    "urgencyLevel": "low" | "medium" | "high" | "urgent"
  }
}`,
    },
    {
      role: "user",
      content: `Categorize this email for a wellness practitioner:

From: ${senderName} <${senderEmail}>
Subject: ${subject}

Email Body:
${bodyText.substring(0, 1500)}${bodyText.length > 1500 ? "..." : ""}

Analyze the content, sender, and context to provide accurate categorization and business relevance scoring.`,
    },
  ];

  const response = await callOpenRouter<EmailClassification>(userId, messages, {});

  // Ensure extracted metadata includes sender domain
  const enrichedData: EmailClassification = {
    ...response.data,
    extractedMetadata: {
      ...response.data.extractedMetadata,
      ...(senderDomain !== undefined && { senderDomain }),
    },
  };

  return enrichedData;
}

/**
 * Extract business wisdom and insights from email content
 */
export async function extractWisdom(
  userId: string,
  emailData: {
    subject?: string;
    bodyText?: string;
    senderEmail?: string;
    senderName?: string;
    classification: EmailClassification;
  },
): Promise<EmailWisdom> {
  const { subject = "", bodyText = "", senderName = "", classification } = emailData;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI business intelligence assistant specialized in wellness practices.
Extract actionable insights, wisdom, and opportunities from email content.

Focus on:
- Key business insights that could help grow the practice
- Actionable next steps
- Wellness industry trends and opportunities
- Client communication patterns and mood
- Marketing intelligence and growth opportunities

For wellness tags, use these categories when relevant:
Services: Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy
Health Focus: Stress Relief, Weight Loss, Flexibility, Strength, Pain Management, Mental Health, Spiritual Growth, Mindfulness
Client Types: Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced

Respond with valid JSON matching this schema:
{
  "keyInsights": string[], // 2-4 most important insights
  "actionItems": string[], // specific actionable steps
  "wellnessTags": string[], // relevant wellness/health tags
  "marketingTips": string[], // marketing insights (optional)
  "businessOpportunities": string[], // growth opportunities (optional)
  "clientMood": "positive" | "neutral" | "concerned" | "frustrated" | "excited" | null,
  "followUpRecommended": boolean,
  "followUpReason": string | null
}`,
    },
    {
      role: "user",
      content: `Extract business wisdom from this email:

Classification: ${classification.primaryCategory} / ${classification.subCategory}
Business Relevance: ${classification.businessRelevance}

From: ${senderName}
Subject: ${subject}

Content:
${bodyText.substring(0, 1200)}${bodyText.length > 1200 ? "..." : ""}

Provide actionable insights and business intelligence for a wellness practitioner.`,
    },
  ];

  const response = await callOpenRouter<EmailWisdom>(userId, messages, {});
  return response.data;
}

/**
 * Match email to existing contacts in the database
 */
export async function matchToContacts(
  userId: string,
  emailData: {
    senderEmail?: string;
    senderName?: string;
    bodyText?: string;
    recipientEmails?: string[];
  },
): Promise<ContactMatch> {
  const { senderEmail = "", senderName = "", bodyText = "" } = emailData;
  const db = await getDb();

  // First try exact email match
  if (senderEmail) {
    const exactMatch = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.primaryEmail, senderEmail.toLowerCase())))
      .limit(1);

    if (exactMatch.length > 0) {
      const firstMatch = exactMatch[0];
      if (!firstMatch) {
        throw new Error(
          "Unexpected: exactMatch array has length > 0 but first element is undefined",
        );
      }
      return {
        contactId: firstMatch.id,
        confidence: 0.95,
        matchingFactors: ["exact_email_match"],
      };
    }
  }

  // Try partial name matching if no exact email match
  if (senderName && senderName.length > 2) {
    const nameWords = senderName
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    if (nameWords.length > 0) {
      // Use fuzzy matching for contact names
      const fuzzyMatches = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, userId))
        .limit(20);

      for (const contact of fuzzyMatches) {
        const contactNameWords = contact.displayName.toLowerCase().split(/\s+/);
        const matchingWords = nameWords.filter((word) =>
          contactNameWords.some(
            (contactWord) => contactWord.includes(word) || word.includes(contactWord),
          ),
        );

        if (matchingWords.length >= Math.min(nameWords.length, 2)) {
          const confidence =
            matchingWords.length / Math.max(nameWords.length, contactNameWords.length);

          if (confidence > 0.6) {
            return {
              contactId: contact.id,
              confidence: Math.min(confidence, 0.85), // Cap at 0.85 for name matches
              matchingFactors: [`name_match_${matchingWords.length}_words`],
            };
          }
        }
      }
    }
  }

  // If no match found, suggest creating a new contact
  if (senderEmail && senderName) {
    // Use LLM to suggest contact details and stage
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `Analyze this email sender information to suggest contact details for a wellness practitioner's CRM.

Lifecycle Stages:
- Prospect: Inquiry or first contact
- New Client: Recently started services
- Core Client: Regular established client
- Referring Client: Brings referrals
- VIP Client: High-value or long-term client

Wellness Tags: Yoga, Massage, Meditation, Pilates, Stress Relief, Mental Health, etc.

Respond with JSON:
{
  "displayName": string,
  "primaryEmail": string,
  "estimatedStage": string,
  "suggestedTags": string[]
}`,
      },
      {
        role: "user",
        content: `Suggest contact details from:
Name: ${senderName}
Email: ${senderEmail}

Email content preview:
${bodyText.substring(0, 300)}`,
      },
    ];

    try {
      const suggestionResponse = await callOpenRouter<{
        displayName: string;
        primaryEmail: string;
        estimatedStage: string;
        suggestedTags: string[];
      }>(userId, messages, {});

      return {
        contactId: null,
        confidence: 0.0,
        matchingFactors: [],
        suggestedNewContact: suggestionResponse.data,
      };
    } catch (error) {
      await logger.warn(
        "Failed to generate contact suggestion",
        {
          operation: "llm_call",
          additionalData: {
            op: "email_intelligence.contact_suggestion_failed",
            userId,
            error,
            senderEmail,
            senderName,
          },
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  return {
    contactId: null,
    confidence: 0.0,
    matchingFactors: [],
  };
}

/**
 * Process a Gmail raw event and extract complete email intelligence
 */
export async function processEmailIntelligence(
  userId: string,
  rawEventId: string,
): Promise<EmailIntelligence> {
  const db = await getDb();

  // Fetch the raw event
  const rawEvent = await db
    .select()
    .from(rawEvents)
    .where(and(eq(rawEvents.id, rawEventId), eq(rawEvents.userId, userId)))
    .limit(1);

  if (rawEvent.length === 0) {
    throw new Error(`Raw event not found: ${rawEventId}`);
  }

  const event = rawEvent[0];
  if (!event) {
    throw new Error(`Unexpected: rawEvent array has length > 0 but first element is undefined`);
  }
  // Type guard for Gmail payload structure
  interface GmailPayload {
    subject?: string;
    bodyText?: string;
    snippet?: string;
    from?: {
      email?: string;
      name?: string;
    };
    senderEmail?: string;
    senderName?: string;
    to?: Array<{ email?: string }>;
  }

  const isGmailPayload = (payload: unknown): payload is GmailPayload => {
    return payload !== null && typeof payload === "object";
  };

  if (!isGmailPayload(event.payload)) {
    throw new Error(`Invalid Gmail payload format for event: ${rawEventId}`);
  }

  const payload = event.payload;

  // Extract email data from Gmail payload
  const emailData = {
    subject: payload.subject ?? "",
    bodyText: payload.bodyText ?? payload.snippet ?? "",
    senderEmail: payload.from?.email ?? payload.senderEmail ?? "",
    senderName: payload.from?.name ?? payload.senderName ?? "",
    recipientEmails:
      payload.to?.map((t) => t.email).filter((email): email is string => Boolean(email)) ?? [],
    occurredAt: event.occurredAt,
  };

  await logger.info("Starting email intelligence processing", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.processing_start",
      userId,
      rawEventId,
      senderEmail: emailData.senderEmail,
    },
  });

  // Process in parallel for efficiency
  const [classification, contactMatch] = await Promise.all([
    categorizeEmail(userId, emailData),
    matchToContacts(userId, emailData),
  ]);

  // Extract wisdom based on classification
  const wisdom = await extractWisdom(userId, {
    ...emailData,
    classification,
  });

  const intelligence: EmailIntelligence = {
    classification,
    wisdom,
    contactMatch,
    processingMeta: {
      model: "gpt-4o", // This will be replaced by actual model from response
      processedAt: new Date(),
      inputTokens: 0, // Will be updated if we track this
      outputTokens: 0,
    },
  };

  await logger.info("Email intelligence processing completed", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.processing_complete",
      userId,
      rawEventId,
      category: classification.primaryCategory,
      businessRelevance: classification.businessRelevance,
      contactMatched: Boolean(contactMatch.contactId),
    },
  });

  return intelligence;
}

/**
 * Generate weekly business intelligence digest
 */
export async function generateWeeklyDigest(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<WeeklyDigestInsight> {
  const db = await getDb();

  const endDate = options.endDate ?? new Date();
  const startDate = options.startDate ?? new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch email interactions from the past week
  const emailInteractions = await db
    .select()
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.type, "email"),
        sql`${interactions.occurredAt} >= ${startDate}`,
        sql`${interactions.occurredAt} <= ${endDate}`,
      ),
    )
    .orderBy(desc(interactions.occurredAt));

  // Fetch related AI insights for email intelligence
  const insights = await db
    .select()
    .from(aiInsights)
    .where(
      and(
        eq(aiInsights.userId, userId),
        eq(aiInsights.subjectType, "inbox"),
        sql`${aiInsights.createdAt} >= ${startDate}`,
        sql`${aiInsights.createdAt} <= ${endDate}`,
      ),
    );

  // Type for email interaction summary
  interface EmailSummary {
    subject: string;
    bodyText: string;
    source: string;
    occurredAt: Date;
  }

  const emailSummary: EmailSummary[] = emailInteractions
    .map((interaction) => ({
      subject: interaction.subject ?? "No subject",
      bodyText: interaction.bodyText?.substring(0, 200) ?? "",
      source: interaction.source ?? "unknown",
      occurredAt: interaction.occurredAt,
    }))
    .slice(0, 30); // Limit to prevent token overflow

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI business intelligence analyst for wellness practitioners.
Analyze the past week's email activity to provide actionable business insights.

Focus on:
- Overall email trends and patterns
- Business opportunities and growth insights
- Client communication patterns and sentiment
- Marketing intelligence and competitive insights
- Actionable recommendations for the upcoming week

Respond with valid JSON matching this schema:
{
  "summary": {
    "totalEmails": number,
    "clientEmails": number,
    "businessIntelligenceEmails": number,
    "avgBusinessRelevance": number
  },
  "keyInsights": string[],
  "businessOpportunities": string[],
  "clientMoodTrends": {
    "positive": number,
    "neutral": number,
    "concerned": number,
    "frustrated": number
  },
  "marketingIntelligence": string[],
  "actionItems": string[],
  "recommendations": string[]
}`,
    },
    {
      role: "user",
      content: `Analyze this week's email activity (${startDate.toDateString()} to ${endDate.toDateString()}):

Total interactions: ${emailInteractions.length}
AI insights generated: ${insights.length}

Recent email sample:
${emailSummary
  .map(
    (email, idx: number) =>
      `${idx + 1}. [${email.occurredAt.toDateString()}] ${email.subject}
   ${email.bodyText}
   Source: ${email.source}`,
  )
  .join("\n\n")}

Provide comprehensive business intelligence and actionable recommendations.`,
    },
  ];

  const response = await callOpenRouter<Omit<WeeklyDigestInsight, "timeframe">>(
    userId,
    messages,
    {},
  );

  return {
    timeframe: {
      startDate,
      endDate,
    },
    ...response.data,
  };
}

/**
 * Store email intelligence results in the database
 */
export async function storeEmailIntelligence(
  userId: string,
  rawEventId: string,
  intelligence: EmailIntelligence,
): Promise<void> {
  const db = await getDb();

  // Store as AI insight
  await db.insert(aiInsights).values({
    userId,
    subjectType: "inbox",
    subjectId: rawEventId,
    kind: "email_intelligence",
    content: intelligence as unknown, // Store complete intelligence object with safe typing
    model: intelligence.processingMeta.model,
    fingerprint: `email_intel_${rawEventId}`,
  });

  await logger.info("Email intelligence stored successfully", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.stored",
      userId,
      rawEventId,
      category: intelligence.classification.primaryCategory,
    },
  });
}
