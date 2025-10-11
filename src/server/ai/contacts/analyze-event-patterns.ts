// Extracted event patterns analyzer

import { logger } from "@/lib/observability";

interface CalendarEventData {
  title: string;
  description?: string | null;
  start_time: string;
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

function extractEventType(title: string, description?: string | null): string {
  // Validate and normalize inputs
  const normalizedTitle = (title || "").trim().toLowerCase();
  const normalizedDescription = (description || "").trim().toLowerCase();

  if (!normalizedTitle && !normalizedDescription) {
    return "Other";
  }

  // Combine title and description for analysis
  const combinedText = `${normalizedTitle} ${normalizedDescription}`.trim();

  // Prioritized list of event type patterns (more specific first, with word boundaries)
  const eventTypePatterns = [
    { pattern: /\bsprint planning\b|\bone-on-one\b|\b1:1\b/, type: "Meeting" },
    { pattern: /\bstandup\b|\bcheck-in\b|\bsync\b/, type: "Meeting" },
    { pattern: /\bappointment\b|\bsession\b|\bconsultation\b/, type: "Appointment" },
    { pattern: /\bworkshop\b|\btraining\b|\bclass\b|\blesson\b/, type: "Workshop" },
    { pattern: /\binterview\b|\bhiring\b|\brecruitment\b/, type: "Interview" },
    { pattern: /\bdemo\b|\bpresentation\b|\bpitch\b/, type: "Demo" },
    { pattern: /\bwebinar\b|\bseminar\b|\bconference\b/, type: "Webinar" },
    { pattern: /\bcall\b|\bphone\b|\bvideo\b/, type: "Call" },
    { pattern: /\blunch\b|\bdinner\b|\bcoffee\b|\bmeal\b/, type: "Social" },
    { pattern: /\breview\b|\bretrospective\b|\bretro\b/, type: "Meeting" },
    { pattern: /\bplanning\b/, type: "Meeting" },
    { pattern: /\bmeeting\b/, type: "Meeting" },
  ];

  // Find the first matching pattern
  for (const { pattern, type } of eventTypePatterns) {
    if (pattern.test(combinedText)) {
      return type;
    }
  }

  return "Other";
}

function extractBusinessCategory(title: string, description?: string | null): string {
  // Validate and normalize inputs
  const normalizedTitle = (title || "").trim().toLowerCase();
  const normalizedDescription = (description || "").trim().toLowerCase();

  if (!normalizedTitle && !normalizedDescription) {
    return "Other";
  }

  // Combine title and description for analysis
  const combinedText = `${normalizedTitle} ${normalizedDescription}`.trim();

  // Business category patterns grouped by domain
  const categoryPatterns = [
    // Sales patterns
    { patterns: [/demo|prospect|lead|sales|pitch|proposal|quote/], category: "Sales" },
    // HR patterns
    { patterns: [/interview|hiring|onboarding|hr|recruitment|resume|cv/], category: "HR" },
    // Engineering patterns
    {
      patterns: [/deployment|sprint|standup|code|development|bug|feature|tech/],
      category: "Engineering",
    },
    // Finance patterns
    { patterns: [/invoice|billing|payment|budget|financial|accounting/], category: "Finance" },
    // Marketing patterns
    {
      patterns: [/marketing|campaign|promotion|advertising|social media|content/],
      category: "Marketing",
    },
    // Operations patterns
    { patterns: [/operations|process|workflow|procedure|policy/], category: "Operations" },
    // Customer service patterns
    {
      patterns: [/support|ticket|issue|complaint|customer service|help/],
      category: "Customer Service",
    },
  ];

  // Find the first matching category
  for (const { patterns, category } of categoryPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        return category;
      }
    }
  }

  return "Other";
}

export async function analyzeEventPatterns(events: CalendarEventData[]): Promise<EventPatterns> {
  const totalEvents = events.length;

  // Create a sorted copy to ensure chronological order
  const sortedEvents = events.slice().sort((a, b) => {
    const timeA = new Date(a.start_time).getTime();
    const timeB = new Date(b.start_time).getTime();
    return timeA - timeB;
  });

  const recentEvents = sortedEvents.filter((e) => {
    const daysSince = (Date.now() - new Date(e.start_time).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }).length;

  const eventTypes = sortedEvents
    .map((e) => extractEventType(e.title, e.description))
    .filter(Boolean);
  const businessCategories = sortedEvents
    .map((e) => extractBusinessCategory(e.title, e.description))
    .filter(Boolean);

  await logger.debug("Event analysis", {
    operation: "analyze_event_patterns",
    additionalData: {
      eventCount: eventTypes.length,
      eventTypes: [...new Set(eventTypes)],
      businessCategories: [...new Set(businessCategories)],
    },
  });

  const firstEventDate = sortedEvents.length > 0 ? new Date(sortedEvents[0]!.start_time) : null;
  const lastEventDate =
    sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1]!.start_time) : null;

  const relationshipDays = (() => {
    if (!firstEventDate || !lastEventDate) {
      return 0;
    }

    const diffMs = lastEventDate.getTime() - firstEventDate.getTime();
    if (diffMs <= 0) {
      return 0;
    }

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  })();

  return {
    totalEvents,
    recentEvents,
    eventTypes: Array.from(new Set(eventTypes)),
    businessCategories: Array.from(new Set(businessCategories)),
    relationshipDays,
    firstEventDate,
    lastEventDate,
    averageEventsPerMonth: totalEvents * (30 / Math.max(relationshipDays, 1)),
  };
}
