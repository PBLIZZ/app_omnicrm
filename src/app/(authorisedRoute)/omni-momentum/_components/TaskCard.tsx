"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Flag,
  Check,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ListTodo,
  Tag,
  Users,
  Calendar,
  FileText,
  Mic,
  Bot,
  User,
  MapPin,
  Layers,
} from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { useMomentum } from "@/hooks/use-momentum";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useZones } from "@/hooks/use-zones";
import { TagManager } from "@/components/TagManager";
import { ContactManager } from "@/components/ContactManager";
import type { LinkedContact } from "@/components/ContactSelector";
import type { Project } from "@/server/db/schema";
import type { TaskListItem } from "@repo";

interface TaskCardProps {
  task: TaskListItem;
  projects?: Project[];
  onOpenContactModal?: (taskId: string) => void;
  onOpenNotesModal?: (taskId: string) => void;
  onVoiceInput?: (taskId: string) => void;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  duration?: string;
}

interface TaskTag {
  id: string;
  name: string;
  color: string;
}

/**
 * Render an interactive task card for viewing and editing a TaskListItem.
 *
 * Renders controls for priority, completion, subtasks, tags, linked contacts, date/time, project,
 * owner (user/AI), notes, location, zone, and voice input, and performs debounced updates via the
 * Momentum updateTask service.
 *
 * @param task - The task data to display and edit
 * @param projects - Optional list of projects available for assignment
 * @param onOpenContactModal - Optional callback invoked with the task id to open the contact modal
 * @param onOpenNotesModal - (unused local alias) Optional callback invoked with the task id to open the notes modal
 * @param onVoiceInput - Optional callback invoked with the task id to initiate voice input
 * @returns A JSX element containing the fully interactive task card UI
 */
