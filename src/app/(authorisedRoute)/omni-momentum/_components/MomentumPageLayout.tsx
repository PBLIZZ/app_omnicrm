import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui";
import { OmniMomentumPage } from "./OmniMomentumPage";

/**
 * Main layout component for OmniMomentum
 * Provides static structure and loads client components
 */
export function MomentumPageLayout(): JSX.Element {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Wellness Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to OmniMomentum ✨</h1>
            <p className="text-gray-600 mt-1">Your wellness practice awaits</p>
          </div>
        </div>
      </div>

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
