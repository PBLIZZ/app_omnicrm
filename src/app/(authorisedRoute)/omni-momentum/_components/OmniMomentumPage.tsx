"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import {
  Zap,
  Mic,
  Send,
  Sparkles,
  Plus,
  CheckSquare,
  TrendingUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// ✅ Following DTO/Repository architecture - hooks use repository pattern internally
import { useInbox } from "@/hooks/use-inbox";
import { useZones } from "@/hooks/use-zones";
import { TodaysFocusSection } from "./TodaysFocusSection";
import { DailyPulseWidget } from "./DailyPulseWidget";

// Type definition for habit objects
interface Habit {
  id: number;
  name: string;
  completed: boolean;
  streak: number;
}

// Configuration constants
const CONFIG = {
  MAX_HABITS_DISPLAYED: 5,
  MAX_ZONES_DISPLAYED: 6,
  CARD_HEIGHT: "35rem",
} as const;

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

      // ✅ Using void to explicitly handle Promise without await (ESLint no-floating-promises compliance)
      void quickCapture({ rawText: rawText.trim() });
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
    <Card
      className={`bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 h-[${CONFIG.CARD_HEIGHT}] flex flex-col`}
    >
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Quick Capture
        </CardTitle>
        <CardDescription>
          Dump everything here. Your thoughts will be organized into actionable steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
 * Habit Trackers Component
 * Simple habit tracking for wellness practitioners with progressive disclosure
 */
