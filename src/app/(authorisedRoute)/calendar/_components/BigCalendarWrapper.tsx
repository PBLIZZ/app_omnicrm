"use client";

import { useCallback } from "react";
import { Calendar as BigCalendar, momentLocalizer, Views, View } from "react-big-calendar";
import moment from "moment";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarEvent, EventType } from "./CalendarEvent";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Setup the localizer for moment
const localizer = momentLocalizer(moment);

interface BigCalendarWrapperProps {
  events: CalendarEvent[];
  view: View;
  date: Date;
  onNavigate: (date: Date) => void;
  onViewChange: (view: View) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  height?: number;
}

export function BigCalendarWrapper({
  events,
  view,
  date,
  onNavigate,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
  height = 600,
}: BigCalendarWrapperProps): JSX.Element {
  // Custom event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const type = event.resource?.type ?? "meeting";

    const styles: Record<EventType, { backgroundColor: string; color: string }> = {
      meeting: { backgroundColor: "#3b82f6", color: "white" }, // blue
      task: { backgroundColor: "#10b981", color: "white" }, // green
      appointment: { backgroundColor: "#8b5cf6", color: "white" }, // purple
      reminder: { backgroundColor: "#f59e0b", color: "white" }, // amber
    };

    return {
      style: styles[type],
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event);
    },
    [onSelectEvent],
  );

  // Handle slot selection (for creating new events)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      onSelectSlot?.(slotInfo);
    },
    [onSelectSlot],
  );

  return (
    <Card className="flex-1">
      <CardContent className="p-6">
        <div style={{ height: `${height}px` }} className="calendar-container">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onNavigate={onNavigate}
            onView={onViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            step={30}
            showMultiDayTimes
            className="bg-background text-foreground"
            components={{
              toolbar: () => null, // Hide default toolbar since we have custom controls
            }}
            formats={{
              timeGutterFormat: "HH:mm",
              eventTimeRangeFormat: ({ start, end }) =>
                `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
              dayFormat: "ddd DD/MM",
              dayHeaderFormat: "dddd DD MMMM",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
