"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { format } from "date-fns";
import { Brain, Clock, Target, Inbox, Sparkles } from "lucide-react";
import { useInbox } from "@/hooks/use-inbox";
import type { InboxItem } from "@/server/db/business-schemas/productivity";

export function TodaysFocusSection(): JSX.Element {
  const { items, isLoading } = useInbox({
    filters: { status: ["unprocessed", "processed"] },
  });
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

  const { focusItems, remainingItems } = useMemo(() => {
    const unprocessed = items.filter((item: InboxItem) => item.status === "unprocessed");
    return {
      focusItems: unprocessed.slice(0, 3),
      remainingItems: unprocessed.slice(3),
    };
  }, [items]);

  const handleProcessItem = (item: InboxItem): void => {
    setSelectedItem(item);
  };

  const handleDialogChange = (open: boolean): void => {
    if (!open) {
      setSelectedItem(null);
    }
  };

  const computeWordCount = (item: InboxItem): number => {
    const candidate = (item as { wordCount?: unknown }).wordCount;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(candidate, 1);
    }
    const tokens = item.rawText.trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 ? tokens.length : 1;
  };

  const formatCreatedAt = (value: InboxItem["createdAt"]): string | null => {
    if (!value) return null;
    const date = new Date(value as unknown as Date | string | number);
    if (Number.isNaN(date.getTime())) return null;
    return format(date, "MMM d, h:mm a");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Today&apos;s Focus
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Today&apos;s Focus
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
            <div className="space-y-4">
              {focusItems.map((item: InboxItem, index: number) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-white rounded-lg border-2 border-blue-100 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-lg font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-900 mb-2 line-clamp-3">{item.rawText}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatCreatedAt(item.createdAt) ?? "Just now"}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {computeWordCount(item)} words
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleProcessItem(item)}
                  >
                    <Brain className="w-4 h-4 mr-1.5" />
                    Process
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {remainingItems.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-gray-600" />
            </CardTitle>
            <CardDescription>
              These will move to your top priorities as you process the items above.
            </CardDescription>
          </CardHeader>
            <CardContent>
            <div className="space-y-2">
              {remainingItems.map((item: InboxItem) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-1">{item.rawText}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatCreatedAt(item.createdAt) ?? "Just now"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => handleProcessItem(item)}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Process
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedItem !== null} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Processing
            </DialogTitle>
            <DialogDescription>
              AI-powered categorization will be available in Phase 2.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 font-medium mb-2">Item to process:</p>
              <p className="text-sm text-gray-900">{selectedItem?.rawText}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Coming soon:</span> AI will analyze this item and
                suggest the best category (Task, Project, Zone, or Note) with intelligent
                recommendations.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleDialogChange(false)}>
                Close
              </Button>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => handleDialogChange(false)}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                OK, Got It
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
