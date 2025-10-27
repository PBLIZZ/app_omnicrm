"use client";

/**
 * StreakCelebration Component
 *
 * Displays a full-screen celebration modal when users hit streak milestones.
 * Triggers confetti animation and shows motivational messages.
 *
 * Milestones: 5, 10, 30, 90 days
 */

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StreakCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streak: number;
  habitName: string;
}

interface MilestoneConfig {
  title: string;
  message: string;
  quote: string;
  gradient: string;
  colors: string[];
  icon: React.ReactNode;
}

const MILESTONE_CONFIGS: Record<number, MilestoneConfig> = {
  5: {
    title: "Great Start!",
    message: "5 days of consistency - you're building a strong foundation",
    quote: "The journey of a thousand miles begins with a single step.",
    gradient: "from-green-500 to-emerald-500",
    colors: ["#16A34A", "#22C55E", "#86EFAC", "#DCFCE7"],
    icon: <Sparkles className="h-12 w-12" />,
  },
  10: {
    title: "Building Momentum!",
    message: "10 days strong - this is becoming a habit",
    quote: "Success is the sum of small efforts repeated day in and day out.",
    gradient: "from-blue-500 to-cyan-500",
    colors: ["#3B82F6", "#06B6D4", "#67E8F9", "#DBEAFE"],
    icon: <Zap className="h-12 w-12" />,
  },
  30: {
    title: "Habit Formed!",
    message: "30 days - you've officially created a new habit",
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    gradient: "from-orange-500 to-red-500",
    colors: ["#F97316", "#EF4444", "#FCA5A5", "#FED7AA"],
    icon: <Trophy className="h-12 w-12" />,
  },
  90: {
    title: "Mastery Achieved!",
    message: "90 days - you're living this habit, not just doing it",
    quote: "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.",
    gradient: "from-purple-500 to-pink-500",
    colors: ["#A855F7", "#EC4899", "#F9A8D4", "#E9D5FF"],
    icon: <Flame className="h-12 w-12" />,
  },
};

function triggerConfetti(colors: string[]): void {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      particleCount,
      angle: randomInRange(55, 125),
      spread: randomInRange(50, 70),
      origin: {
        x: randomInRange(0.1, 0.9),
        y: Math.random() - 0.2,
      },
      colors,
      disableForReducedMotion: true,
    });
  }, 250);
}

export function StreakCelebration({
  open,
  onOpenChange,
  streak,
  habitName,
}: StreakCelebrationProps): JSX.Element | null {
  const config = MILESTONE_CONFIGS[streak];

  useEffect(() => {
    if (open && config) {
      // Trigger confetti after a short delay
      setTimeout(() => {
        triggerConfetti(config.colors);
      }, 300);
    }
  }, [open, config]);

  if (!config) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Animated gradient background */}
        <div
          className={cn(
            "absolute inset-0 rounded-lg opacity-5 animate-pulse",
            `bg-gradient-to-br ${config.gradient}`,
          )}
        />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 py-6">
          {/* Icon with halo effect */}
          <div className="relative">
            <div
              className={cn(
                "absolute inset-0 blur-2xl opacity-30",
                `bg-gradient-to-r ${config.gradient}`,
              )}
            />
            <div
              className={cn(
                "relative p-6 rounded-full text-white",
                `bg-gradient-to-r ${config.gradient}`,
              )}
            >
              {config.icon}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{habitName}</p>
          </div>

          {/* Streak badge */}
          <Badge
            className={cn(
              "text-lg px-4 py-2 border-0 text-white",
              `bg-gradient-to-r ${config.gradient}`,
            )}
          >
            <Flame className="mr-2 h-5 w-5" />
            {streak} Day Streak
          </Badge>

          {/* Message */}
          <p className="text-base font-medium">{config.message}</p>

          {/* Quote */}
          <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-muted-foreground/20">
            <p className="text-sm italic text-muted-foreground">{config.quote}</p>
          </div>

          {/* CTA */}
          <Button
            size="lg"
            onClick={() => onOpenChange(false)}
            className={cn(
              "w-full text-white hover:opacity-90",
              `bg-gradient-to-r ${config.gradient}`,
            )}
          >
            Keep Going!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
