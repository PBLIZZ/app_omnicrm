"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { CheckSquare, Plus, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Type definition for habit objects
interface Habit {
  id: number;
  name: string;
  completed: boolean;
  streak: number;
}

// Configuration constants
const CONFIG = {
  MAX_HABITS_DISPLAYED: 3,
} as const;

/**
 * Habit Trackers Component
 * Simple habit tracking for wellness practitioners with progressive disclosure
 */
export function HabitTrackers(): JSX.Element {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [showAllHabits, setShowAllHabits] = useState(false);
  const { toast } = useToast();

  // Helper function to safely access localStorage
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === "undefined") return;
      localStorage.setItem(key, value);
    },
  };

  // Initialize habits with daily reset logic
  const initializeHabits = () => {
    const today = new Date().toDateString();
    const lastReset = safeLocalStorage.getItem("habitResetDate");

    // If it's a new day, reset all habits and update streaks
    if (lastReset !== today) {
      const savedHabits = JSON.parse(safeLocalStorage.getItem("habits") || "[]");
      const resetHabits = savedHabits.map((habit: Habit) => ({
        ...habit,
        completed: false, // Reset all to incomplete
        streak: habit.completed ? habit.streak : 0, // Reset streak to 0 if not completed yesterday
      }));

      safeLocalStorage.setItem("habits", JSON.stringify(resetHabits));
      safeLocalStorage.setItem("habitResetDate", today);
      return resetHabits;
    }

    // Return saved habits or empty array if no saved data
    const savedHabits = JSON.parse(safeLocalStorage.getItem("habits") || "[]");
    return savedHabits;
  };

  const [habits, setHabits] = useState<Habit[]>([]);
  const [lastResetDate, setLastResetDate] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize habits after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsHydrated(true);
    const initialHabits = initializeHabits();
    setHabits(initialHabits);
  }, []);

  // Check for daily reset on component mount and when date changes
  useEffect(() => {
    if (!isHydrated) return;
    const today = new Date().toDateString();
    const lastReset = safeLocalStorage.getItem("habitResetDate");

    if (lastReset !== today) {
      // New day detected - reset habits
      setHabits((prevHabits: Habit[]) => {
        const resetHabits = prevHabits.map((habit: Habit) => ({
          ...habit,
          completed: false, // Reset all to incomplete
          streak: habit.completed ? habit.streak : 0, // Reset streak to 0 if not completed yesterday
        }));

        safeLocalStorage.setItem("habits", JSON.stringify(resetHabits));
        safeLocalStorage.setItem("habitResetDate", today);
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
              description: `${habit.name} streak: ${newStreak} days`,
            });
          } else {
            toast({
              title: "Habit Undone",
              description: `${habit.name} streak: ${newStreak} days`,
            });
          }

          return { ...habit, completed: newCompleted, streak: newStreak };
        }
        return habit;
      });

      safeLocalStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });
  };

  const addHabit = (): void => {
    if (newHabitName.trim()) {
      const newHabit: Habit = {
        id: Date.now(),
        name: newHabitName.trim(),
        completed: false,
        streak: 0,
      };

      setHabits((prevHabits: Habit[]) => {
        const updatedHabits = [...prevHabits, newHabit];
        safeLocalStorage.setItem("habits", JSON.stringify(updatedHabits));
        return updatedHabits;
      });

      setNewHabitName("");
      setShowAddModal(false);

      toast({
        title: "Habit Added! 📝",
        description: `${newHabit.name} has been added to your habits.`,
      });
    }
  };

  const deleteHabit = (habitId: number): void => {
    setHabits((prevHabits: Habit[]) => {
      const updatedHabits = prevHabits.filter((habit: Habit) => habit.id !== habitId);
      safeLocalStorage.setItem("habits", JSON.stringify(updatedHabits));
      return updatedHabits;
    });

    toast({
      title: "Habit Deleted",
      description: "The habit has been removed from your list.",
    });
  };

  const editHabit = (habit: Habit): void => {
    setEditingHabit(habit);
    setNewHabitName(habit.name);
    setShowEditModal(true);
  };

  const saveEditHabit = (): void => {
    if (editingHabit && newHabitName.trim()) {
      setHabits((prevHabits: Habit[]) => {
        const updatedHabits = prevHabits.map((habit: Habit) =>
          habit.id === editingHabit.id ? { ...habit, name: newHabitName.trim() } : habit,
        );
        safeLocalStorage.setItem("habits", JSON.stringify(updatedHabits));
        return updatedHabits;
      });

      setNewHabitName("");
      setShowEditModal(false);
      setEditingHabit(null);

      toast({
        title: "Habit Updated! ✏️",
        description: "Your habit has been updated successfully.",
      });
    }
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 h-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5 text-green-500" />
            Habit Trackers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading habits...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-teal-200 h-[390px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="flex items-center gap-2 text-lg cursor-help">
                  <CheckSquare className="w-5 h-5 text-sky-500" />
                  Habit Trackers
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>Track your daily wellness habits and build consistent routines</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddModal(true)}
            className="h-8 w-8 p-0 text-sky-600 hover:text-green-700 hover:bg-green-100"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-1 flex-1 overflow-y-auto pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Incomplete Habits */}
        {incompleteHabits.map((habit: Habit) => (
          <div
            key={habit.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHabit(habit.id);
                }}
                className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors cursor-pointer flex-shrink-0"
              >
                {habit.completed && <span className="text-white text-xs">✓</span>}
              </button>
              <div className="flex-1 cursor-pointer" onClick={() => editHabit(habit)}>
                <p className="text-sm font-medium text-gray-900">{habit.name}</p>
                <p className="text-xs text-gray-500">
                  {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                deleteHabit(habit.id);
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
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
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHabit(habit.id);
                        }}
                        className="w-4 h-4 rounded-full border-2 bg-green-500 border-green-500 flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer flex-shrink-0"
                      >
                        <span className="text-white text-xs">✓</span>
                      </button>
                      <div className="flex-1 cursor-pointer" onClick={() => editHabit(habit)}>
                        <p className="text-sm font-medium text-green-800">{habit.name}</p>
                        <p className="text-xs text-green-600">
                          {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHabit(habit.id);
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
