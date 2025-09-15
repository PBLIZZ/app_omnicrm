"use client";

import type { JSX } from "react";
import { useSearchParams } from "next/navigation";
import { CategorizationStatusCard } from "./analytics/CategorizationStatusCard";
import { WeeklyIntelligenceSummaryCard } from "./analytics/WeeklyIntelligenceSummaryCard";
import { AIInsightsCard } from "./analytics/AIInsightsCard";

export function IntelligenceView(): JSX.Element {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {(!section || section === "categorization") && <CategorizationStatusCard />}
      {(!section || section === "summary") && <WeeklyIntelligenceSummaryCard />}
      {(!section || section === "insights") && <AIInsightsCard />}
    </div>
  );
}
