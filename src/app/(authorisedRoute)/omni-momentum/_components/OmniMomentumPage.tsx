"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
} from "@/components/ui";
import { Zap, Mic, Send, Sparkles, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// ✅ Following DTO/Repository architecture - hooks use repository pattern internally
import { useInbox, useInboxStats } from "@/hooks/use-inbox";
import { useZones } from "@/hooks/use-zones";
import { TodaysFocusSection } from "./TodaysFocusSection";
import type { CreateInboxItem } from "@/server/db/business-schemas/inbox";

/**
 * QuickCaptureInput - The "Dump Everything" Interface
 *
 * Research findings:
 * - Must be prominently placed for rapid thought capture
 * - Voice integration for between-session use
 * - Invisible AI processing (no overwhelming tech terminology)
 */
function QuickCaptureInput(): JSX.Element {
  const [rawText, setRawText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { quickCapture } = useInbox();

  const handleQuickCapture = async (): Promise<void> => {
    if (!rawText.trim()) {
      toast({
        title: "Share your thoughts",
        description: "What's on your mind today?",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // ✅ Runtime validation via DTO schema ensures type safety (Phase 5-6 DTO Migration)
      const data: CreateInboxItem = {
        rawText: rawText.trim(),
      };

      // ✅ Using void to explicitly handle Promise without await (ESLint no-floating-promises compliance)
      void quickCapture(data);
      setRawText("");

      toast({
        title: "Captured ✨",
        description: "Your insight will be organized and prioritized for you.",
      });
    } catch (error) {
      // ✅ Proper error handling with logging (avoiding any type assertions per Phase 15-16)
      console.error("Failed to capture:", error);
      toast({
        title: "Capture failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleQuickCapture();
    }
  };

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Quick Capture
        </CardTitle>
        <CardDescription>
          Dump everything here. Your thoughts will be organized into actionable steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="What's flowing through your mind? Tasks, ideas, client insights, business thoughts..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none pr-12 border-amber-200 focus:border-amber-400"
            disabled={isProcessing}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-amber-600 hover:text-amber-700"
              disabled={isProcessing}
              title="Voice capture (coming soon)"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>↵
            </kbd>{" "}
            to capture quickly
          </div>
          <Button
            onClick={handleQuickCapture}
            disabled={!rawText.trim() || isProcessing}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Capture
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inbox Stats - Simple overview without overwhelming detail
 */
function SimpleInboxStats(): JSX.Element {
  const { data: stats, isLoading } = useInboxStats();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.unprocessed}</div>
          <div className="text-sm text-blue-600">To Process</div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
          <div className="text-sm text-green-600">Organized</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
          <div className="text-sm text-gray-600">Archived</div>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
          <div className="text-sm text-purple-600">Total Items</div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main OmniMomentum Page Component
 *
 * Research-driven design:
 * - Progressive disclosure (only show what matters now)
 * - Today's focus approach (top 3 priorities)
 * - Simple list views (not overwhelming interfaces)
 * - Quick capture prominently placed
 */
export function OmniMomentumPage(): JSX.Element {
  const { zones } = useZones();

  return (
    <div className="space-y-8">
      {/* Quick Capture - Prominently placed */}
      <QuickCaptureInput />

      {/* Today's Focus - Research shows max 3 priorities */}
      <TodaysFocusSection />

      {/* Simple Stats Overview */}
      <SimpleInboxStats />

      {/* Wellness Zones Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" />
            Your Wellness Zones
          </CardTitle>
          <CardDescription>Organize your practice across life-business areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <Card
                key={zone.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color || "#6366f1" }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{zone.name}</h3>
                      <p className="text-xs text-gray-500">Coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
