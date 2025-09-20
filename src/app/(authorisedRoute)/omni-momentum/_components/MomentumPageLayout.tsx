import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui";
import { Brain, Heart, DollarSign, TrendingUp, Share2, Users } from "lucide-react";
import { DailyPulseWidget } from "./DailyPulseWidget";
import { OmniMomentumPage } from "./OmniMomentumPage";

/**
 * Wellness Zone Configuration
 * Based on research into wellness practitioner life-business organization
 */
const WELLNESS_ZONES = [
  {
    name: "Personal Wellness",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
  },
  {
    name: "Self Care",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    name: "Admin & Finances",
    icon: DollarSign,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    name: "Business Development",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    name: "Social Media & Marketing",
    icon: Share2,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    name: "Client Care",
    icon: Users,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
] as const;

/**
 * Server-rendered wellness zone indicators
 * Shows at-a-glance status without overwhelming the practitioner
 */
function WellnessZoneIndicators(): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {WELLNESS_ZONES.map((zone) => {
        const IconComponent = zone.icon;
        return (
          <Card key={zone.name} className="transition-all hover:shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${zone.bgColor}`}>
                  <IconComponent className={`w-4 h-4 ${zone.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {zone.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    • In Flow
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Motivational Header
 * Wellness-appropriate greeting with today's date
 */
function WellnessHeader(): JSX.Element {
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

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting} ✨
          </h1>
          <p className="text-gray-600 mt-1">
            {formattedDate} • Your wellness practice awaits
          </p>
        </div>
      </div>

      {/* Daily Pulse Widget - Quick wellness check-in */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      }>
        <DailyPulseWidget />
      </Suspense>
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
      {/* Wellness Header with Daily Pulse */}
      <WellnessHeader />

      {/* Wellness Zone Status Indicators */}
      <WellnessZoneIndicators />

      {/* Main Interactive Content - Client Component */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      }>
        <OmniMomentumPage />
      </Suspense>
    </div>
  );
}