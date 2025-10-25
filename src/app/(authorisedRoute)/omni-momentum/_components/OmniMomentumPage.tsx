"use client";

import { TodaysFocusSection } from "./TodaysFocusSection";
import { DailyPulseWidget } from "./DailyPulseWidget";
import { HabitTrackers } from "./HabitTrackers";
import { MagicInboxCard } from "./MagicInboxCard";
import { WellnessQuoteCard } from "./WellnessQuoteCard";
import { ActionsListView } from "./ActionsListView";
import { WellnessZoneStatus } from "./WellnessZoneStatus";
import { FloatingAddTaskButton } from "./FloatingAddTaskButton";
import { useUserProfile } from "@/hooks/use-user-profile";

/**
 * Main OmniMomentum Page Component
 *
 * New optimized layout (Task 1.0):
 * - Top row (shorter cards): Daily Pulse (1/3) + Habit Trackers (1/3) + Magic Inbox (1/3)
 * - Second row: Today's Focus - 3 priority cards (3/4) + Wellness Quote (1/4)
 * - Third row: Zone Status (to see what it does)
 * - Bottom: Actions List (full width) - TanStack table with all tasks
 */
export function OmniMomentumPage(): JSX.Element {
  const { profile, isLoading } = useUserProfile();
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hour = today.getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  // Get user's first name or fallback to "there"
  const userName = profile?.displayName?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Personalized Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {greeting} {isLoading ? "..." : userName} ✨
            </h1>
            <p className="text-gray-600 mt-1">{formattedDate} • Your wellness practice awaits</p>
          </div>
        </div>
      </div>
      {/* Top Row: 3 Shorter Cards - Daily Pulse + Habit Trackers + Magic Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DailyPulseWidget />
        </div>
        <div className="lg:col-span-1">
          <HabitTrackers />
        </div>
        <div className="lg:col-span-1">
          <MagicInboxCard />
        </div>
      </div>

      {/* Second Row: Today's Focus (Full Width) */}
      <div className="w-full">
        <TodaysFocusSection />
      </div>

      {/* Third Row: Wellness Quote + Zone Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wellness Quote - 1/3 width */}
        <div className="lg:col-span-1">
          <WellnessQuoteCard />
        </div>

        {/* Zone Status - 2/3 width */}
        <div className="lg:col-span-2">
          <WellnessZoneStatus />
        </div>
      </div>

      {/* Bottom Row: Actions List (Full Width) - TanStack Table */}
      <div className="w-full">
        <ActionsListView />
      </div>

      {/* Floating Add Task Button - Available Globally in OmniMomentum */}
      <FloatingAddTaskButton />
    </div>
  );
}
