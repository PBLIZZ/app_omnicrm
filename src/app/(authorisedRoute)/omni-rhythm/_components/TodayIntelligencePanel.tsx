"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { Appointment, TodayIntelligencePanelProps } from "./types";

export function TodayIntelligencePanel({
  appointments,
  isLoading = false,
}: TodayIntelligencePanelProps): JSX.Element {
  const today = new Date();
  const todayString = format(today, "EEEE, MMMM d, yyyy");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today&apos;s Intelligence
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
          Today&apos;s Intelligence
        </CardTitle>
        <CardDescription>
          {todayString} - {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No appointments today</p>
            <p className="text-sm mt-1">Enjoy your day off or focus on client outreach</p>
          </div>
        ) : (
          <div className="space-y-6">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}

            {/* Today's Summary */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {appointments.filter((a) => a.clientContext?.clientId).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Returning Clients</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-600">
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

function AppointmentCard({ appointment }: { appointment: Appointment }): JSX.Element {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Appointment Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{appointment.title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              <span className="text-xs">({duration}min)</span>
            </div>
            {appointment.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {appointment.location}
              </div>
            )}
            {appointment.attendees && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {appointment.attendees.length} attendee
                {appointment.attendees.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {appointment.eventType && <Badge variant="secondary">{appointment.eventType}</Badge>}
          {appointment.businessCategory && (
            <Badge variant="outline">{appointment.businessCategory}</Badge>
          )}
        </div>
      </div>

      {/* Client Context */}
      {appointment.clientContext && (
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {appointment.clientContext.clientName ?? "Client"}
            </span>
            {appointment.clientContext.sessionNumber && (
              <Badge variant="outline" className="text-xs">
                Session #{appointment.clientContext.sessionNumber}
              </Badge>
            )}
          </div>

          {appointment.clientContext.totalSessions && (
            <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
              <span>Total Sessions: {appointment.clientContext.totalSessions}</span>
              {appointment.clientContext.lastSessionDate && (
                <span>
                  Last: {format(new Date(appointment.clientContext.lastSessionDate), "MMM d")}
                </span>
              )}
            </div>
          )}

          {appointment.clientContext.preparationNeeded &&
            appointment.clientContext.preparationNeeded.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm font-medium text-blue-900 dark:text-blue-100">
                  <AlertCircle className="h-3 w-3" />
                  Preparation Needed:
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {appointment.clientContext.preparationNeeded.map((item, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {appointment.clientContext.notes && (
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Notes:</span> {appointment.clientContext.notes}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          <FileText className="h-4 w-4 mr-1" />
          View Details
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <TrendingUp className="h-4 w-4 mr-1" />
          Session Notes
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <CheckCircle className="h-4 w-4 mr-1" />
          Mark Complete
        </Button>
      </div>
    </div>
  );
}

function calculateEstimatedRevenue(appointments: Appointment[]): number {
  // Simple estimation based on appointment types and duration
  // In a real implementation, this would use pricing data from the database
  return appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60);
    let ratePerHour = 100; // Default rate

    switch (appointment.eventType) {
      case "consultation":
        ratePerHour = 150;
        break;
      case "workshop":
        ratePerHour = 75;
        break;
      case "class":
        ratePerHour = 50;
        break;
    }

    return total + (ratePerHour * duration) / 60;
  }, 0);
}

function calculateTotalHours(appointments: Appointment[]): number {
  return appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60 * 60);
    return total + duration;
  }, 0);
}
