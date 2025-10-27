"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, Button } from "@/components/ui";
import { ChevronLeft, Activity, Target } from "lucide-react";
import { PulseTab } from "./PulseTab";
import { HabitsTab } from "./HabitsTab";

type TabType = "pulse" | "habits";

/**
 * Daily Pulse Analytics Component
 *
 * Tabbed interface for wellness insights:
 * - Pulse: Mood trends, journal analysis, goals
 * - Habits: Streaks, heatmaps, achievements
 */
export function DailyPulseAnalytics(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("pulse");

  // Sync tab with URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pulse" || tab === "habits") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType): void => {
    setActiveTab(tab);
    router.push(`/omni-momentum/daily-pulse?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/omni-momentum")}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to OmniMomentum
        </Button>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Daily Pulse Analytics</h1>
        <p className="text-gray-600 mt-1">Your wellness journey at a glance</p>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => handleTabChange("pulse")}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-colors relative
                ${
                  activeTab === "pulse"
                    ? "text-teal-600 border-b-2 border-teal-600 -mb-px"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              <Activity className="w-4 h-4" />
              Pulse & Mood
            </button>
            <button
              onClick={() => handleTabChange("habits")}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-colors relative
                ${
                  activeTab === "habits"
                    ? "text-emerald-600 border-b-2 border-emerald-600 -mb-px"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              <Target className="w-4 h-4" />
              Habits & Goals
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === "pulse" ? <PulseTab /> : <HabitsTab />}
        </CardContent>
      </Card>
    </div>
  );
}
