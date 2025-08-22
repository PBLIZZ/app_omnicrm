// Calendar event interface and types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: "meeting" | "task" | "appointment" | "reminder";
    attendees?: string[];
    location?: string;
    description?: string;
    gmailMessageId?: string; // For Gmail sync integration
    googleEventId?: string; // For Google Calendar sync
  };
}

// Event type for styling
export type EventType = "meeting" | "task" | "appointment" | "reminder";

// Event filter type
export type EventFilter = "all" | EventType;

// Mock events generator for development
export function generateMockEvents(): CalendarEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      id: "1",
      title: "Client Consultation - Sarah Johnson",
      start: new Date(today.setHours(10, 0, 0, 0)),
      end: new Date(today.setHours(11, 0, 0, 0)),
      resource: {
        type: "meeting",
        attendees: ["sarah@example.com"],
        location: "Zoom Meeting",
        description: "Wellness consultation and goal setting",
      },
    },
    {
      id: "2",
      title: "Team Standup",
      start: new Date(today.setHours(14, 0, 0, 0)),
      end: new Date(today.setHours(14, 30, 0, 0)),
      resource: {
        type: "meeting",
        attendees: ["team@company.com"],
        description: "Daily team sync",
      },
    },
    {
      id: "3",
      title: "Product Demo",
      start: new Date(tomorrow.setHours(9, 0, 0, 0)),
      end: new Date(tomorrow.setHours(10, 0, 0, 0)),
      resource: {
        type: "appointment",
        description: "Showcase new features to potential client",
      },
    },
    {
      id: "4",
      title: "Wellness Workshop Planning",
      start: new Date(tomorrow.setHours(15, 0, 0, 0)),
      end: new Date(tomorrow.setHours(16, 30, 0, 0)),
      resource: {
        type: "task",
        description: "Plan upcoming wellness workshop content",
      },
    },
  ];
}
