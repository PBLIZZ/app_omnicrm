import { getDb } from "@/server/db/client";
import { notes } from "@/server/db/schema";
import { calendarStorage } from "@/server/storage/calendar.storage";
import { getUserContext } from "@/server/repositories/auth-user.repo";
import OpenAI from "openai";

import type { CalendarEventData } from "@/server/storage/calendar.storage";

// Interface for processed event details used in AI analysis
interface EventDetail {
  title: string;
  description: string;
  date: Date;
  type: string;
  category: string;
  location: string;
}

// Interface for event patterns analysis
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

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

export interface ContactInsights {
  stage: ClientStage;
  tags: WellnessTag[];
  confidenceScore: number;
}

export interface ContactInsightsWithNote extends ContactInsights {
  noteContent: string;
}

export type ClientStage =
  | "Prospect"
  | "New Client"
  | "Core Client"
  | "Referring Client"
  | "VIP Client"
  | "Lost Client"
  | "At Risk Client";

export type WellnessTag =
  // Service Types
  | "Yoga"
  | "Massage"
  | "Meditation"
  | "Pilates"
  | "Reiki"
  | "Acupuncture"
  | "Personal Training"
  | "Nutrition Coaching"
  | "Life Coaching"
  | "Therapy"
  | "Workshops"
  | "Retreats"
  | "Group Classes"
  | "Private Sessions"

  // Demographics
  | "Senior"
  | "Young Adult"
  | "Professional"
  | "Parent"
  | "Student"
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "VIP"
  | "Local"
  | "Traveler"

  // Goals & Interests
  | "Stress Relief"
  | "Weight Loss"
  | "Flexibility"
  | "Strength Building"
  | "Pain Management"
  | "Mental Health"
  | "Spiritual Growth"
  | "Mindfulness"
  | "Athletic Performance"
  | "Injury Recovery"
  | "Prenatal"
  | "Postnatal"

  // Engagement Patterns
  | "Regular Attendee"
  | "Weekend Warrior"
  | "Early Bird"
  | "Evening Preferred"
  | "Seasonal Client"
  | "Frequent Visitor"
  | "Occasional Visitor"
  | "High Spender"
  | "Referral Source"
  | "Social Media Active";

export class ContactIntelligenceService {
  /**
   * Generate AI insights for a contact based on their calendar interactions
   */
  static async generateContactInsights(
    userId: string,
    contactEmail: string,
  ): Promise<ContactInsightsWithNote> {
    try {
      // console.log(`🧠 Generating AI insights for contact: ${contactEmail}`);

      // Get user context to avoid analyzing the user themselves
      const userContext = await this.getUserContext(userId);
      if (userContext && contactEmail.toLowerCase() === userContext.email.toLowerCase()) {
        // console.log(`⚠️ Skipping AI insights for user's own email: ${contactEmail}`);
        return {
          noteContent: "This is your own contact record - no AI analysis needed",
          stage: "Prospect", // Default for user's own record
          tags: [],
          confidenceScore: 1.0,
        };
      }

      // Get calendar events involving this contact
      const events = await this.getContactEvents(userId, contactEmail);

      if (events.length === 0) {
        return this.getDefaultInsights(contactEmail);
      }

      // Analyze event patterns
      const eventAnalysis = this.analyzeEventPatterns(events);

      // Generate AI insights using OpenAI
      const aiInsights = await this.generateAIAnalysis(contactEmail, events, eventAnalysis);

      // console.log(`✅ Generated insights for ${contactEmail}: ${aiInsights.stage} stage`);

      return aiInsights;
    } catch (error) {
      console.error(`❌ Error generating insights for ${contactEmail}:`, error);
      return this.getDefaultInsights();
    }
  }

