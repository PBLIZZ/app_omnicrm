"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea, Label } from "@/components/ui";
import { Zap, Battery, Clock, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Daily Pulse Widget - Time-based Wellness Pulse Tracking
 *
 * Based on wellness practitioner research:
 * - Time-stamped pulses (AM, PM, Night) for pattern analysis
 * - Battery-style energy indicator (red to green)
 * - Optional notes for context
 * - Historical pulse tracking for trend analysis
 * - Empty state is OK - practitioners can skip pulses
 */

interface PulseData {
  id: string;
  time: string;
  energy: number;
  mood: string;
  notes: string;
  timestamp: string;
}

const MOOD_OPTIONS = [
  { emoji: "🤩", value: "amazing", label: "Amazing" },
  { emoji: "😄", value: "excellent", label: "Excellent" },
  { emoji: "😊", value: "good", label: "Good" },
  { emoji: "😌", value: "calm", label: "Calm" },
  { emoji: "😐", value: "okay", label: "Okay" },
  { emoji: "😴", value: "tired", label: "Tired" },
  { emoji: "😔", value: "low", label: "Low" },
  { emoji: "😫", value: "drained", label: "Drained" },
  { emoji: "😤", value: "frustrated", label: "Frustrated" },
];

export function DailyPulseWidget(): JSX.Element {
  const [currentPulse, setCurrentPulse] = useState<{
    time: string;
    energy: number;
    mood: string;
    notes: string;
  } | null>(null);
  const [editingPulse, setEditingPulse] = useState<PulseData | null>(null);
  const [pulseHistory, setPulseHistory] = useState<PulseData[]>([]);
  const { toast } = useToast();

  // Add CSS animation for shimmer effect
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load pulse history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("pulseHistory");
    if (savedHistory) {
      try {
        setPulseHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Error loading pulse history:", error);
      }
    }
  }, []);

  const getCurrentTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "AM";
    if (hour < 17) return "PM";
    return "Night";
  };

  const getTimeOfDayLabel = (): string => {
    const timeOfDay = getCurrentTimeOfDay();
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    return `${timeString} ${timeOfDay}`;
  };

  const handleEnergyChange = (value: number): void => {
    setCurrentPulse((prev) =>
      prev
        ? { ...prev, energy: value }
        : {
            time: getTimeOfDayLabel(),
            energy: value,
            mood: "okay",
            notes: "",
          },
    );
  };

  const handleMoodChange = (newMood: string): void => {
    setCurrentPulse((prev) =>
      prev
        ? { ...prev, mood: newMood }
        : {
            time: getTimeOfDayLabel(),
            energy: 3,
            mood: newMood,
            notes: "",
          },
    );
  };

  const handleNotesChange = (notes: string): void => {
    setCurrentPulse((prev) =>
      prev
        ? { ...prev, notes }
        : {
            time: getTimeOfDayLabel(),
            energy: 3,
            mood: "okay",
            notes,
          },
    );
  };

  const savePulse = (): void => {
    if (!currentPulse) return;

    const newPulse: PulseData = {
      id: Date.now().toString(),
      ...currentPulse,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [newPulse, ...pulseHistory.slice(0, 4)]; // Keep last 5 pulses
    setPulseHistory(updatedHistory);
    setCurrentPulse(null);

    // Save to localStorage
    localStorage.setItem("pulseHistory", JSON.stringify(updatedHistory));

    toast({
      title: "Pulse Recorded! 📊",
      description: `Your ${getCurrentTimeOfDay().toLowerCase()} pulse has been saved.`,
    });
  };

  const handleEditPulse = (pulse: PulseData): void => {
    setEditingPulse(pulse);
    setCurrentPulse({
      time: pulse.time, // Keep original time display
      energy: pulse.energy,
      mood: pulse.mood,
      notes: pulse.notes,
    });
  };

  const handleUpdatePulse = (): void => {
    if (!currentPulse || !editingPulse) return;

    const updatedPulse: PulseData = {
      ...editingPulse,
      ...currentPulse,
      timestamp: editingPulse.timestamp, // Preserve original timestamp
    };

    const updatedHistory = pulseHistory.map((pulse) =>
      pulse.id === editingPulse.id ? updatedPulse : pulse,
    );
    setPulseHistory(updatedHistory);
    setCurrentPulse(null);
    setEditingPulse(null);

    // Save to localStorage
    localStorage.setItem("pulseHistory", JSON.stringify(updatedHistory));

    toast({
      title: "Pulse Updated! ✏️",
      description: "Your pulse has been updated successfully.",
    });
  };

  const handleDeletePulse = (pulseId: string): void => {
    const updatedHistory = pulseHistory.filter((pulse) => pulse.id !== pulseId);
    setPulseHistory(updatedHistory);

    // Save to localStorage
    localStorage.setItem("pulseHistory", JSON.stringify(updatedHistory));

    toast({
      title: "Pulse Deleted! 🗑️",
      description: "The pulse has been removed from your history.",
    });
  };

  const handleCancelEdit = (): void => {
    setCurrentPulse(null);
    setEditingPulse(null);
  };

  const formatPulseTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, "0");
    const timeOfDay = hour < 12 ? "AM" : hour < 17 ? "PM" : "Night";
    return `${hour.toString().padStart(2, "0")}:${minute} ${timeOfDay}`;
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 h-[35rem] flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-blue-500" />
            Daily Pulse
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setCurrentPulse({
                time: getTimeOfDayLabel(),
                energy: 3,
                mood: "okay",
                notes: "",
              })
            }
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {getCurrentTimeOfDay()} Pulse • {getTimeOfDayLabel()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {currentPulse ? (
          // Pulse Entry Form
          <div className="space-y-4">
            {/* Energy and Mood Side by Side */}
            <div className="grid grid-cols-3 gap-6">
              {/* Energy Level - Upright Battery Style */}
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Battery className="w-4 h-4 text-blue-500" />
                    Energy Level
                  </Label>
                </div>
                <div className="relative">
                  {/* Clickable Upright Battery Container with 5 Levels */}
                  <div className="relative w-20 h-28 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 mx-auto cursor-pointer hover:border-gray-400 transition-colors">
                    {/* Battery Terminal */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-1.5 bg-gray-300 rounded-t-sm"></div>

                    {/* 5 Clickable Battery Levels */}
                    <div className="h-full flex flex-col">
                      {[5, 4, 3, 2, 1].map((level) => (
                        <button
                          key={level}
                          onClick={() => handleEnergyChange(level)}
                          className={`flex-1 border-b border-gray-300 last:border-b-0 transition-all duration-300 hover:brightness-110 ${
                            level <= currentPulse.energy
                              ? level <= 1
                                ? "bg-gradient-to-b from-red-500 to-red-400"
                                : level <= 2
                                  ? "bg-gradient-to-b from-orange-500 to-orange-400"
                                  : level <= 3
                                    ? "bg-gradient-to-b from-yellow-500 to-yellow-400"
                                    : level <= 4
                                      ? "bg-gradient-to-b from-green-400 to-green-500"
                                      : "bg-gradient-to-b from-green-500 to-green-600"
                              : "bg-gray-200 hover:bg-gray-300"
                          }`}
                        >
                          {/* Shimmer effect for active levels */}
                          {level <= currentPulse.energy && (
                            <div
                              className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              style={{
                                animation: `shimmer 2s ease-in-out infinite`,
                                animationDelay: `${(6 - level) * 0.3}s`,
                              }}
                            ></div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Battery Percentage Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-sm font-bold text-white drop-shadow-sm">
                        {Math.round((currentPulse.energy / 5) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mood */}
              <div className="space-y-3 col-span-2">
                <Label className="text-sm font-medium">Current Mood</Label>
                <div className="grid grid-cols-3">
                  {MOOD_OPTIONS.map((moodOption) => (
                    <button
                      key={moodOption.value}
                      onClick={() => handleMoodChange(moodOption.value)}
                      className={`px-2 py-2 rounded-lg text-2xl transition-all duration-200 hover:scale-105 ${
                        currentPulse.mood === moodOption.value
                          ? "bg-gray-200 scale-105"
                          : "hover:bg-gray-100"
                      }`}
                      title={moodOption.label}
                    >
                      {moodOption.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                placeholder="How are you feeling? What's affecting your energy?"
                value={currentPulse.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>

            {/* Save/Update Button */}
            <div className="flex gap-2">
              <Button onClick={editingPulse ? handleUpdatePulse : savePulse} className="flex-1">
                {editingPulse ? "Update Pulse" : `Save ${getCurrentTimeOfDay()} Pulse`}
              </Button>
              {editingPulse && (
                <Button onClick={handleCancelEdit} variant="outline" className="px-4">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          // No Current Pulse - Show History or Start Button
          <div className="space-y-4">
            {pulseHistory.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Pulses
                </h4>
                {pulseHistory.slice(0, 3).map((pulse) => (
                  <div
                    key={pulse.id}
                    className="p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer group"
                    onClick={() => handleEditPulse(pulse)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPulseTime(pulse.timestamp)}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Mini Upright Battery */}
                        <div className="relative w-12 h-16 bg-gray-200 rounded-sm overflow-hidden border border-gray-300">
                          <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-gray-300 rounded-t-sm"></div>
                          <div className="h-full flex flex-col">
                            {[5, 4, 3, 2, 1].map((level) => (
                              <div
                                key={level}
                                className={`flex-1 border-b border-gray-300 last:border-b-0 ${
                                  level <= pulse.energy
                                    ? level <= 1
                                      ? "bg-gradient-to-b from-red-500 to-red-400"
                                      : level <= 2
                                        ? "bg-gradient-to-b from-orange-500 to-orange-400"
                                        : level <= 3
                                          ? "bg-gradient-to-b from-yellow-500 to-yellow-400"
                                          : level <= 4
                                            ? "bg-gradient-to-b from-green-400 to-green-500"
                                            : "bg-gradient-to-b from-green-500 to-green-600"
                                    : "bg-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-white drop-shadow-sm">
                              {Math.round((pulse.energy / 5) * 100)}%
                            </span>
                          </div>
                        </div>
                        {/* Delete Button - Always visible */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePulse(pulse.id);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {MOOD_OPTIONS.find((mood) => mood.value === pulse.mood)?.emoji || "😐"}{" "}
                      {MOOD_OPTIONS.find((mood) => mood.value === pulse.mood)?.label || "Okay"}
                    </p>
                    {pulse.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{pulse.notes}"</p>
                    )}
                    {/* Edit hint - only show on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                      <p className="text-xs text-blue-600">Click to edit</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-4">No pulses recorded yet</p>
                <p className="text-xs text-gray-400">Track your energy throughout the day</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