export function TaskCard({
  task,
  projects = [],
  onOpenContactModal,
  onOpenNotesModal: _onOpenNotesModal,
  onVoiceInput,
}: TaskCardProps): JSX.Element {
  // Enhanced state management for progressive disclosure
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showLocationPopover, setShowLocationPopover] = useState(false);
  const [showDatePickerPopover, setShowDatePickerPopover] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);
  const [showDetailsEditor, setShowDetailsEditor] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);

  // Future enhancement state (not yet implemented)
  // const [isEditingTitle, setIsEditingTitle] = useState(false);
  // const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  const { updateTask } = useMomentum();
  const { profile } = useUserProfile();
  const { zones } = useZones();

  // Refs for auto-focus
  const detailsInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Extract task details from JSONB
  const details =
    typeof task.details === "object" && task.details !== null
      ? (task.details as Record<string, unknown>)
      : {};

  // Parse subtasks from details
  const subtasks: Subtask[] = Array.isArray(details["subtasks"])
    ? (details["subtasks"] as Subtask[])
    : [];

  // Get tags from relational task.tags (not JSONB details)
  const tags: TaskTag[] = Array.isArray(task.tags) ? task.tags : [];

  // Parse linked contacts
  const linkedContacts: LinkedContact[] = Array.isArray(details["linkedContacts"])
    ? (details["linkedContacts"] as LinkedContact[])
    : [];

  // Parse location
  const location = typeof details["location"] === "string" ? details["location"] : null;
  const [localLocation, setLocalLocation] = useState(location || "");
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local location with prop changes
  useEffect(() => {
    setLocalLocation(location || "");
  }, [location]);

  // Parse notes/description (renamed to details for clarity)
  const taskDetails = typeof details["notes"] === "string" ? details["notes"] : "";
  const [localDetails, setLocalDetails] = useState(taskDetails);
  const detailsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local details with prop changes
  useEffect(() => {
    setLocalDetails(taskDetails);
  }, [taskDetails]);

  // Auto-focus details input when editor is shown
  useEffect(() => {
    if (showDetailsEditor && detailsInputRef.current) {
      detailsInputRef.current.focus();
    }
  }, [showDetailsEditor]);

  // Parse owner (user or AI)
  const owner = typeof details["owner"] === "string" ? details["owner"] : "user";

  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const totalSubtasks = subtasks.length;

  // Conditional rendering helpers - determine what should be visible
  const shouldShowLocation = location !== null && location !== "";
  const shouldShowPeople = linkedContacts.length > 0;
  const shouldShowDetails = showDetailsEditor || taskDetails.length > 0;
  const shouldShowDateBadge = task.dueDate !== null;

  // Priority colors
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "high":
        return "text-red-500 fill-red-500";
      case "medium":
        return "text-orange-500 fill-orange-500";
      case "low":
        return "text-blue-500 fill-blue-500";
      default:
        return "text-gray-400";
    }
  };

  // Handle priority change
  const handlePriorityChange = (priority: "low" | "medium" | "high" | null): void => {
    updateTask(task.id, { priority: priority || "medium" });
  };

  // Handle task completion toggle
  const handleToggleComplete = (): void => {
    if (isCompleting) return;

    setIsCompleting(true);
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask(task.id, { status: newStatus });

    // Reset completing state after a short delay for visual feedback
    setTimeout(() => {
      setIsCompleting(false);
    }, 600);
  };

  // Handle subtask toggle
  const handleSubtaskToggle = (subtaskId: string): void => {
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st,
    );

    updateTask(task.id, {
      details: {
        ...details,
        subtasks: updatedSubtasks,
      },
    });
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined): void => {
    if (!date) return;
    // Send native Date object - service layer serializes to the expected format
    updateTask(task.id, { dueDate: date });
  };

  // Handle preset date selections
  const handlePresetDate = (preset: "today" | "this-evening" | "tomorrow"): void => {
    let date = new Date();

    switch (preset) {
      case "today":
        // Today at current time
        break;
      case "this-evening":
        // Today at 6 PM
        date = setHours(setMinutes(date, 0), 18);
        break;
      case "tomorrow":
        // Tomorrow at 9 AM
        date = setHours(setMinutes(addDays(date, 1), 0), 9);
        break;
    }

    handleDateSelect(date);
  };

  // Handle project change
  const handleProjectChange = (projectId: string | null): void => {
    updateTask(task.id, { projectId });
  };

  // Handle owner change
  const handleOwnerChange = (newOwner: string): void => {
    updateTask(task.id, {
      details: {
        ...details,
        owner: newOwner,
      },
    });
  };

  // Handle location update with debouncing
  const handleLocationUpdate = (newLocation: string): void => {
    setLocalLocation(newLocation);

    // Clear existing timeout
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
    }

    // Debounce API call by 500ms
    locationTimeoutRef.current = setTimeout(() => {
      updateTask(task.id, {
        details: {
          ...details,
          location: newLocation,
        },
      });
    }, 500);
  };

  // Handle details/notes update with debouncing
  const handleDetailsUpdate = (newDetails: string): void => {
    setLocalDetails(newDetails);

    // Clear existing timeout
    if (detailsTimeoutRef.current) {
      clearTimeout(detailsTimeoutRef.current);
    }

    // Debounce API call by 500ms
    detailsTimeoutRef.current = setTimeout(() => {
      updateTask(task.id, {
        details: {
          ...details,
          notes: newDetails,
        },
      });
    }, 500);
  };

  // Handle add subtask
  const handleAddSubtask = (): void => {
    if (!newSubtaskTitle.trim()) return;

    // Create new subtask object
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    // Add to existing subtasks array in details.subtasks
    const updatedSubtasks = [...subtasks, newSubtask];

    updateTask(task.id, {
      details: {
        ...details,
        subtasks: updatedSubtasks,
      },
    });

    // Reset state
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
  };

  // Format due date for display
  const formatDueDate = (dateString: string | null): string => {
    if (!dateString) return "Set due date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Today";
    }
    if (format(date, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) {
      return "Tomorrow";
    }
    return format(date, "MMM d");
  };

  // Get zone color for border - each task shows its own zone color
  const zone = zones.find((z) => z.uuidId === task.zoneUuid);
  const zoneColor = zone?.color || "#a78bfa"; // Default to desaturated violet if no zone

  return (
    <div
      className="w-full max-w-md bg-gradient-to-br from-teal-100 via-emerald-50 to-cyan-100 rounded-2xl shadow-lg overflow-hidden relative"
      style={{
        borderLeft: `4px solid ${zoneColor}`,
      }}
    >
      {/* Header: Priority Flag + Circle (left) and More Options (right) */}
      <div className="flex justify-between items-start p-4 pb-3">
        <div className="flex items-center gap-2">
          {/* Priority Flag - Click to change priority */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`${getPriorityColor(task.priority)} hover:scale-110 transition-transform`}
              >
                <Flag className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-2">
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500">Set Priority</div>
                <button
                  onClick={() => handlePriorityChange("high")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 ${
                    task.priority === "high" ? "bg-red-50" : ""
                  }`}
                >
                  <Flag className="w-4 h-4 text-red-500 fill-red-500" />
                  <span className="text-sm">High</span>
                </button>
                <button
                  onClick={() => handlePriorityChange("medium")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 ${
                    task.priority === "medium" ? "bg-orange-50" : ""
                  }`}
                >
                  <Flag className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span className="text-sm">Medium</span>
                </button>
                <button
                  onClick={() => handlePriorityChange("low")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 ${
                    task.priority === "low" ? "bg-blue-50" : ""
                  }`}
                >
                  <Flag className="w-4 h-4 text-blue-500 fill-blue-500" />
                  <span className="text-sm">Low</span>
                </button>
                <button
                  onClick={() => handlePriorityChange(null)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100"
                >
                  <Flag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">None</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Circle - Click to complete task (Any.do style) */}
          <button
            onClick={handleToggleComplete}
            disabled={isCompleting}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              task.status === "done"
                ? "bg-gray-500 hover:bg-gray-600"
                : "border-2 border-gray-300 hover:border-gray-500"
            }`}
            aria-label={task.status === "done" ? "Mark as incomplete" : "Mark as complete"}
          >
            {task.status === "done" && <Check className="w-4 h-4 text-white" />}
          </button>
        </div>

        {/* Right side: Date Badge + More Options */}
        <div className="flex items-center gap-2">
          {/* Date Badge - Shows when date is set */}
          {shouldShowDateBadge && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors bg-white/40 hover:bg-white/60 ${(() => {
                    if (!task.dueDate) return "text-gray-700";
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate < today && task.status !== "done") {
                      return "text-red-600";
                    }
                    if (dueDate.getTime() === today.getTime()) {
                      return "text-blue-600";
                    }
                    return "text-gray-700";
                  })()}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDueDate(task.dueDate)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <div className="p-2 border-b">
                  <button
                    onClick={() => handlePresetDate("today")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handlePresetDate("this-evening")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    This Evening
                  </button>
                  <button
                    onClick={() => handlePresetDate("tomorrow")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    Tomorrow
                  </button>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={task.dueDate ? new Date(task.dueDate) : undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* More Options Menu */}
          <DropdownMenu open={showMoreOptionsDropdown} onOpenChange={setShowMoreOptionsDropdown}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/50 rounded-full"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm">
              <div className="px-2 py-1.5 text-sm font-semibold">More Options</div>
              <DropdownMenuItem
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <ListTodo className="w-5 h-5" />
                <span>Subtasks</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowMoreOptionsDropdown(false);
                  setShowTagSelector(true);
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <Tag className="w-5 h-5" />
                <span>Tags</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowMoreOptionsDropdown(false);
                  setShowContactModal(true);
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <Users className="w-5 h-5" />
                <span>People</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  console.log("📅 Date & Time clicked, opening popover");
                  setShowMoreOptionsDropdown(false);
                  setShowDatePickerPopover(true);
                  console.log("📅 showDatePickerPopover set to true");
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <Calendar className="w-5 h-5" />
                <span>Date & Time</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowMoreOptionsDropdown(false);
                  setShowDetailsEditor(true);
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span>Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowMoreOptionsDropdown(false);
                  setShowLocationPopover(true);
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <MapPin className="w-5 h-5" />
                <span>Location</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowMoreOptionsDropdown(false);
                  setShowZoneSelector(true);
                }}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <Layers className="w-5 h-5" />
                <span>Zone</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separate Date Picker Popover (opened from dropdown) */}
          {showDatePickerPopover && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowDatePickerPopover(false)}
            >
              <div
                className="bg-white rounded-lg shadow-lg p-0 w-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 border-b">
                  <button
                    onClick={() => {
                      handlePresetDate("today");
                      setShowDatePickerPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      handlePresetDate("this-evening");
                      setShowDatePickerPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    This Evening
                  </button>
                  <button
                    onClick={() => {
                      handlePresetDate("tomorrow");
                      setShowDatePickerPopover(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    Tomorrow
                  </button>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={task.dueDate ? new Date(task.dueDate) : undefined}
                  onSelect={(date) => {
                    handleDateSelect(date);
                    setShowDatePickerPopover(false);
                  }}
                  initialFocus
                />
              </div>
            </div>
          )}

          {/* Separate Location Modal (opened from dropdown) */}
          {showLocationPopover && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowLocationPopover(false)}
            >
              <div
                className="bg-white rounded-lg shadow-lg p-4 w-80"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Home Office, Coffee Shop..."
                    value={localLocation}
                    onChange={(e) => handleLocationUpdate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Save immediately and close
                        if (locationTimeoutRef.current) {
                          clearTimeout(locationTimeoutRef.current);
                        }
                        updateTask(task.id, {
                          details: {
                            ...details,
                            location: localLocation,
                          },
                        });
                        setShowLocationPopover(false);
                      } else if (e.key === "Escape") {
                        setShowLocationPopover(false);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                  {localLocation && (
                    <p className="text-xs text-gray-500">Press Enter to save and close</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Zone Selector Modal (opened from dropdown) */}
          {showZoneSelector && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowZoneSelector(false)}
            >
              <div
                className="bg-white rounded-lg shadow-lg p-4 w-80"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Zone</label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {zones.map((zone) => (
                      <button
                        key={zone.uuidId}
                        onClick={() => {
                          updateTask(task.id, { zoneUuid: zone.uuidId });
                          setShowZoneSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                          task.zoneUuid === zone.uuidId
                            ? "bg-blue-50 border-2 border-blue-500"
                            : "border border-gray-200"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: zone.color || "#gray" }}
                        />
                        <span className="font-medium">{zone.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Click a zone to assign this task</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Title */}
      <div className="px-4 pb-3">
        <h3
          className={`text-xl font-semibold leading-tight ${
            task.status === "done" ? "line-through text-gray-500" : "text-gray-900"
          }`}
        >
          {task.name}
        </h3>
      </div>

      {/* Location + People Row - Compact single line */}
      {(shouldShowLocation || shouldShowPeople) && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs">
            {shouldShowLocation && (
              <Popover open={showLocationPopover} onOpenChange={setShowLocationPopover}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{location}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <input
                      type="text"
                      placeholder="e.g., Home Office, Coffee Shop..."
                      value={localLocation}
                      onChange={(e) => handleLocationUpdate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // Save immediately and close
                          if (locationTimeoutRef.current) {
                            clearTimeout(locationTimeoutRef.current);
                          }
                          updateTask(task.id, {
                            details: {
                              ...details,
                              location: localLocation,
                            },
                          });
                          setShowLocationPopover(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                    {localLocation && (
                      <p className="text-xs text-gray-500">Press Enter to save and close</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {shouldShowLocation && shouldShowPeople && <span>•</span>}
            {shouldShowPeople && (
              <>
                <Users className="w-4 h-4" />
                <span>
                  {linkedContacts
                    .slice(0, 2)
                    .map((c) => c.name)
                    .join(", ")}
                  {linkedContacts.length > 2 && ` +${linkedContacts.length - 2} more`}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tags - Always render so modal can open even with 0 tags */}
      <div className="px-4 pb-3">
        <TagManager
          tags={tags}
          entityType="task"
          entityId={task.id}
          maxVisible={3}
          showModal={showTagSelector}
          onModalChange={setShowTagSelector}
        />
      </div>

      {/* Contact Manager - Always render for linking contacts to tasks */}
      <div className="px-4 pb-3">
        <ContactManager
          linkedContacts={linkedContacts}
          taskId={task.id}
          maxVisible={3}
          showModal={showContactModal}
          onModalChange={setShowContactModal}
        />
      </div>

      {/* Subtasks Progress */}
      {showSubtasks && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="w-full bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/80 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {completedSubtasks}/{totalSubtasks} Subtasks
            </span>
            {showSubtasks ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      )}

      {/* Subtasks List - Expandable */}
      {showSubtasks && (
        <div className="px-4 pb-3 space-y-2">
          {/* Existing subtasks */}
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-3">
              <button
                onClick={() => handleSubtaskToggle(subtask.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  subtask.completed
                    ? "bg-gray-500 hover:bg-gray-600"
                    : "border-2 border-gray-300 hover:border-gray-500"
                }`}
                aria-label={subtask.completed ? "Mark as incomplete" : "Mark as complete"}
              >
                {subtask.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <span
                className={`text-sm flex-1 ${
                  subtask.completed ? "line-through text-gray-400" : "text-gray-900"
                }`}
              >
                {subtask.title}
                {subtask.duration && (
                  <span className="text-red-500 ml-1">({subtask.duration})</span>
                )}
              </span>
            </div>
          ))}

          {/* Add subtask input or button */}
          {isAddingSubtask ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") {
                    setIsAddingSubtask(false);
                    setNewSubtaskTitle("");
                  }
                }}
                placeholder="Subtask title..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddSubtask}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingSubtask(false);
                  setNewSubtaskTitle("");
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSubtask(true)}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-white/50 rounded-lg transition-colors"
            >
              + Add subtask
            </button>
          )}
        </div>
      )}

      {/* Details Editor - Inline */}
      {shouldShowDetails && (
        <div className="px-4 pb-3">
          <div className="bg-white/50 rounded-lg p-3">
            <textarea
              ref={detailsInputRef}
              value={localDetails}
              onChange={(e) => handleDetailsUpdate(e.target.value)}
              placeholder="Add details about this task..."
              className="w-full text-sm text-gray-700 bg-transparent border-none focus:outline-none resize-none min-h-[60px]"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Bottom Bar: Project Selector + Owner Indicators + Voice */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2">
        {/* Project Selector - Popover */}
        <div className="flex-1 min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="text-sm text-gray-600 font-medium truncate hover:text-gray-900 transition-colors text-left w-full"
                title={
                  task.projectId
                    ? projects.find((p) => p.id === task.projectId)?.name || "Unknown Project"
                    : "Add this task to a project"
                }
              >
                {task.projectId
                  ? projects.find((p) => p.id === task.projectId)?.name || "Unknown Project"
                  : "+ Add to project"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="space-y-1">
                <button
                  onClick={() => handleProjectChange(null)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors ${
                    !task.projectId ? "bg-gray-100 font-medium" : ""
                  }`}
                >
                  No Project
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectChange(project.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors ${
                      task.projectId === project.id ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Owner + Voice Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Owner Toggle - User or AI */}
          <button
            onClick={() => handleOwnerChange(owner === "user" ? "ai" : "user")}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              owner === "ai" ? "bg-teal-400 text-teal-900" : "bg-white/60 text-gray-700"
            }`}
            title={owner === "ai" ? "Assigned to AI" : "Assigned to me"}
          >
            {owner === "ai" ? (
              <Bot className="w-5 h-5" />
            ) : profile?.avatarUrl ? (
              <span className="relative block w-full h-full rounded-full overflow-hidden">
                <Image
                  src={profile.avatarUrl}
                  alt="User avatar"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>

          {/* Voice Input for NLP */}
          <button
            onClick={() => onVoiceInput?.(task.id)}
            className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center hover:bg-white/80 transition-colors"
            title="Voice input"
          >
            <Mic className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}