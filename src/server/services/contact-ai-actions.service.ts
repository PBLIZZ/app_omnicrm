import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  contacts,
  type Contact,
  type Interaction,
  type Note,
  type ContactTimeline,
} from "@/server/db/schema";
import OpenAI from "openai";
import { logger } from "@/lib/observability";

// Type definitions for contact context data
interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  start_time: string | Date;
  end_time: string | Date;
  event_type?: string;
  business_category?: string;
  attendees?: unknown;
  created_at: string | Date;
}

interface ContactWithContext {
  contact: Contact | null;
  calendarEvents: CalendarEventData[];
  interactions: Interaction[];
  notes: Note[];
  timeline: ContactTimeline[];
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

export interface ContactAIInsightResponse {
  insights: string;
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  keyFindings: string[];
}

// Interface for the raw JSON response from OpenAI
interface AIAnalysisResponse {
  insights?: string;
  suggestions?: string[];
  nextSteps?: string[];
  keyFindings?: string[];
  confidence?: number;
}

// Interface for the email generation JSON response from OpenAI
interface AIEmailResponse {
  subject?: string;
  content?: string;
  tone?: "professional" | "friendly" | "casual" | "formal";
  purpose?: string;
}

// Interface for the note suggestions JSON response from OpenAI
interface AINoteResponse {
  notes?: ContactNoteSuggestion[];
}

// Interface for the task suggestions JSON response from OpenAI
interface AITaskResponse {
  tasks?: ContactTaskSuggestion[];
}

export interface ContactEmailSuggestion {
  subject: string;
  content: string;
  tone: "professional" | "friendly" | "casual" | "formal";
  purpose: string;
}

export interface ContactNoteSuggestion {
  content: string;
  category: "interaction" | "observation" | "follow-up" | "preference";
  priority: "high" | "medium" | "low";
}

export interface ContactTaskSuggestion {
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  estimatedMinutes: number;
  category: "follow-up" | "outreach" | "service" | "admin";
}

export class ContactAIActionsService {
  /**
   * Ask AI about contact - provides conversational insights and analysis
   */
  static async askAIAboutContact(
    userId: string,
    contactId: string,
  ): Promise<ContactAIInsightResponse> {
    try {
      void logger.progress("Analyzing contact...", "Generating AI insights for contact");
      void logger.info("Generating AI insights for contact", {
        operation: "contact_ai_insights",
      });

      // Get comprehensive contact data
      const contactData = await this.getContactWithContext(userId, contactId);

      if (!contactData.contact) {
        throw new Error("Contact not found");
      }

      // Generate AI analysis
      const aiResponse = await this.generateContactAnalysis(contactData);

      void logger.success(
        "AI insights generated",
        `Successfully analyzed contact with ${aiResponse.insights?.length || 0} insights`,
      );

      return aiResponse;
    } catch (error) {
      await logger.error(
        "Failed to generate AI insights",
        {
          operation: "contact_ai_actions.generate_insights",
          additionalData: {
            contactId: contactId.slice(0, 8) + "...",
            userId: userId.slice(0, 8) + "...",
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `Failed to generate AI insights: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate AI-assisted email composition for contact
   */
  static async generateEmailSuggestion(
    userId: string,
    contactId: string,
    purpose?: string,
  ): Promise<ContactEmailSuggestion> {
    try {
      void logger.progress("Generating email suggestion...", "AI is drafting a personalized email");
      void logger.info("Generating email suggestion", { operation: "email_suggestion" });

      const contactData = await this.getContactWithContext(userId, contactId);

      if (!contactData.contact?.primaryEmail) {
        throw new Error("Contact not found or has no email address");
      }

      const emailSuggestion = await this.generateEmailContent(contactData, purpose);

      void logger.success(
        "Email suggestion ready",
        `Generated personalized email (${emailSuggestion.content.length} characters)`,
      );

      return emailSuggestion;
    } catch (error) {
      await logger.error(
        "Failed to generate email suggestion",
        {
          operation: "contact_ai_actions.generate_email",
          additionalData: {
            contactId: contactId.slice(0, 8) + "...",
            userId: userId.slice(0, 8) + "...",
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Generate AI note suggestions for contact
   */
  static async generateNoteSuggestions(
    userId: string,
    contactId: string,
  ): Promise<ContactNoteSuggestion[]> {
    try {
      void logger.progress(
        "Generating note suggestions...",
        "AI is analyzing contact for note opportunities",
      );
      void logger.info("Generating note suggestions", { operation: "note_suggestions" });

      const contactData = await this.getContactWithContext(userId, contactId);

      if (!contactData.contact) {
        throw new Error("Contact not found");
      }

      const noteSuggestions = await this.generateNoteContent(contactData);

      void logger.success(
        "Note suggestions ready",
        `Generated ${noteSuggestions.length} note suggestions for contact`,
      );

      return noteSuggestions;
    } catch (error) {
      await logger.error(
        "Failed to generate note suggestions",
        {
          operation: "contact_ai_actions.generate_notes",
          additionalData: {
            contactId: contactId.slice(0, 8) + "...",
            userId: userId.slice(0, 8) + "...",
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Generate AI task suggestions for contact
   */
  static async generateTaskSuggestions(
    userId: string,
    contactId: string,
  ): Promise<ContactTaskSuggestion[]> {
    try {
      void logger.progress("Generating task suggestions...", "AI is identifying actionable tasks");
      void logger.info("Generating task suggestions", { operation: "task_suggestions" });

      const contactData = await this.getContactWithContext(userId, contactId);

      if (!contactData.contact) {
        throw new Error("Contact not found");
      }

      const taskSuggestions = await this.generateTaskContent(contactData);

      void logger.success(
        "Task suggestions ready",
        `Generated ${taskSuggestions.length} actionable tasks for contact`,
      );

      return taskSuggestions;
    } catch (error) {
      await logger.error(
        "Failed to generate task suggestions",
        {
          operation: "contact_ai_actions.generate_tasks",
          additionalData: {
            contactId: contactId.slice(0, 8) + "...",
            userId: userId.slice(0, 8) + "...",
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Get contact with all related context data
   */
  private static async getContactWithContext(
    userId: string,
    contactId: string,
  ): Promise<ContactWithContext> {
    const db = await getDb();

    // Get contact details
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });

    if (!contact || contact.userId !== userId) {
      return { contact: null, calendarEvents: [], interactions: [], notes: [], timeline: [] };
    }

    // Get calendar events where this contact was involved
    const eventsResult = await db.execute(sql`
      SELECT 
        ce.title,
        ce.description,
        ce.location,
        ce.start_time,
        ce.end_time,
        ce.event_type,
        ce.business_category,
        ce.attendees,
        ce.created_at
      FROM calendar_events ce
      WHERE ce.user_id = ${userId}
        AND ce.attendees IS NOT NULL
        AND ce.attendees::text LIKE ${`%${contact.primaryEmail ?? ""}%`}
      ORDER BY ce.start_time DESC
      LIMIT 20
    `);

    // Get interactions
    const contactInteractions = await db.query.interactions.findMany({
      where: sql`user_id = ${userId} AND contact_id = ${contactId}`,
      orderBy: sql`occurred_at DESC`,
      limit: 20,
    });

    // Get notes
    const contactNotes = await db.query.notes.findMany({
      where: sql`user_id = ${userId} AND contact_id = ${contactId}`,
      orderBy: sql`created_at DESC`,
      limit: 10,
    });

    // Get timeline events
    const timeline = await db.query.contactTimeline.findMany({
      where: sql`contact_id = ${contactId}`,
      orderBy: sql`occurred_at DESC`,
      limit: 15,
    });

    void logger.info("Contact data loaded", {
      operation: "load_contact_context",
    });

    return {
      contact,
      calendarEvents: (eventsResult || []) as unknown as CalendarEventData[],
      interactions: contactInteractions,
      notes: contactNotes,
      timeline,
    };
  }

  /**
   * Generate comprehensive AI analysis of contact
   */
  private static async generateContactAnalysis(
    contactData: ContactWithContext,
  ): Promise<ContactAIInsightResponse> {
    const { contact, calendarEvents, interactions, notes, timeline } = contactData;

    if (!contact) {
      throw new Error("Contact not found");
    }

    const eventsText = calendarEvents
      .slice(0, 5)
      .map(
        (e: CalendarEventData) =>
          `${e.title} (${e.event_type ?? "Unknown"}) - ${new Date(e.start_time).toLocaleDateString()}`,
      )
      .join("\n");

    const notesText = notes
      .slice(0, 3)
      .map((n: Note) => n.content)
      .join("\n");
    const recentInteractions = interactions
      .slice(0, 3)
      .map(
        (i: Interaction) =>
          `${i.type}: ${i.subject ?? "No subject"} - ${new Date(i.occurredAt).toLocaleDateString()}`,
      )
      .join("\n");

    const prompt = `
As an AI assistant for a wellness/yoga business, analyze this contact and provide conversational insights:

Contact: ${contact.displayName}
Email: ${contact.primaryEmail ?? "No email"}
Phone: ${contact.primaryPhone ?? "No phone"}
Stage: ${contact.stage ?? "Unknown"}
Tags: ${Array.isArray(contact.tags) ? contact.tags.join(", ") : "None"}
Current Notes: ${notes.length > 0 ? notes.map((n) => n.content).join("; ") : "No notes"}

Recent Calendar Events (${calendarEvents.length} total):
${eventsText ?? "No recent events"}

Recent Interactions (${interactions.length} total):
${recentInteractions ?? "No recent interactions"}

Contact Notes:
${notesText ?? "No notes recorded"}

Timeline Events: ${timeline.length} events recorded

Please provide insights in JSON format:
{
  "insights": "3-4 sentences of conversational analysis about this contact's relationship with the business",
  "suggestions": ["3-4 specific actionable suggestions for improving the relationship"],
  "nextSteps": ["2-3 immediate next steps to take with this contact"],
  "keyFindings": ["3-4 key insights or patterns about this contact"],
  "confidence": 0.85
}

Focus on:
- Relationship health and engagement patterns
- Business opportunities and risks
- Communication preferences
- Service interests and needs
- Actionable next steps for better service
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      void logger.info("Calling OpenAI API for insights", {
        operation: "openai_api_call",
      });

      const result = JSON.parse(
        response.choices[0]?.message?.content ?? "{}",
      ) as AIAnalysisResponse;

      const insights =
        result.insights ??
        `${contact.displayName} has ${calendarEvents.length} calendar interactions and ${interactions.length} recorded interactions.`;

      const suggestions = result.suggestions ?? [
        `Follow up with ${contact.displayName}`,
        "Review their service preferences",
      ];

      const nextSteps = result.nextSteps ?? [
        "Schedule follow-up call",
        "Send service recommendation",
      ];
      const keyFindings = result.keyFindings ?? [
        `${calendarEvents.length} calendar events`,
        `${interactions.length} interactions recorded`,
      ];

      return {
        insights,
        suggestions,
        nextSteps,
        keyFindings,
        confidence: Math.min(1.0, Math.max(0.0, result.confidence ?? 0.7)),
      };
    } catch (error) {
      await logger.error(
        "OpenAI analysis error",
        {
          operation: "contacts.ai_actions.analyze",
          additionalData: { contactId: contact.id },
        },
        error instanceof Error ? error : undefined,
      );

      // Fallback response
      return {
        insights: `${contact.displayName} is a ${contact.stage ?? "prospect"} with ${calendarEvents.length} calendar events and ${interactions.length} interactions. ${calendarEvents.length > 5 ? "Highly engaged with services." : "Limited recent engagement."}`,
        suggestions: [
          "Review recent interaction patterns",
          "Consider personalized service recommendations",
          "Schedule follow-up based on their preferences",
        ],
        nextSteps: ["Review their service history", "Plan appropriate follow-up"],
        keyFindings: [
          `${calendarEvents.length} calendar events recorded`,
          `${interactions.length} total interactions`,
          `Current stage: ${contact.stage ?? "Unknown"}`,
        ],
        confidence: 0.6,
      };
    }
  }

  /**
   * Generate AI-assisted email content
   */
  private static async generateEmailContent(
    contactData: ContactWithContext,
    purpose?: string,
  ): Promise<ContactEmailSuggestion> {
    const { contact, calendarEvents, interactions } = contactData;

    if (!contact) {
      throw new Error("Contact not found");
    }

    const lastEvent = calendarEvents[0];
    const lastInteraction = interactions[0];

    const prompt = `
Generate an email for this wellness/yoga business contact:

Contact: ${contact.displayName}
Email: ${contact.primaryEmail}
Stage: ${contact.stage ?? "Unknown"}
Last Event: ${lastEvent ? `${lastEvent.title} on ${new Date(lastEvent.start_time).toLocaleDateString()}` : "None"}
Last Interaction: ${lastInteraction ? `${lastInteraction.type} on ${new Date(lastInteraction.occurredAt).toLocaleDateString()}` : "None"}
Purpose: ${purpose ?? "General follow-up"}

${
  calendarEvents.length > 0
    ? `Recent Services: ${calendarEvents
        .slice(0, 3)
        .map((e: CalendarEventData) => e.title)
        .join(", ")}`
    : ""
}

Please generate an email in JSON format:
{
  "subject": "Personalized subject line",
  "content": "Professional yet warm email content (3-4 paragraphs)",
  "tone": "friendly",
  "purpose": "Brief description of email purpose"
}

Guidelines:
- Be warm but professional
- Reference specific services if available
- Include a clear call-to-action
- Keep it personal and relevant to their wellness journey
- Tone should be "professional", "friendly", "casual", or "formal"
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as AIEmailResponse;

      const subject = result.subject ?? `Following up with you, ${contact.displayName}`;
      const content =
        result.content ??
        `Hi ${contact.displayName},\n\nI hope you're doing well! I wanted to reach out and see how you've been enjoying our services.\n\nBest regards,\nYour Wellness Team`;
      const tone = result.tone ?? "friendly";
      const emailPurpose = result.purpose ?? purpose ?? "General follow-up";

      return {
        subject,
        content,
        tone,
        purpose: emailPurpose,
      };
    } catch (error) {
      await logger.error(
        "Email generation error",
        {
          operation: "contacts.ai_actions.generate_email",
          additionalData: { contactId: contact.id },
        },
        error instanceof Error ? error : undefined,
      );

      return {
        subject: `Following up with you, ${contact.displayName}`,
        content: `Hi ${contact.displayName},\n\nI hope you're doing well! I wanted to reach out and see how you've been enjoying our services.\n\n${lastEvent ? `I saw you attended ${lastEvent.title} recently - I'd love to hear how it went!` : "I'd love to hear how you're finding our services."}\n\nPlease let me know if there's anything I can help with or if you have any questions about our upcoming classes and services.\n\nBest regards,\nYour Wellness Team`,
        tone: "friendly",
        purpose: purpose ?? "General follow-up",
      };
    }
  }

  /**
   * Generate AI note suggestions
   */
  private static async generateNoteContent(
    contactData: ContactWithContext,
  ): Promise<ContactNoteSuggestion[]> {
    const { contact, calendarEvents, interactions } = contactData;

    if (!contact) {
      throw new Error("Contact not found");
    }

    const prompt = `
Based on this contact's data, suggest relevant notes to add:

Contact: ${contact.displayName} (${contact.stage ?? "Unknown stage"})
Recent Events: ${
      calendarEvents
        .slice(0, 3)
        .map((e: CalendarEventData) => e.title)
        .join(", ") ?? "None"
    }
Last Interaction: ${interactions[0] ? interactions[0].type : "None"}
Current Tags: ${Array.isArray(contact.tags) ? contact.tags.join(", ") : "None"}

Generate note suggestions in JSON format:
{
  "notes": [
    {
      "content": "Specific note content",
      "category": "interaction|observation|follow-up|preference",
      "priority": "high|medium|low"
    }
  ]
}

Suggest 3-5 relevant notes that would be valuable to track about this contact.
Categories:
- interaction: Record of specific interactions
- observation: Behavioral or preference observations  
- follow-up: Reminders for future actions
- preference: Service or communication preferences
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as AINoteResponse;

      return (
        result.notes ?? [
          {
            content: `Follow up on ${contact.displayName}'s service preferences`,
            category: "follow-up",
            priority: "medium",
          },
          {
            content: `Review engagement pattern - ${calendarEvents.length} calendar events`,
            category: "observation",
            priority: "low",
          },
        ]
      );
    } catch (error) {
      await logger.error(
        "Note generation error",
        {
          operation: "contacts.ai_actions.generate_notes",
          additionalData: { contactId: contact.id },
        },
        error instanceof Error ? error : undefined,
      );

      return [
        {
          content: `Follow up with ${contact.displayName} on their wellness goals`,
          category: "follow-up",
          priority: "medium",
        },
        {
          content: `${calendarEvents.length > 3 ? "Regular attendee" : "Infrequent attendee"} - adjust communication accordingly`,
          category: "observation",
          priority: "low",
        },
      ];
    }
  }

  /**
   * Generate AI task suggestions
   */
  private static async generateTaskContent(
    contactData: ContactWithContext,
  ): Promise<ContactTaskSuggestion[]> {
    const { contact, calendarEvents } = contactData;

    if (!contact) {
      throw new Error("Contact not found");
    }

    const daysSinceLastEvent = calendarEvents[0]
      ? Math.floor(
          (Date.now() - new Date(calendarEvents[0].start_time).getTime()) / (1000 * 60 * 60 * 24),
        )
      : 999;

    const prompt = `
Based on this contact's data, suggest tasks to improve their experience:

Contact: ${contact.displayName}
Stage: ${contact.stage ?? "Unknown"}
Days since last event: ${daysSinceLastEvent}
Total events: ${calendarEvents.length}
Recent services: ${
      calendarEvents
        .slice(0, 3)
        .map((e: CalendarEventData) => e.title)
        .join(", ") ?? "None"
    }

Generate task suggestions in JSON format:
{
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Detailed description with context",
      "priority": "urgent|high|medium|low",
      "estimatedMinutes": 15,
      "category": "follow-up|outreach|service|admin"
    }
  ]
}

Suggest 2-4 specific, actionable tasks. Consider:
- Follow-up timing based on last interaction
- Service recommendations based on history
- Relationship building opportunities
- Administrative tasks for better service

Categories:
- follow-up: Direct contact or check-in tasks
- outreach: Proactive communication or invitations
- service: Service delivery or customization tasks
- admin: Data management or planning tasks
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as AITaskResponse;

      return (
        result.tasks ?? [
          {
            title: `Follow up with ${contact.displayName}`,
            description: `Check in on their wellness journey and see if they need any support`,
            priority: daysSinceLastEvent > 30 ? "high" : "medium",
            estimatedMinutes: 20,
            category: "follow-up",
          },
        ]
      );
    } catch (error) {
      await logger.error(
        "Task generation error",
        {
          operation: "contacts.ai_actions.generate_tasks",
          additionalData: { contactId: contact.id },
        },
        error instanceof Error ? error : undefined,
      );

      const priority =
        daysSinceLastEvent > 60 ? "urgent" : daysSinceLastEvent > 30 ? "high" : "medium";

      return [
        {
          title: `Follow up with ${contact.displayName}`,
          description: `Contact hasn't engaged in ${daysSinceLastEvent} days. Check in and see how they're doing.`,
          priority,
          estimatedMinutes: 20,
          category: "follow-up",
        },
        {
          title: `Review service recommendations for ${contact.displayName}`,
          description: `Based on their ${calendarEvents.length} previous sessions, suggest relevant upcoming classes or services.`,
          priority: "medium",
          estimatedMinutes: 15,
          category: "service",
        },
      ];
    }
  }
}