  /**
   * Bulk generate insights for multiple contacts
   */
  static async bulkGenerateInsights(
    userId: string,
    contactEmails: string[],
  ): Promise<Map<string, ContactInsightsWithNote>> {
    const insights = new Map<string, ContactInsightsWithNote>();

    // console.log(`🔄 Generating insights for ${contactEmails.length} contacts...`);

    for (const email of contactEmails) {
      const contactInsights = await this.generateContactInsights(userId, email);
      insights.set(email, contactInsights);

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return insights;
  }

  /**
   * Get user context to identify the user's own email
   */
  private static async getUserContext(userId: string): Promise<{ email: string } | null> {
    return await getUserContext(userId);
  }

  /**
   * Get calendar events for a specific contact
   */
  private static async getContactEvents(
    userId: string,
    contactEmail: string,
  ): Promise<CalendarEventData[]> {
    return await calendarStorage.getContactEvents(userId, contactEmail);
  }

  /**
   * Analyze event patterns for insights
   */
  private static analyzeEventPatterns(events: CalendarEventData[]): EventPatterns {
    const totalEvents = events.length;
    const recentEvents = events.filter((e) => {
      const eventDate = new Date(e.start_time);
      const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    }).length;

    // Extract event types and business categories from titles and descriptions
    const eventTypes = events
      .map((e) => this.extractEventType(e.title, e.description))
      .filter(Boolean);
    const businessCategories = events
      .map((e) => this.extractBusinessCategory(e.title, e.description))
      .filter(Boolean);

    // console.log(`📊 Event analysis: ${eventTypes.length} events with types [${[...new Set(eventTypes)].join(', ')}]`);
    // console.log(`🏷️ Business categories: [${[...new Set(businessCategories)].join(', ')}]`);

    const firstEventDate =
      events.length > 0 && events[events.length - 1]?.start_time
        ? new Date(events[events.length - 1]!.start_time)
        : null;
    const lastEventDate =
      events.length > 0 && events[0]?.start_time ? new Date(events[0]!.start_time) : null;

    const relationshipDays =
      firstEventDate && lastEventDate
        ? Math.floor((lastEventDate.getTime() - firstEventDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      totalEvents,
      recentEvents,
      eventTypes: Array.from(new Set(eventTypes)),
      businessCategories: Array.from(new Set(businessCategories)),
      relationshipDays,
      firstEventDate,
      lastEventDate,
      averageEventsPerMonth: relationshipDays > 0 ? totalEvents / (relationshipDays / 30) : 0,
    };
  }

  /**
   * Generate AI analysis using OpenAI
   */
  private static async generateAIAnalysis(
    contactEmail: string,
    events: CalendarEventData[],
    patterns: EventPatterns,
  ): Promise<ContactInsightsWithNote> {
    // Enhanced event analysis for richer insights
    const eventDetails = events.map((e) => ({
      title: e.title,
      description: e.description || "",
      date: new Date(e.start_time),
      type: this.extractEventType(e.title, e.description),
      category: this.extractBusinessCategory(e.title, e.description),
      location: e.location || "",
    }));

    // Analyze time patterns
    const timeAnalysis = this.analyzeTimePatterns(eventDetails);

    // Analyze service preferences
    const serviceAnalysis = this.analyzeServicePreferences(eventDetails);

    // Create detailed event context
    const recentEvents = eventDetails
      .slice(0, 5)
      .map((e) => `"${e.title}" (${e.type}) on ${e.date.toLocaleDateString()}`)
      .join("\n");

    const prompt = `
You are an expert wellness business consultant analyzing a client's interaction history. Generate detailed, personal insights about this contact.

CONTACT ANALYSIS:
Email: ${contactEmail}
Relationship Duration: ${patterns.relationshipDays} days (${patterns.firstEventDate ? new Date(patterns.firstEventDate).toLocaleDateString() : "Unknown"} to ${patterns.lastEventDate ? new Date(patterns.lastEventDate).toLocaleDateString() : "Unknown"})
Total Interactions: ${patterns.totalEvents} events
Recent Activity: ${patterns.recentEvents} events in last 30 days
Frequency: ${patterns.averageEventsPerMonth.toFixed(1)} events/month

INTERACTION PATTERNS:
Primary Services: ${serviceAnalysis.primaryServices.join(", ")}
Service Categories: ${patterns.businessCategories.join(", ")}
Event Types: ${patterns.eventTypes.join(", ")}
Preferred Times: ${timeAnalysis.preferredTimes.join(", ")}
Consistency: ${timeAnalysis.consistency}

RECENT EVENT HISTORY:
${recentEvents}

Generate a comprehensive wellness business profile in JSON format:

{
  "notes": "Write 3-4 detailed, personal sentences about this client's wellness journey, preferences, patterns, and relationship with your business. Be specific about their service choices, frequency patterns, and any notable behaviors. Make it feel like you personally know this client.",
  "stage": "Choose from: Prospect, New Client, Core Client, Referring Client, VIP Client, Lost Client, At Risk Client",
  "tags": ["Array of 4-8 specific wellness tags that reflect their actual usage patterns"],
  "confidenceScore": 0.85
}

STAGE CLASSIFICATION (Wellness Business Context):
- Prospect: Someone who inquired but never attended any sessions/classes (would have 0 events)
- New Client: 1-5 events - recently started their wellness journey with you
- Core Client: 6+ events - established regular relationship, reliable attendee
- Referring Client: Shows evidence of bringing others (group bookings, plus-ones mentioned)
- VIP Client: 10+ events + premium services (private sessions, retreats, high-value services)
- Lost Client: Had regular attendance (6+ events) but no activity in 60+ days
- At Risk Client: Previously regular (6+ events) but declining frequency in recent months

WELLNESS TAG CATEGORIES (choose most relevant):
Services Used: Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy, Workshops, Retreats, Group Classes, Private Sessions

Client Demographics: Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced, VIP, Local, Traveler

Wellness Goals: Stress Relief, Weight Loss, Flexibility, Strength Building, Pain Management, Mental Health, Spiritual Growth, Mindfulness, Athletic Performance, Injury Recovery, Prenatal, Postnatal

Engagement Patterns: Regular Attendee, Weekend Warrior, Early Bird, Evening Preferred, Seasonal Client, Frequent Visitor, Occasional Visitor, High Spender, Referral Source, Social Media Active

ANALYSIS REQUIREMENTS:
1. Make insights PERSONAL - mention specific patterns you see
2. Reference actual services they use, not generic wellness terms
3. Note any preferences (times, types, frequency)
4. Comment on their wellness journey progression
5. Be specific about their relationship stage with your business
6. Confidence should reflect data quality (more events = higher confidence)

Generate insights that show you understand this individual's wellness journey and relationship with your business.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7, // Add explicit temperature for consistent results
      });

      const messageContent = response.choices?.[0]?.message?.content;
      const result = messageContent ? JSON.parse(messageContent) : {};

      return {
        noteContent: result.notes || `Contact with ${patterns.totalEvents} wellness interactions`,
        stage: this.validateStage(result.stage),
        tags: this.validateTags(result.tags || []),
        confidenceScore: Math.min(1.0, Math.max(0.0, result.confidenceScore || 0.5)),
      };
    } catch (error) {
      console.error("❌ OpenAI analysis error:", error);
      return this.getBasicInsights(patterns);
    }
  }

  /**
   * Generate basic insights without AI
   */
  private static getBasicInsights(patterns: EventPatterns): ContactInsightsWithNote {
    let stage: ClientStage = "Prospect";
    let confidenceScore = 0.3;

    // Apply corrected wellness business logic
    if (patterns.totalEvents >= 10) {
      stage = "VIP Client";
      confidenceScore = 0.9; // High confidence for 10+ events
    } else if (patterns.totalEvents >= 6) {
      stage = "Core Client";
      confidenceScore = 0.85; // High confidence for 6+ events
    } else if (patterns.totalEvents >= 1) {
      // CRITICAL FIX: Anyone with 1+ events is a client, not prospect
      stage = "New Client";
      confidenceScore = 0.75; // Good confidence for event attendance
    } else if (patterns.recentEvents === 0 && patterns.totalEvents > 0) {
      stage = "Lost Client";
      confidenceScore = 0.7;
    }
    // Only contacts with 0 events remain as 'Prospect'

    const tags: WellnessTag[] = [];

    // Enhanced tag detection with better coverage
    if (patterns.totalEvents >= 3) tags.push("Regular Attendee");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("yoga")))
      tags.push("Yoga");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("massage")))
      tags.push("Massage");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("meditation")))
      tags.push("Meditation");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("pilates")))
      tags.push("Pilates");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("workshop")))
      tags.push("Workshops");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("private")))
      tags.push("Private Sessions");
    if (patterns.eventTypes.some((t: string) => t?.toLowerCase().includes("class")))
      tags.push("Group Classes");

    // Business category tags
    if (patterns.businessCategories.some((c: string) => c?.toLowerCase().includes("wellness")))
      tags.push("Stress Relief");
    if (patterns.businessCategories.some((c: string) => c?.toLowerCase().includes("fitness")))
      tags.push("Strength Building");

    // Engagement pattern tags
    if (patterns.averageEventsPerMonth >= 2) tags.push("Frequent Visitor");
    if (patterns.totalEvents >= 1 && patterns.totalEvents < 3) tags.push("Occasional Visitor");

    // Ensure we have meaningful tags based on actual data
    if (tags.length === 0 && patterns.totalEvents > 0) {
      // If we have events but no specific tags, add general wellness tags
      tags.push("Beginner", "Stress Relief");
    }

    return {
      noteContent: `Contact with ${patterns.totalEvents} wellness interactions over ${patterns.relationshipDays} days. ${patterns.recentEvents > 0 ? "Recently active." : "No recent activity."}`,
      stage,
      tags,
      confidenceScore,
    };
  }

  /**
   * Get default insights for contacts with no events
   */
  private static getDefaultInsights(contactEmail?: string): ContactInsightsWithNote {
    return {
      noteContent: contactEmail
        ? `Contact found in calendar data but no direct event interactions recorded. May be a secondary attendee or contact reference.`
        : "New contact from calendar sync - no interaction history available",
      stage: "Prospect", // Note: This should be manually verified - could be Non-Client or Lost Client
      tags: [],
      confidenceScore: 0.1, // Very low confidence for 0 events
    };
  }

  /**
   * Validate and normalize stage value
   */
  private static validateStage(stage: string): ClientStage {
    const validStages: ClientStage[] = [
      "Prospect",
      "New Client",
      "Core Client",
      "Referring Client",
      "VIP Client",
      "Lost Client",
      "At Risk Client",
    ];

    return validStages.includes(stage as ClientStage) ? (stage as ClientStage) : "Prospect";
  }

  /**
   * Create AI-generated note for a contact
   */
  static async createAINote(contactId: string, userId: string, noteContent: string): Promise<void> {
    try {
      const db = await getDb();
      await db.insert(notes).values({
        contactId,
        userId,
        content: `[AI Generated] ${noteContent}`,
      });

      // console.log(`✅ Created AI note for contact ${contactId}`);
    } catch (error) {
      console.error(`❌ Error creating AI note for contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze time patterns for enhanced insights
   */
  private static analyzeTimePatterns(events: EventDetail[]): {
    preferredTimes: string[];
    consistency: string;
  } {
    const times = events.map((e) => e.date.getHours());

    // Categorize times
    const timeCategories: { [key: string]: number } = {};
    times.forEach((hour) => {
      if (hour < 10) timeCategories["Early Morning"] = (timeCategories["Early Morning"] || 0) + 1;
      else if (hour < 12)
        timeCategories["Late Morning"] = (timeCategories["Late Morning"] || 0) + 1;
      else if (hour < 17) timeCategories["Afternoon"] = (timeCategories["Afternoon"] || 0) + 1;
      else timeCategories["Evening"] = (timeCategories["Evening"] || 0) + 1;
    });

    // Get preferred times
    const preferredTimes = Object.entries(timeCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time);

    // Analyze consistency
    const totalDays =
      events.length > 0
        ? Math.ceil(
            (new Date(Math.max(...events.map((e) => e.date.getTime()))).getTime() -
              new Date(Math.min(...events.map((e) => e.date.getTime()))).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

    let consistency = "Irregular";
    if (events.length >= 8 && totalDays > 0) {
      const frequency = events.length / (totalDays / 7); // events per week
      if (frequency >= 2) consistency = "Very Regular (2+ times/week)";
      else if (frequency >= 1) consistency = "Regular (weekly)";
      else if (frequency >= 0.5) consistency = "Semi-Regular (bi-weekly)";
      else consistency = "Occasional";
    }

    return { preferredTimes, consistency };
  }

  /**
   * Analyze service preferences for enhanced insights
   */
  private static analyzeServicePreferences(events: EventDetail[]): {
    primaryServices: string[];
    preferences: string[];
  } {
    const serviceCounts: { [key: string]: number } = {};
    const locationCounts: { [key: string]: number } = {};

    events.forEach((e) => {
      const category = e.category;
      serviceCounts[category] = (serviceCounts[category] || 0) + 1;

      if (e.location) {
        locationCounts[e.location] = (locationCounts[e.location] || 0) + 1;
      }
    });

    const primaryServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([service]) => service);

    const preferences = [];
    if (events.some((e) => e.type === "private" || e.title.toLowerCase().includes("private"))) {
      preferences.push("Private Sessions");
    }
    if (events.some((e) => e.type === "workshop")) {
      preferences.push("Workshops");
    }

    return { primaryServices, preferences };
  }

  /**
   * Extract event type from title and description
   */
  private static extractEventType(title: string, description?: string | null): string {
    const text = `${title} ${description || ""}`.toLowerCase();

    // Event type patterns
    if (/\b(class|lesson|session)\b/.test(text)) return "class";
    if (/\b(workshop|seminar|training)\b/.test(text)) return "workshop";
    if (/\b(appointment|consultation|private|1-on-1)\b/.test(text)) return "appointment";
    if (/\b(retreat|getaway|weekend)\b/.test(text)) return "retreat";
    if (/\b(meeting|discussion|planning)\b/.test(text)) return "meeting";

    return "event"; // default
  }

  /**
   * Extract business category from title and description
   */
  private static extractBusinessCategory(title: string, description?: string | null): string {
    const text = `${title} ${description || ""}`.toLowerCase();

    // Business category patterns
    if (/\b(yoga|asana|vinyasa|hatha|bikram|yin|power yoga)\b/.test(text)) return "yoga";
    if (/\b(massage|therapeutic|deep tissue|swedish|aromatherapy)\b/.test(text)) return "massage";
    if (/\b(meditation|mindfulness|zen|breathing)\b/.test(text)) return "meditation";
    if (/\b(pilates|reformer|mat pilates)\b/.test(text)) return "pilates";
    if (/\b(reiki|energy healing|chakra)\b/.test(text)) return "reiki";
    if (/\b(acupuncture|needle|tcm)\b/.test(text)) return "acupuncture";
    if (/\b(nutrition|diet|health coaching)\b/.test(text)) return "nutrition";
    if (/\b(therapy|counseling|mental health)\b/.test(text)) return "therapy";
    if (/\b(fitness|training|workout|gym)\b/.test(text)) return "fitness";

    return "wellness"; // default wellness category
  }

  /**
   * Validate and filter tags
   */
  private static validateTags(tags: string[]): WellnessTag[] {
    const validTags: WellnessTag[] = [
      // Services
      "Yoga",
      "Massage",
      "Meditation",
      "Pilates",
      "Reiki",
      "Acupuncture",
      "Personal Training",
      "Nutrition Coaching",
      "Life Coaching",
      "Therapy",
      "Workshops",
      "Retreats",
      "Group Classes",
      "Private Sessions",

      // Demographics
      "Senior",
      "Young Adult",
      "Professional",
      "Parent",
      "Student",
      "Beginner",
      "Intermediate",
      "Advanced",
      "VIP",
      "Local",
      "Traveler",

      // Goals
      "Stress Relief",
      "Weight Loss",
      "Flexibility",
      "Strength Building",
      "Pain Management",
      "Mental Health",
      "Spiritual Growth",
      "Mindfulness",
      "Athletic Performance",
      "Injury Recovery",
      "Prenatal",
      "Postnatal",

      // Patterns
      "Regular Attendee",
      "Weekend Warrior",
      "Early Bird",
      "Evening Preferred",
      "Seasonal Client",
      "Frequent Visitor",
      "Occasional Visitor",
      "High Spender",
      "Referral Source",
      "Social Media Active",
    ];

    return tags
      .filter((tag) => validTags.includes(tag as WellnessTag))
      .slice(0, 8) as WellnessTag[];
  }
}
