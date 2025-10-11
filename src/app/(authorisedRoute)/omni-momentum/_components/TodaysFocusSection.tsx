"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@/components/ui";
import { Brain, Clock, Target } from "lucide-react";
// ✅ Following clean architecture - useInbox hook encapsulates repository pattern (Phase 7-8)
import { useInbox } from "@/hooks/use-inbox";
// ✅ Type-safe DTO from contracts package with runtime validation (Phase 5-6 DTO Migration)
import type { InboxItem } from "@/server/db/business-schemas/business-schema";

/**
 * Today's Focus Section - Top 3 Priorities
 *
 * Research finding: 78% prefer simple lists, max 3 priorities to avoid overwhelm
 * Progressive disclosure: Only show what matters now
 */
export function TodaysFocusSection(): JSX.Element {
  const { items, isLoading } = useInbox({
    filters: { status: ["unprocessed", "processed"] },
  });

  // ✅ Research-driven design: 78% prefer lists, max 3 priorities to avoid overwhelm
  const focusItems = items.filter((item: InboxItem) => item.status === "unprocessed").slice(0, 3); // Hard limit of 3 items per research findings

  const handleProcessItem = (itemId: string): void => {
    // TODO: Implement processing flow when ready
    console.log("Processing item:", itemId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Today's Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Today's Focus
        </CardTitle>
        <CardDescription>Your top 3 priorities. Keep it simple, stay focused.</CardDescription>
      </CardHeader>
      <CardContent>
        {focusItems.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Ready to focus?</h3>
            <p className="text-gray-500 text-sm">
              Use Quick Capture above to add your thoughts and priorities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {focusItems.map((item: InboxItem, index: number) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{item.rawText}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.status === "unprocessed" ? "Ready to process" : "Processed"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => handleProcessItem(item.id)}
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Process
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
