import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { DailyPulseAnalytics } from "./_components/DailyPulseAnalytics";

export const metadata: Metadata = {
  title: "Daily Pulse · OmniMomentum",
  description: "Your wellness analytics - mood trends, habits, streaks, and personal insights",
};

/**
 * Daily Pulse Analytics Page
 *
 * Tabbed interface for deep wellness insights:
 * - Pulse Tab: Mood timeline, journal analysis, AI suggestions, goals
 * - Habits Tab: Streaks, heatmaps, completion patterns, achievements
 */
export default async function Page(): Promise<React.ReactNode> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/omni-momentum/daily-pulse");
  }

  return <DailyPulseAnalytics />;
}
