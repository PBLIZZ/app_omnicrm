"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/custom/drawer";
import { Loader2, Sparkles, MoreHorizontal, BarChart3 } from "lucide-react";
import { usePulse } from "@/hooks/use-pulse";
import type { PulseDetails } from "@repo";
import { EmotionalReflection, type ReflectionScores } from "./EmotionalReflection";

/**
 * Daily Pulse Widget - Micro-Journal for Emotional Moments
 *
 * Captures emotional snapshots throughout the day:
 * - Mood (emoji selection)
 * - Energy level (1-5)
 * - Feelings (freeform text)
 * - Timestamped for pattern analysis
 */

const MOOD_OPTIONS = [
  { emoji: "😰", value: 1, label: "Overwhelmed" },
  { emoji: "😔", value: 2, label: "Down" },
  { emoji: "🫩", value: 2, label: "Tired" },
  { emoji: "😐", value: 3, label: "Meh" },
  { emoji: "😊", value: 4, label: "Fine" },
  { emoji: "😄", value: 4, label: "Good" },
  { emoji: "🤩", value: 5, label: "Great" },
];

const PLACEHOLDER_PROMPTS = [
  "Describe the feelings you have right now...",
  "Capture how you're feeling in this moment...",
  "Journal your emotions right now...",
  "What's on your mind?",
  "How's your energy today?",
];

const ENERGY_COLORS = [
  "from-red-200 to-red-300", // 1 - Low
  "from-orange-200 to-orange-300", // 2 - Below average
  "from-yellow-200 to-yellow-300", // 3 - Moderate
  "from-green-200 to-green-300", // 4 - Good
  "from-emerald-200 to-emerald-300", // 5 - Excellent
];

export function FeelingsJournal(): JSX.Element {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_PROMPTS[0] ?? "How are you feeling?");
  const [showReflectionDrawer, setShowReflectionDrawer] = useState(false);
  const [pendingReflection, setPendingReflection] = useState<ReflectionScores | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const { createPulse, isCreating } = usePulse({ limit: 5 });

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder((prev) => {
        const currentIndex = PLACEHOLDER_PROMPTS.indexOf(prev);
        const nextIndex = (currentIndex + 1) % PLACEHOLDER_PROMPTS.length;
        const nextPrompt = PLACEHOLDER_PROMPTS[nextIndex];
        return nextPrompt ?? PLACEHOLDER_PROMPTS[0] ?? "How are you feeling?";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (): void => {
    handleSubmitWithReflection();
  };

  const handleReflectionComplete = (scores: ReflectionScores, reflectionNotes?: string): void => {
    // Save reflection scores to be included with the next pulse submission
    setPendingReflection(scores);
    setShowReflectionDrawer(false);

    // Auto-submit if user already filled out basic pulse
    if (selectedMood !== null) {
      handleSubmitWithReflection(scores, reflectionNotes);
    }
  };

  const handleSubmitWithReflection = (
    reflectionScores?: ReflectionScores,
    reflectionNotes?: string,
  ): void => {
    if (selectedMood === null) return;

    const scores = reflectionScores ?? pendingReflection;

    const pulseDetails: PulseDetails = {
      time: energy,
      energy,
      mood: selectedMood,
      ...(notes.trim() && { notes: notes.trim() }),
      ...(scores && {
        reflectionScores: {
          safety: scores.safety ?? null,
          creativity: scores.creativity ?? null,
          confidence: scores.confidence ?? null,
          connection: scores.connection ?? null,
          expression: scores.expression ?? null,
          clarity: scores.clarity ?? null,
          purpose: scores.purpose ?? null,
        },
      }),
      ...(reflectionNotes && { reflectionNotes }),
    };

    createPulse({ details: pulseDetails });

    // Reset form
    setSelectedMood(null);
    setEnergy(3);
    setNotes("");
    setPendingReflection(null);
  };

  const canSubmit = selectedMood !== null;

  const handleNavigateToPulse = (): void => {
    setIsNavigating(true);

    // Set a timeout to detect if navigation is taking too long
    const navigationTimeout = setTimeout(() => {
      setIsNavigating(false);
      // Show error and allow retry
      const shouldRetry = window.confirm(
        "Navigation is taking longer than expected. Would you like to try again?"
      );

      if (shouldRetry) {
        setIsNavigating(true);
        router.push("/omni-momentum/daily-pulse?tab=pulse");
        // Reset loading state after retry attempt
        setTimeout(() => setIsNavigating(false), 5000);
      }
    }, 10000); // 10 second timeout

    router.push("/omni-momentum/daily-pulse?tab=pulse");

    // Clear timeout if navigation completes
    // Note: We'll reset isNavigating when the component unmounts or after a reasonable time
    setTimeout(() => {
      clearTimeout(navigationTimeout);
      setIsNavigating(false);
    }, 3000); // Assume navigation completes within 3 seconds normally
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-sky-50 to-teal-50 border-teal-200 h-[390px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-teal-500" />
              Feelings Journal
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-100 rounded-full"
                  disabled={isNavigating}
                >
                  {isNavigating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNavigateToPulse}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Daily Pulse Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-3 overflow-hidden">
          {/* Mood Selection - Single Row */}
          <div className="flex gap-2 justify-between">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={`${mood.emoji}-${mood.value}`}
                onClick={() => setSelectedMood(mood.value)}
                className={`
                flex-1 aspect-square rounded-xl transition-all duration-200
                flex items-center justify-center text-2xl sm:text-3xl
                ${
                  selectedMood === mood.value
                    ? "bg-white shadow-lg scale-105 ring-2 ring-teal-400"
                    : "bg-white/50 hover:bg-white hover:shadow-md hover:scale-105"
                }
              `}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>

          {/* Energy Level - Wellness Gradient */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Energy</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergy(level)}
                  className="group relative"
                  title={`${level}/5`}
                >
                  <div
                    className={`
                    w-6 h-6 rounded-full transition-all duration-300
                    ${
                      energy >= level
                        ? `bg-gradient-to-br ${ENERGY_COLORS[level - 1]} shadow-md scale-110`
                        : "bg-gray-200 group-hover:bg-gray-300 group-hover:scale-105"
                    }
                  `}
                  />
                  {energy >= level && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Input - 3 rows */}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none bg-white/70 border-teal-200 focus:border-teal-400 focus:ring-teal-400 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />

          {/* Submit Buttons - Two Rows */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isCreating}
            size="sm"
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Capture This Moment
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowReflectionDrawer(true)}
            size="sm"
            variant="outline"
            className="w-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Go Deeper
          </Button>
        </CardContent>
      </Card>

      {/* Emotional Reflection Drawer */}
      <Drawer open={showReflectionDrawer} onOpenChange={setShowReflectionDrawer}>
        <DrawerContent className="!max-h-[96vh] max-w-[85vw] mx-auto">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-semibold">Deep Reflection</DrawerTitle>
            <DrawerDescription>
              7 energy centres you can work on for a balanced life and practice
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            <EmotionalReflection
              onComplete={handleReflectionComplete}
              onCancel={() => setShowReflectionDrawer(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
