import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading(): JSX.Element {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-600/20">
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customize Controls Skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Main Widgets Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Clarity Widget (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-96" />
              
              {/* Progress Skeleton */}
              <div className="pt-2">
                <Skeleton className="h-2 w-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority Tasks Skeletons */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border space-y-3">
                  {/* Task header */}
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                  
                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-18" />
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
              
              {/* Add Anything Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Daily Pulse Widget */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Energy Level */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-6" />
                  ))}
                </div>
              </div>

              {/* Sleep Duration */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>

              {/* Nap Time */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-4 w-16 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>

              {/* Mood Selection */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Widget - Pathways Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between text-xs">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zen Loading Message */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-pulse">✨</div>
          <span className="text-sm">Building your momentum...</span>
        </div>
      </div>
    </div>
  );
}