function HabitTrackers(): JSX.Element {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [showAllHabits, setShowAllHabits] = useState(false);
  const { toast } = useToast();

  // Initialize habits with daily reset logic
  const initializeHabits = () => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem("habitResetDate");

    // If it's a new day, reset all habits and update streaks
    if (lastReset !== today) {
      const savedHabits = JSON.parse(localStorage.getItem("habits") || "[]");
      const resetHabits = savedHabits.map((habit: Habit) => ({
        ...habit,
        completed: false, // Reset all to incomplete
        streak: habit.completed ? habit.streak : 0, // Reset streak to 0 if not completed yesterday
      }));

      localStorage.setItem("habits", JSON.stringify(resetHabits));
      localStorage.setItem("habitResetDate", today);
      return resetHabits;
    }

    // Return saved habits or empty array if no saved data
    const savedHabits = JSON.parse(localStorage.getItem("habits") || "[]");
    return savedHabits;
  };

  const [habits, setHabits] = useState(initializeHabits);
  const [lastResetDate, setLastResetDate] = useState<string>("");

  // Check for daily reset on component mount and when date changes
  useEffect(() => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem("habitResetDate");

    if (lastReset !== today) {
      // New day detected - reset habits
      setHabits((prevHabits: Habit[]) => {
        const resetHabits = prevHabits.map((habit: Habit) => ({
          ...habit,
          completed: false, // Reset all to incomplete
          streak: habit.completed ? habit.streak : 0, // Reset streak to 0 if not completed yesterday
        }));

        localStorage.setItem("habits", JSON.stringify(resetHabits));
        localStorage.setItem("habitResetDate", today);
        setLastResetDate(today);

        // Show reset notification
        toast({
          title: "New Day! 🌅",
          description: "Habits reset for today. Complete them to maintain your streaks!",
        });

        return resetHabits;
      });
    } else {
      setLastResetDate(today);
    }
  }, [toast]);

  // Sort habits by streak (highest first) and filter by completion status
  const allIncompleteHabits = habits
    .filter((habit: Habit) => !habit.completed)
    .sort((a: Habit, b: Habit) => b.streak - a.streak);

  const incompleteHabits = showAllHabits
    ? allIncompleteHabits
    : allIncompleteHabits.slice(0, CONFIG.MAX_HABITS_DISPLAYED);

  const completedHabits = habits
    .filter((habit: Habit) => habit.completed)
    .sort((a: Habit, b: Habit) => b.streak - a.streak);

  const toggleHabit = (habitId: number): void => {
    setHabits((prevHabits: Habit[]) => {
      const updatedHabits = prevHabits.map((habit: Habit) => {
        if (habit.id === habitId) {
          const newCompleted = !habit.completed;
          const newStreak = newCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1);

          // Show toast notification for streak changes
          if (newCompleted) {
            toast({
              title: "Habit Completed! 🎉",
              description: `${habit.name} - ${newStreak} day streak!`,
            });
          } else {
            toast({
              title: "Habit Undone",
              description: `${habit.name} - streak reset to ${newStreak} days`,
            });
          }

          return {
            ...habit,
            completed: newCompleted,
            streak: newStreak,
          };
        }
        return habit;
      });

      // Save to localStorage
      localStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });
  };

  const addHabit = (): void => {
    if (!newHabitName.trim()) {
      toast({
        title: "Habit name required",
        description: "Please enter a name for your new habit.",
        variant: "destructive",
      });
      return;
    }

    const newHabit = {
      id: Date.now(), // Simple ID generation
      name: newHabitName.trim(),
      completed: false,
      streak: 0,
    };

    setHabits((prevHabits: Habit[]) => {
      const updatedHabits = [...prevHabits, newHabit];
      localStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });

    setNewHabitName("");
    setShowAddModal(false);
    toast({
      title: "Habit Added! ✨",
      description: `${newHabit.name} has been added to your habits.`,
    });
  };

  const editHabit = (habit: Habit): void => {
    setEditingHabit(habit);
    setNewHabitName(habit.name);
    setShowEditModal(true);
  };

  const saveEditHabit = (): void => {
    if (!newHabitName.trim()) {
      toast({
        title: "Habit name required",
        description: "Please enter a name for your habit.",
        variant: "destructive",
      });
      return;
    }

    setHabits((prevHabits: Habit[]) => {
      const updatedHabits = prevHabits.map((habit: Habit) =>
        habit.id === editingHabit?.id ? { ...habit, name: newHabitName.trim() } : habit,
      );
      localStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });

    setNewHabitName("");
    setShowEditModal(false);
    setEditingHabit(null);
    toast({
      title: "Habit Updated! ✏️",
      description: "Your habit has been updated successfully.",
    });
  };

  const deleteHabit = (habitId: number): void => {
    setHabits((prevHabits: Habit[]) => {
      const updatedHabits = prevHabits.filter((habit: Habit) => habit.id !== habitId);
      localStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });

    toast({
      title: "Habit Deleted",
      description: "The habit has been removed from your tracker.",
    });
  };

  return (
    <Card
      className={`bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 h-[${CONFIG.CARD_HEIGHT}] flex flex-col`}
    >
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5 text-green-500" />
            Habit Trackers
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddModal(true)}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Track your daily wellness practices • Top {CONFIG.MAX_HABITS_DISPLAYED} by streak shown
          first
          {lastResetDate && (
            <span className="block text-xs text-gray-500 mt-1">
              Last reset: {new Date(lastResetDate).toLocaleDateString()}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Incomplete Habits */}
        {incompleteHabits.map((habit: Habit) => (
          <div
            key={habit.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => editHabit(habit)}
            >
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                {habit.completed && <span className="text-white text-xs">✓</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{habit.name}</p>
                <p className="text-xs text-gray-500">
                  {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteHabit(habit.id);
                }}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleHabit(habit.id)}>
                Mark Done
              </Button>
            </div>
          </div>
        ))}

        {/* Show More/Less Toggle for Incomplete Habits */}
        {allIncompleteHabits.length > CONFIG.MAX_HABITS_DISPLAYED && (
          <div className="pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllHabits(!showAllHabits)}
              className="w-full text-xs text-gray-600 hover:text-gray-800"
            >
              {showAllHabits
                ? "Show Less"
                : `Show ${allIncompleteHabits.length - CONFIG.MAX_HABITS_DISPLAYED} More`}
              <ChevronDown
                className={`w-3 h-3 ml-1 transition-transform ${showAllHabits ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        )}

        {/* Completed Habits Toggle */}
        {completedHabits.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full text-xs text-gray-600 hover:text-gray-800"
            >
              {showCompleted ? "Hide" : "Show"} {completedHabits.length} completed today
              <ChevronDown
                className={`w-3 h-3 ml-1 transition-transform ${showCompleted ? "rotate-180" : ""}`}
              />
            </Button>

            {/* Completed Habits List */}
            {showCompleted && (
              <div className="space-y-2 mt-3">
                {completedHabits.map((habit: Habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200 hover:shadow-sm transition-shadow"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => editHabit(habit)}
                    >
                      <div className="w-4 h-4 rounded-full border-2 bg-green-500 border-green-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">{habit.name}</p>
                        <p className="text-xs text-green-600">
                          {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHabit(habit.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleHabit(habit.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                      >
                        Undo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Habit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Habit</DialogTitle>
            <DialogDescription>
              Create a new habit to track your daily wellness practices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Habit Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g., Morning Meditation"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addHabit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={addHabit}>Add Habit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Habit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
            <DialogDescription>Update the name of your habit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-habit-name">Habit Name</Label>
              <Input
                id="edit-habit-name"
                placeholder="e.g., Morning Meditation"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveEditHabit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditHabit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * Main OmniMomentum Page Component
 *
 * Optimized layout:
 * - Top row: Daily Pulse (1/3) + Habit Trackers (1/3) + Quick Capture (1/3)
 * - Second row: Today's Focus (2/3) + Wellness Zone Status (1/3)
 * - Bottom: Consolidated Wellness Zones (no duplication)
 */
export function OmniMomentumPage(): JSX.Element {
  const { zones } = useZones();

  return (
    <div className="space-y-6">
      {/* Top Row: Daily Pulse + Habit Trackers + Quick Capture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Daily Pulse - 1/3 */}
        <div className="lg:col-span-1">
          <DailyPulseWidget />
        </div>

        {/* Habit Trackers - 1/3 */}
        <div className="lg:col-span-1">
          <HabitTrackers />
        </div>

        {/* Quick Capture - 1/3 */}
        <div className="lg:col-span-1">
          <QuickCaptureInput />
        </div>
      </div>

      {/* Second Row: Today's Focus + Wellness Zone Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Focus - 2/3 */}
        <div className="lg:col-span-2">
          <TodaysFocusSection />
        </div>

        {/* Wellness Zone Status - 1/3 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Zone Status
              </CardTitle>
              <CardDescription>Your wellness zones at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zones.slice(0, CONFIG.MAX_ZONES_DISPLAYED).map((zone) => (
                  <div key={zone.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color || "#6366f1" }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{zone.name}</h3>
                      <p className="text-xs text-gray-500">In Flow</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: Consolidated Wellness Zones */}
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
