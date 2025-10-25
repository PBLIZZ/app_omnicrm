"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface AITimelineCardProps {
  contactId: string;
}

interface TimelineEvent {
  id: string;
  type: "note" | "session" | "email" | "call" | "meeting" | "communication";
  title: string;
  summary: string;
  date: Date;
  sentiment: "positive" | "neutral" | "negative";
  source?: string;
  interactionType?:
    | "Session Note"
    | "Health Assessment"
    | "Communication"
    | "Appointment"
    | "Follow-up";
}

// Mock data for now - in production this would come from an API
const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "1",
    type: "note",
    title: "Session Note",
    summary:
      "John made great progress from last week's setback, more homework given next appt set for 28th dec.",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    sentiment: "positive",
    interactionType: "Session Note",
  },
  {
    id: "2",
    type: "session",
    title: "Health Assessment",
    summary: "Health Assessment one to one at Main Practice Venue",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    sentiment: "positive",
    interactionType: "Health Assessment",
  },
  {
    id: "3",
    type: "communication",
    title: "Communication",
    summary: "Received complaint from john re the level of homework he got",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    sentiment: "negative",
    interactionType: "Communication",
  },
  {
    id: "4",
    type: "communication",
    title: "Communication",
    summary: "Sent john 6 books for homework",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    sentiment: "neutral",
    interactionType: "Communication",
  },
  {
    id: "5",
    type: "session",
    title: "Initial Consultation",
    summary: "First consultation call. Discussed treatment goals and health history.",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    sentiment: "positive",
    interactionType: "Appointment",
  },
];

const getSentimentColor = (sentiment: TimelineEvent["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return "bg-green-500";
    case "negative":
      return "bg-red-500";
    case "neutral":
    default:
      return "bg-blue-500";
  }
};

const getSentimentArrow = (sentiment: TimelineEvent["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return <ArrowUp className="h-3 w-3 text-green-600" />;
    case "negative":
      return <ArrowDown className="h-3 w-3 text-red-600" />;
    case "neutral":
    default:
      return <Minus className="h-3 w-3 text-blue-600" />;
  }
};

const getSentimentBadgeColor = (sentiment: TimelineEvent["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-800 border-green-200";
    case "negative":
      return "bg-red-100 text-red-800 border-red-200";
    case "neutral":
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

/**
 * AI Timeline Card Component
 * Vertical timeline with circular nodes, dates on left, events on right
 */
export function AITimelineCard({ contactId }: AITimelineCardProps): JSX.Element {
  // In production, this would fetch from an API endpoint
  const { data: timelineEvents, isLoading } = useQuery({
    queryKey: [`/api/contacts/${contactId}/timeline`],
    queryFn: async (): Promise<TimelineEvent[]> => {
      // TODO: Implement actual API call
      // For now, return mock data
      return mockTimelineEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            AI Timeline
          </CardTitle>
          <CardDescription>Loading timeline events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const events = timelineEvents || [];

  return (
    <div className="space-y-6">
      {/* Header - Outside the card like Perplexity */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Latest Contact Movements</h2>
      </div>

      {/* Timeline Content */}
      <Card>
        <CardContent className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No timeline events yet</p>
              <p className="text-sm text-muted-foreground">
                Timeline will populate as you add notes and interactions
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gray-300" />

              <div className="space-y-8">
                {events.map((event, index) => {
                  const sentimentColor = getSentimentColor(event.sentiment);
                  const sentimentArrow = getSentimentArrow(event.sentiment);
                  const badgeColor = getSentimentBadgeColor(event.sentiment);

                  return (
                    <div key={event.id} className="relative flex items-start">
                      {/* Date and Time on the left */}
                      <div className="w-20 text-sm text-gray-600 text-right pr-4 pt-1">
                        <div className="font-medium">{format(event.date, "MMM d")}</div>
                        <div className="text-xs text-gray-500">{format(event.date, "h:mm a")}</div>
                      </div>

                      {/* Circle node */}
                      <div className="relative z-10 flex-shrink-0 mx-4">
                        <div
                          className={`w-3 h-3 rounded-full ${sentimentColor} border-2 border-white shadow-sm`}
                        />
                      </div>

                      {/* Event content on the right */}
                      <div className="flex-1 min-w-0 pl-4">
                        {/* Sentiment badge with arrow */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={`text-xs px-2 py-1 ${badgeColor}`}>
                            <div className="flex items-center gap-1">
                              {sentimentArrow}
                              {event.interactionType || event.title}
                            </div>
                          </Badge>
                        </div>

                        {/* Event summary */}
                        <div className="text-sm text-gray-700 leading-relaxed">{event.summary}</div>

                        {/* Separator line */}
                        {index < events.length - 1 && (
                          <div className="mt-4 border-b border-gray-100" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
