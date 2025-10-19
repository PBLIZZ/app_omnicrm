"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui";
import { OmniMomentumPage } from "./OmniMomentumPage";
import { useUserProfile } from "@/hooks/use-user-profile";

/**
 * Motivational Header
 * Wellness-appropriate greeting with today's date and user's name
 */
function WellnessHeader(): JSX.Element {
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
  );
}

/**
 * Main layout component for OmniMomentum
 * Provides static structure and loads client components
 */
export function MomentumPageLayout(): JSX.Element {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Wellness Header */}
      <WellnessHeader />

      {/* Main Interactive Content - Client Component */}
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <OmniMomentumPage />
      </Suspense>
    </div>
  );
}
