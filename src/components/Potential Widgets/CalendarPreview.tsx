"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CalendarPreviewProps {
  className?: string;
}

export function CalendarPreview({ className }: CalendarPreviewProps): JSX.Element {
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Mock upcoming sessions (would come from the API in a real implementation)
  const mockUpcomingSessions = [
    {
      id: "1",
      title: "Initial Consultation",
      clientName: "Jane Smith",
      startTime: new Date(today.getTime() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
      durationMinutes: 60,
      location: "Virtual",
      status: "consultation",
    },
    {
      id: "2",
      title: "Follow-up Session",
      clientName: "John Doe",
      startTime: new Date(today.getTime() + 1000 * 60 * 60 * 24 + 1000 * 60 * 30).toISOString(), // Tomorrow at 10:30 AM
      durationMinutes: 90,
      location: "In-person",
      status: "confirmed",
    },
    {
      id: "3",
      title: "Group Therapy",
      clientName: "Group Session",
      startTime: new Date(today.getTime() + 1000 * 60 * 60 * 48).toISOString(), // Day after tomorrow
      durationMinutes: 120,
      location: "Online",
      status: "pending",
    },
  ];

  // Format time helper
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    if (
      date.getDate() === todayDate.getDate() &&
      date.getMonth() === todayDate.getMonth() &&
      date.getFullYear() === todayDate.getFullYear()
    ) {
      return "Today";
    } else if (
      date.getDate() === tomorrowDate.getDate() &&
      date.getMonth() === tomorrowDate.getMonth() &&
      date.getFullYear() === tomorrowDate.getFullYear()
    ) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
  };

  // Get session type badge
  const getSessionTypeBadge = (type: string): JSX.Element => {
    switch (type) {
      case "consultation":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Consultation</Badge>;
      case "follow-up":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Follow-up</Badge>;
      case "assessment":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Assessment</Badge>
        );
      case "workshop":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Workshop</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Group sessions by date
  const sessionsByDate = mockUpcomingSessions.reduce(
    (acc, session) => {
      const dateKey = formatDate(session.startTime);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(session);
      return acc;
    },
    {} as Record<string, typeof mockUpcomingSessions>,
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Omni Rhythm</CardTitle>
          <CardDescription>Your upcoming sessions</CardDescription>
        </div>
        <Calendar className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(sessionsByDate).map(([date, sessions]) => (
            <div key={date}>
              <h3 className="font-medium text-sm mb-2">{date}</h3>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{session.title}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3 mr-1" />
                          {session.clientName}
                        </div>
                      </div>
                      {getSessionTypeBadge(session.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(session.startTime)} ({session.durationMinutes} min)
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {session.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(sessionsByDate).length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming sessions</h3>
              <p className="text-muted-foreground mt-1">Your schedule is clear for now.</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href={{ pathname: "/calendar" }}>
            View Full Rhythm
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
