"use client";

import { useState } from "react";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@repo";

/**
 * HabitCard Components (4 Types)
 *
 * Matches exact design from reference images including:
 * - Mint green background container
 * - Subtle colored card backgrounds
 * - Colored streak badges
 * - Progress bars with gradients
 * - Proper spacing and typography
 */

interface BaseHabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  onComplete: (habitId: string, value?: number) => void;
  streakDays: number;
  bestStreak: number;
  habitType: "boolean" | "minutes" | "count" | "hours";
}

/**
 * Boolean Habit Card - Simple completion button
 * Example: Morning Meditation
 * Color: Green theme, light green background
 */
interface BooleanHabitCardProps extends BaseHabitCardProps {
  habitType: "boolean";
}

export function BooleanHabitCard({
  habit,
  isCompleted,
  onComplete,
  streakDays,
  bestStreak,
}: BooleanHabitCardProps): JSX.Element {
  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 shadow-sm">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold ml-3">
            {streakDays}
          </div>
        </div>

        {/* Complete Button */}
        <Button
          onClick={() => onComplete(habit.id)}
          disabled={isCompleted}
          className={cn(
            "w-full h-11 text-base font-medium transition-all shadow-sm",
            isCompleted
              ? "bg-emerald-100 text-emerald-700 cursor-default hover:bg-emerald-100"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          {isCompleted ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Completed
            </>
          ) : (
            "Mark as Complete"
          )}
        </Button>

        {/* Streak Info */}
        <div className="text-center text-xs text-gray-600">
          Best streak: {bestStreak} days
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Minutes/Duration Habit Card - Input for time duration
 * Example: Exercise Session
 * Color: Blue theme, light blue background
 */
interface MinutesHabitCardProps extends BaseHabitCardProps {
  habitType: "minutes";
  targetValue?: number;
  currentValue?: number;
}

export function MinutesHabitCard({
  habit,
  onComplete,
  streakDays,
  bestStreak,
  targetValue = 30,
  currentValue = 0,
}: MinutesHabitCardProps): JSX.Element {
  const [minutes, setMinutes] = useState(currentValue);
  const progress = targetValue > 0 ? Math.min((minutes / targetValue) * 100, 100) : 0;

  const handleLogActivity = (): void => {
    onComplete(habit.id, minutes);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-100 shadow-sm">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full bg-blue-500 text-white text-sm font-bold ml-3">
            {streakDays}
          </div>
        </div>

        {/* Input with unit */}
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="flex-1 h-11 text-center text-lg font-semibold border-2 bg-white"
            min={0}
          />
          <span className="text-gray-700 font-medium text-sm">minutes</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-center text-gray-600">
            {minutes} / {targetValue} minutes
          </div>
        </div>

        {/* Log Button */}
        <Button
          onClick={handleLogActivity}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
        >
          Log Activity
        </Button>

        {/* Streak Info */}
        <div className="text-center text-xs text-gray-600">
          Best streak: {bestStreak} days
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Count Habit Card - Increment/decrement for discrete counts
 * Example: Drink Water (glasses)
 * Color: Cyan theme, light cyan background
 */
interface CountHabitCardProps extends BaseHabitCardProps {
  habitType: "count";
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
}

export function CountHabitCard({
  habit,
  onComplete,
  streakDays,
  bestStreak,
  targetValue = 8,
  targetUnit = "glasses",
  currentValue = 0,
}: CountHabitCardProps): JSX.Element {
  const [count, setCount] = useState(currentValue);
  const progress = targetValue > 0 ? Math.min((count / targetValue) * 100, 100) : 0;

  const increment = (): void => {
    const newCount = count + 1;
    setCount(newCount);
    onComplete(habit.id, newCount);
  };

  const decrement = (): void => {
    if (count > 0) {
      const newCount = count - 1;
      setCount(newCount);
      onComplete(habit.id, newCount);
    }
  };

  const handleLogActivity = (): void => {
    onComplete(habit.id, count);
  };

  return (
    <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-100 shadow-sm">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full bg-cyan-500 text-white text-sm font-bold ml-3">
            {streakDays}
          </div>
        </div>

        {/* Counter with +/- buttons */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={decrement}
            disabled={count === 0}
            className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-cyan-500 hover:bg-cyan-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white"
          >
            <Minus className="w-4 h-4 text-gray-700" />
          </button>
          <div className="text-center min-w-[7rem]">
            <div className="text-4xl font-bold text-gray-900 leading-none">{count}</div>
            <div className="text-sm text-gray-600 mt-1">{targetUnit}</div>
          </div>
          <button
            onClick={increment}
            className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-cyan-500 hover:bg-cyan-50 flex items-center justify-center transition-colors bg-white"
          >
            <Plus className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-center text-gray-600">
            Target: {targetValue} {targetUnit}
          </div>
        </div>

        {/* Log Button */}
        <Button
          onClick={handleLogActivity}
          className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-sm"
        >
          Log Activity
        </Button>

        {/* Streak Info */}
        <div className="text-center text-xs text-gray-600">
          Best streak: {bestStreak} days
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hours Habit Card - Input for time in hours (e.g., sleep)
 * Example: Quality Sleep
 * Color: Purple theme, light purple background
 */
interface HoursHabitCardProps extends BaseHabitCardProps {
  habitType: "hours";
  targetValue?: number;
  currentValue?: number;
}

export function HoursHabitCard({
  habit,
  onComplete,
  streakDays,
  bestStreak,
  targetValue = 8,
  currentValue = 0,
}: HoursHabitCardProps): JSX.Element {
  const [hours, setHours] = useState(currentValue);
  const progress = targetValue > 0 ? Math.min((hours / targetValue) * 100, 100) : 0;
  const isCompleted = progress >= 100;

  const handleLogActivity = (): void => {
    onComplete(habit.id, hours);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-100 shadow-sm">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full bg-purple-500 text-white text-sm font-bold ml-3">
            {streakDays}
          </div>
        </div>

        {/* Input with unit */}
        <div className="flex items-center gap-3">
          <Input
            type="number"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="flex-1 h-11 text-center text-lg font-semibold border-2 bg-white"
            min={0}
          />
          <span className="text-gray-700 font-medium text-sm">hours</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-center text-gray-600">
            {hours} / {targetValue} hours
          </div>
        </div>

        {/* Complete/Log Button */}
        <Button
          onClick={handleLogActivity}
          disabled={isCompleted}
          className={cn(
            "w-full h-10 font-medium transition-all shadow-sm",
            isCompleted
              ? "bg-purple-100 text-purple-700 cursor-default hover:bg-purple-100"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          )}
        >
          {isCompleted ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Completed
            </>
          ) : (
            "Log Activity"
          )}
        </Button>

        {/* Streak Info */}
        <div className="text-center text-xs text-gray-600">
          Best streak: {bestStreak} days
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Container for HabitCards with proper mint green background
 */
interface HabitCardsContainerProps {
  children: React.ReactNode;
  title?: string;
}

export function HabitCardsContainer({ children, title }: HabitCardsContainerProps): JSX.Element {
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-100">
      {title && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-sm text-gray-600">
            Advanced habit tracking with boolean, duration, count, and time types. Includes streak visualization with color gradients and milestone celebrations.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}
