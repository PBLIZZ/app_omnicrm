"use client";

import { ErrorBoundary } from "@/components/error-boundaries";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useCalendarIntelligence } from "@/hooks/useCalendarIntelligence";
import { useCalendarConnection } from "@/hooks/useCalendarConnection";
import { useCalendarSync } from "@/hooks/useCalendarSync";

import type { CalendarEvent, Client, Appointment, WeeklyStats } from "@/server/db/business-schemas";
import type { CalendarConnectionStatus } from "@/hooks/useCalendarData";
import type { SessionMetrics } from "@/hooks/useCalendarIntelligence";

interface CalendarDataProviderProps {
  children: (data: {
    events: CalendarEvent[];
    clients: Client[];
    connectionStatus: CalendarConnectionStatus;
    isEventsLoading: boolean;
    isClientsLoading: boolean;
    enhancedAppointments: Appointment[];
    weeklyStats: WeeklyStats;
    sessionMetrics: SessionMetrics;
    connect: () => void;
    isConnecting: boolean;
    connectionError: string | null;
    syncCalendar: () => void;
    isSyncing: boolean;
  }) => React.ReactNode;
}

export function CalendarDataProvider({ children }: CalendarDataProviderProps) {
  return (
    <ErrorBoundary>
      <CalendarDataInner children={children} />
    </ErrorBoundary>
  );
}

function CalendarDataInner({ children }: CalendarDataProviderProps) {
  const { events, clients, connectionStatus, isEventsLoading, isClientsLoading } =
    useCalendarData();
  const { enhancedAppointments, weeklyStats, sessionMetrics } = useCalendarIntelligence(
    events,
    clients,
  );
  const { connect, isConnecting, error: connectionError } = useCalendarConnection();
  const { syncCalendar, isSyncing } = useCalendarSync();

  return children({
    events,
    clients,
    connectionStatus,
    isEventsLoading,
    isClientsLoading,
    enhancedAppointments,
    weeklyStats,
    sessionMetrics,
    connect,
    isConnecting,
    connectionError,
    syncCalendar,
    isSyncing,
  });
}
