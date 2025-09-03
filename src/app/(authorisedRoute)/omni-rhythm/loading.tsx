import { Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CalendarLoading(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Loading */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Calendar Controls Loading */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-9" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-60" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid Loading */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {/* Calendar header days */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Loading */}
        <div className="space-y-6">
          {/* Upcoming Events Loading */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-3 h-3 rounded-full mt-1.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Types Loading */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground animate-pulse" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
              ))}

              <div className="pt-3 border-t">
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
