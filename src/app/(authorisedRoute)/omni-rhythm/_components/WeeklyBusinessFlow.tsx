"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, Calendar, Users, Target, Zap } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { Appointment, WeeklyStats, WeeklyBusinessFlowProps } from "./types";

export function WeeklyBusinessFlow({
  appointments,
  weeklyStats,
  isLoading = false,
}: WeeklyBusinessFlowProps): JSX.Element {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group appointments by day
  const appointmentsByDay = appointments.reduce(
    (acc, appointment) => {
      const dayKey = format(new Date(appointment.startTime), "yyyy-MM-dd");
      acc[dayKey] ??= [];
      acc[dayKey].push(appointment);
      return acc;
    },
    {} as Record<string, Appointment[]>,
  );

  // Calculate basic stats if not provided
  const defaultStats = calculateWeeklyStats(appointments);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Business Flow
          </CardTitle>
          <CardDescription>Loading your practice rhythm...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
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
          <Clock className="h-5 w-5" />
          Weekly Business Flow
        </CardTitle>
        <CardDescription>
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayAppointments = appointmentsByDay[dayKey] ?? [];
            const isDayToday = isToday(day);

            return (
              <div
                key={dayKey}
                className={`p-3 rounded-lg border text-center min-h-[100px] ${
                  isDayToday
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-gray-900/50"
                }`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${isDayToday ? "text-blue-700 dark:text-blue-300" : ""}`}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-xs mb-2 ${isDayToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
                >
                  {format(day, "d")}
                </div>

                {dayAppointments.length > 0 ? (
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`text-xs p-1 rounded truncate ${
                          appointment.eventType === "consultation"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : appointment.eventType === "workshop"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                        title={appointment.title}
                      >
                        {format(new Date(appointment.startTime), "HH:mm")}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground opacity-50">No sessions</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Business Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Weekly Summary */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-medium">
                  {(weeklyStats ?? defaultStats).totalAppointments}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium">{(weeklyStats ?? defaultStats).totalHours}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">${(weeklyStats ?? defaultStats).totalRevenue}</span>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Performance
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Busiest Day</span>
                <Badge variant="secondary" className="text-xs">
                  {(weeklyStats ?? defaultStats).busiestDay}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Session</span>
                <span className="font-medium">
                  {(weeklyStats ?? defaultStats).avgSessionLength}min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Clients</span>
                <span className="font-medium">{(weeklyStats ?? defaultStats).newClients}</span>
              </div>
            </div>
          </div>

          {/* Optimization Suggestions */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Suggestions
            </h4>
            <div className="space-y-2">
              {getOptimizationSuggestions(appointments, weeklyStats ?? defaultStats).map(
                (suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        suggestion.type === "positive"
                          ? "bg-green-500"
                          : suggestion.type === "warning"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <span className="text-muted-foreground">{suggestion.text}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button size="sm" variant="outline" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Break
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Users className="h-4 w-4 mr-2" />
            Client Outreach
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateWeeklyStats(appointments: Appointment[]): WeeklyStats {
  const totalAppointments = appointments.length;

  // Calculate total hours
  const totalHours = appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60 * 60);
    return total + duration;
  }, 0);

  // Calculate estimated revenue (simplified)
  const totalRevenue = appointments.reduce((total, appointment) => {
    const duration =
      (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
      (1000 * 60);
    let ratePerHour = 100;

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

  // Find busiest day
  const appointmentsByDay = appointments.reduce(
    (acc, appointment) => {
      const dayName = format(new Date(appointment.startTime), "EEEE");
      acc[dayName] = (acc[dayName] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const busiestDay = Object.entries(appointmentsByDay).reduce(
    (max, [day, count]) => (count > max.count ? { day, count } : max),
    { day: "None", count: 0 },
  ).day;

  // Calculate average session length
  const avgSessionLength =
    totalAppointments > 0
      ? appointments.reduce((total, appointment) => {
          const duration =
            (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
            (1000 * 60);
          return total + duration;
        }, 0) / totalAppointments
      : 0;

  // Calculate average session value and utilization rate
  const averageSessionValue =
    totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;
  const utilizationRate = Math.round((totalHours / 40) * 100); // Assuming 40-hour work week

  return {
    totalAppointments,
    totalRevenue: Math.round(totalRevenue),
    totalHours: Math.round(totalHours * 10) / 10,
    busiestDay,
    clientRetention: 85, // Placeholder
    newClients: Math.floor(totalAppointments * 0.3), // Placeholder
    avgSessionLength: Math.round(avgSessionLength),
    averageSessionValue,
    utilizationRate,
  };
}

function getOptimizationSuggestions(
  appointments: Appointment[],
  stats: WeeklyStats,
): Array<{ text: string; type: "positive" | "warning" | "info" }> {
  const suggestions = [];

  // Check for low appointment days
  if (stats.totalAppointments < 10) {
    suggestions.push({
      text: "Consider adding more sessions to increase weekly revenue",
      type: "warning" as const,
    });
  }

  // Check for good performance
  if (stats.totalAppointments > 15) {
    suggestions.push({
      text: "Excellent week! Consider raising prices or adding premium services",
      type: "positive" as const,
    });
  }

  // Check for balanced schedule
  const daysWithAppointments = Object.values(
    appointments.reduce(
      (acc, appointment) => {
        const day = format(new Date(appointment.startTime), "EEEE");
        acc[day] = (acc[day] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).length;

  if (daysWithAppointments >= 5) {
    suggestions.push({
      text: "Well-balanced schedule across the week",
      type: "positive" as const,
    });
  } else if (daysWithAppointments <= 2) {
    suggestions.push({
      text: "Consider spreading appointments across more days",
      type: "info" as const,
    });
  }

  // Default suggestions if none above apply
  if (suggestions.length === 0) {
    suggestions.push(
      { text: "Great balance of sessions and rest time", type: "positive" as const },
      { text: "Consider client follow-ups for next week", type: "info" as const },
    );
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}
