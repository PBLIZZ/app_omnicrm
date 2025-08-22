"use client";

import { useState, useCallback, useMemo } from "react";
import { Views, View } from "react-big-calendar";
import moment from "moment";
import { toast } from "sonner";
import {
  CalendarStatsCards,
  CalendarViewToggle,
  CalendarControls,
  BigCalendarWrapper,
  generateMockEvents,
  CalendarEvent,
  EventFilter,
} from "./_components";

export default function CalendarPage(): JSX.Element {
  // Calendar state
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>("all");

  // Mock events
  const allEvents = useMemo(() => generateMockEvents(), []);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let events = allEvents;

    // Apply filter
    if (selectedFilter !== "all") {
      events = events.filter((event) => event.resource?.type === selectedFilter);
    }

    // Apply search
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      events = events.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.resource?.description?.toLowerCase().includes(searchTerm),
      );
    }

    return events;
  }, [allEvents, selectedFilter, searchValue]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      totalEvents: allEvents.length,
      todayEvents: allEvents.filter((event) => moment(event.start).isSame(moment(), "day")).length,
      weekEvents: allEvents.filter((event) => moment(event.start).isSame(moment(), "week")).length,
    }),
    [allEvents],
  );

  // Event handlers
  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    toast.info(`Selected: ${event.title}`, {
      description: event.resource?.description ?? `${moment(event.start).format("LLL")}`,
    });
  }, []);

  const handleSlotSelect = useCallback((slotInfo: { start: Date; end: Date }) => {
    toast.success("New event slot selected", {
      description: `${moment(slotInfo.start).format("LLL")} - ${moment(slotInfo.end).format("LT")}`,
    });
  }, []);

  const handleNewEvent = useCallback(() => {
    toast.info("Create New Event", {
      description: "This would open the new event dialog",
    });
  }, []);

  const handleSettings = useCallback(() => {
    toast.info("Calendar Settings", {
      description: "This would open calendar settings",
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setSelectedFilter(filter as EventFilter);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Stats Cards */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="md:w-1/3">
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and appointments</p>
        </div>

        <CalendarStatsCards
          todayEvents={stats.todayEvents}
          weekEvents={stats.weekEvents}
          onNewEvent={handleNewEvent}
          onSettings={handleSettings}
        />
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CalendarViewToggle currentView={view} onViewChange={handleViewChange} />

        <CalendarControls
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          selectedFilter={selectedFilter}
        />
      </div>

      {/* Main Calendar */}
      <BigCalendarWrapper
        events={filteredEvents}
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onViewChange={handleViewChange}
        onSelectEvent={handleEventSelect}
        onSelectSlot={handleSlotSelect}
        height={600}
      />
    </div>
  );
}
