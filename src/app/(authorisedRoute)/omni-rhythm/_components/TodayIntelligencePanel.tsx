"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Appointment, Attendee, TodayIntelligencePanelProps } from "./types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function TodayIntelligencePanel({
  appointments,
  isLoading = false,
}: TodayIntelligencePanelProps): JSX.Element {
  const now = new Date();
  const todayString = format(now, "EEEE, MMMM d, yyyy");

  // Group appointments by time periods and sort them chronologically
  const groupedAppointments = groupAppointmentsByTimePeriod(appointments, now);
  const totalAppointments =
    groupedAppointments.today.length +
    groupedAppointments.tomorrow.length +
    groupedAppointments.restOfWeek.length;

  // State for collapsible sections
  const [isRestOfWeekOpen, setIsRestOfWeekOpen] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Intelligence
          </CardTitle>
          <CardDescription>Loading your appointments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Intelligence
        </CardTitle>
        <CardDescription>
          {todayString} - {totalAppointments} appointment{totalAppointments !== 1 ? "s" : ""} this
          week
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalAppointments === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No appointments this week</p>
            <p className="text-sm mt-1">Enjoy your time off or focus on client outreach</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Appointments */}
            {groupedAppointments.today.length > 0 && (
              <AppointmentSection
                title="Today"
                appointments={groupedAppointments.today}
                titleColor="text-violet-600"
                bgColor="bg-violet-50"
                expandedEvents={expandedEvents}
                onToggleExpansion={toggleEventExpansion}
              />
            )}

            {/* Tomorrow's Appointments */}
            {groupedAppointments.tomorrow.length > 0 && (
              <AppointmentSection
                title="Tomorrow"
                appointments={groupedAppointments.tomorrow}
                titleColor="text-emerald-600"
                bgColor="bg-emerald-50"
                expandedEvents={expandedEvents}
                onToggleExpansion={toggleEventExpansion}
              />
            )}

            {/* Rest of Week Appointments - Collapsible */}
            {groupedAppointments.restOfWeek.length > 0 && (
              <Collapsible open={isRestOfWeekOpen} onOpenChange={setIsRestOfWeekOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
                    <h3 className="font-semibold text-lg text-sky-600">Rest of This Week</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {groupedAppointments.restOfWeek.length} events
                      </Badge>
                      {isRestOfWeekOpen ? (
                        <ChevronUp className="h-4 w-4 text-sky-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-sky-600" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    <AppointmentSection
                      title=""
                      appointments={groupedAppointments.restOfWeek}
                      titleColor="text-sky-600"
                      bgColor="bg-sky-50"
                      expandedEvents={expandedEvents}
                      onToggleExpansion={toggleEventExpansion}
                      hideTitle
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Weekly Summary */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-violet-600">{totalAppointments}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-emerald-600">
                    {calculateReturningClients(appointments)}
                  </div>
                  <div className="text-xs text-muted-foreground">Returning Clients</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-sky-600">
                    ${calculateEstimatedRevenue(appointments)}
                  </div>
                  <div className="text-xs text-muted-foreground">Est. Revenue</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">
                    {calculateTotalHours(appointments)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentCard({
  appointment,
  showDate = false,
  isExpanded = false,
  onToggleExpansion,
}: {
  appointment: Appointment;
  showDate?: boolean;
  isExpanded?: boolean;
  onToggleExpansion?: (eventId: string) => void;
}): JSX.Element {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  const [showAttendees, setShowAttendees] = useState(false);

  // Auto-categorize event if not already categorized
  const eventCategory = getEventCategory(appointment);
  const eventTags = getEventTags(appointment);

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow">
      {/* Compact Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-base truncate">{appointment.title}</h3>
            {eventCategory && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {eventCategory}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {showDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(startTime, "EEE, MMM d")}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              <span className="text-xs">({duration}min)</span>
            </div>
            {appointment.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-48" title={appointment.location}>
                  {appointment.location}
                </span>
              </div>
            )}
            {appointment.attendees && appointment.attendees.length > 0 && (
              <button
                onClick={() => setShowAttendees(!showAttendees)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Users className="h-3 w-3" />
                {appointment.attendees.length} attendee
                {appointment.attendees.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Event Tags */}
          {eventTags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {eventTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {onToggleExpansion && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleExpansion(appointment.id)}
            className="shrink-0 h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        )}
      </div>

      {/* Attendees List */}
      {showAttendees && appointment.attendees && appointment.attendees.length > 0 && (
        <div className="bg-muted/30 rounded p-2 text-xs">
          <div className="font-medium mb-1">Attendees:</div>
          <div className="space-y-1">
            {appointment.attendees.map((attendee: Attendee, index: number) => (
              <div key={index} className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{attendee.name || attendee.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progressive Disclosure Content */}
      {isExpanded && (
        <div className="space-y-2 border-t pt-2">
          {/* Description */}
          {appointment.description && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Details:</span> {appointment.description}
            </div>
          )}

          {/* Contact Context */}
          {appointment.contactContext && (
            <div className="bg-violet-50 dark:bg-violet-950/20 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 text-violet-600" />
                <span className="font-medium text-violet-900 dark:text-violet-100 text-sm">
                  {appointment.contactContext.contactName ?? "Contact"}
                </span>
                {appointment.contactContext.sessionNumber &&
                  appointment.contactContext.sessionNumber > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Session #{appointment.contactContext.sessionNumber}
                    </Badge>
                  )}
              </div>

              {appointment.contactContext.totalSessions && (
                <div className="text-xs text-violet-700 dark:text-violet-300 mb-1">
                  Total Sessions: {appointment.contactContext.totalSessions}
                  {appointment.contactContext.lastSessionDate && (
                    <span className="ml-2">
                      Last: {format(new Date(appointment.contactContext.lastSessionDate), "MMM d")}
                    </span>
                  )}
                </div>
              )}

              {appointment.contactContext.preparationNeeded &&
                appointment.contactContext.preparationNeeded.length > 0 && (
                  <div className="text-xs">
                    <div className="flex items-center gap-1 font-medium text-violet-900 dark:text-violet-100 mb-1">
                      <AlertCircle className="h-3 w-3" />
                      Preparation Needed:
                    </div>
                    <ul className="text-violet-800 dark:text-violet-200 space-y-0.5 ml-4">
                      {appointment.contactContext.preparationNeeded.map(
                        (item: string, index: number) => (
                          <li key={index} className="list-disc">
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

              {appointment.contactContext.notes && (
                <div className="text-xs text-violet-800 dark:text-violet-200 mt-1">
                  <span className="font-medium">Notes:</span> {appointment.contactContext.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons removed until functionality is implemented */}
    </div>
  );
}

// Helper function to calculate returning clients based on attendee patterns
function calculateReturningClients(appointments: Appointment[]): number {
  const attendeeMap = new Map<string, number>();

  appointments.forEach((appointment) => {
    if (appointment.attendees) {
      appointment.attendees.forEach((attendee: Attendee) => {
        const email = attendee.email.toLowerCase();
        attendeeMap.set(email, (attendeeMap.get(email) || 0) + 1);
      });
    }
  });

  // Count attendees who appear in more than one event
  return Array.from(attendeeMap.values()).filter((count) => count > 1).length;
}

function calculateEstimatedRevenue(appointments: Appointment[]): number {
  const total = appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60);

    // Enhanced rate calculation - most events are free or low-cost
    let ratePerHour = 0; // Default to 0
    const eventType = getEventCategory(appointment);

    switch (eventType?.toLowerCase()) {
      case "consultation":
        ratePerHour = 150;
        break;
      case "appointment":
        ratePerHour = 120;
        break;
      case "workshop":
      case "seminar":
        ratePerHour = 75;
        break;
      case "retreat":
        ratePerHour = 200;
        break;
      case "class":
      case "group":
      case "meeting":
      default:
        // Most classes, meetings, Q&As are free
        ratePerHour = 0;
        break;
    }

    return total + (ratePerHour * duration) / 60;
  }, 0);

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}

function calculateTotalHours(appointments: Appointment[]): number {
  return appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60 * 60);
    return total + duration;
  }, 0);
}

// Helper function to auto-categorize events based on title and description
function getEventCategory(appointment: Appointment): string | undefined {
  if (appointment.eventType) return appointment.eventType;

  const text = `${appointment.title} ${appointment.description || ""}`.toLowerCase();

  // Q&A sessions and community events are classes, not appointments
  if (/\b(q&a|q\s*&\s*a|question.{0,5}answer|community|group|class|lesson)\b/.test(text))
    return "class";
  if (/\b(consultation|consult|private session|1-on-1|one-on-one)\b/.test(text))
    return "consultation";
  if (/\b(workshop|seminar|training)\b/.test(text)) return "workshop";
  if (/\b(retreat|intensive)\b/.test(text)) return "retreat";
  if (/\b(meeting|call|phone|zoom)\b/.test(text)) return "meeting";
  // Only individual treatments should be appointments (not group events)
  if (
    /\b(appointment|treatment|massage|therapy)\b/.test(text) &&
    !/\b(group|class|community)\b/.test(text)
  )
    return "appointment";

  return undefined;
}

// Helper function to extract wellness tags from event content
function getEventTags(appointment: Appointment): string[] {
  const tags: string[] = [];
  const text = `${appointment.title} ${appointment.description || ""}`.toLowerCase();

  // Wellness service tags
  if (/\b(yoga|vinyasa|hatha|yin)\b/.test(text)) tags.push("yoga");
  if (/\b(massage|bodywork|therapeutic)\b/.test(text)) tags.push("massage");
  if (/\b(meditation|mindfulness|breathing)\b/.test(text)) tags.push("meditation");
  if (/\b(pilates|barre)\b/.test(text)) tags.push("pilates");
  if (/\b(reiki|energy|healing)\b/.test(text)) tags.push("reiki");
  if (/\b(acupuncture|tcm)\b/.test(text)) tags.push("acupuncture");
  if (/\b(nutrition|diet|wellness coaching)\b/.test(text)) tags.push("nutrition");
  if (/\b(therapy|counseling|psychology)\b/.test(text)) tags.push("therapy");

  // Intensity/level tags
  if (/\b(beginner|intro|new)\b/.test(text)) tags.push("beginner");
  if (/\b(advanced|intensive|master)\b/.test(text)) tags.push("advanced");
  if (/\b(gentle|restorative|relaxing)\b/.test(text)) tags.push("gentle");

  return tags.slice(0, 3); // Limit to 3 tags for UI cleanliness
}

// Helper function to group appointments by time periods and sort chronologically
function groupAppointmentsByTimePeriod(
  appointments: Appointment[],
  currentDate: Date,
): {
  today: Appointment[];
  tomorrow: Appointment[];
  restOfWeek: Appointment[];
} {
  const today: Appointment[] = [];
  const tomorrow: Appointment[] = [];
  const restOfWeek: Appointment[] = [];

  const tomorrowDate = addDays(currentDate, 1);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday

  appointments.forEach((appointment) => {
    const appointmentDate = new Date(appointment.startTime);

    if (isToday(appointmentDate)) {
      today.push(appointment);
    } else if (isTomorrow(appointmentDate)) {
      tomorrow.push(appointment);
    } else if (
      appointmentDate >= weekStart &&
      appointmentDate <= weekEnd &&
      appointmentDate > tomorrowDate
    ) {
      restOfWeek.push(appointment);
    }
  });

  // Sort each group chronologically (earliest first)
  const sortByTime = (a: Appointment, b: Appointment) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

  today.sort(sortByTime);
  tomorrow.sort(sortByTime);
  restOfWeek.sort(sortByTime);

  return { today, tomorrow, restOfWeek };
}

// Component for displaying a section of appointments
interface AppointmentSectionProps {
  title: string;
  appointments: Appointment[];
  titleColor: string;
  bgColor: string;
  expandedEvents: Set<string>;
  onToggleExpansion: (eventId: string) => void;
  hideTitle?: boolean;
}

function AppointmentSection({
  title,
  appointments,
  titleColor,
  bgColor,
  expandedEvents,
  onToggleExpansion,
  hideTitle = false,
}: AppointmentSectionProps): JSX.Element {
  return (
    <div className={`rounded-lg p-3 ${bgColor}`}>
      {!hideTitle && title && (
        <h3 className={`font-semibold text-lg mb-3 ${titleColor}`}>{title}</h3>
      )}
      <div className="space-y-2">
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            showDate={title !== "Today"}
            isExpanded={expandedEvents.has(appointment.id)}
            onToggleExpansion={onToggleExpansion}
          />
        ))}
      </div>
    </div>
  );
}
