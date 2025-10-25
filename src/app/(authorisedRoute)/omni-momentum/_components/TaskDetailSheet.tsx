"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  X,
  Tag as TagIcon,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useMomentum } from "@/hooks/use-momentum";
import { useTags } from "@/hooks/use-tags";
import { TagSelector } from "@/components/TagSelector";
import { TAG_CATEGORY_TEXT_COLORS, TAG_CATEGORY_BORDER_COLORS, type TagCategory } from "@/lib/tag-categories";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/server/db/business-schemas";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  duration?: string;
}

interface TaskDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  task?: Task;
}

/**
 * TaskDetailSheet - Full task editing interface using shadcn Sheet component
 *
 * Features:
 * - Create new tasks or edit existing tasks
 * - Set priority, zone, due date, estimated time
 * - Tag support (integrated with global tags system)
 * - Subtask management
 * - Project assignment
 */
export function TaskDetailSheet({
  isOpen,
  onClose,
  mode,
  task,
}: TaskDetailSheetProps): JSX.Element {
  const { createTask, updateTask, projects, tasks } = useMomentum();
  const { tags: availableTags, applyTagsToTask, createTag } = useTags();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Subtask state
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Extract subtasks from task details JSONB
  const subtasks = useMemo(() => {
    if (mode === "edit" && task) {
      const details =
        typeof task.details === "object" && task.details !== null
          ? (task.details as Record<string, unknown>)
          : {};
      return Array.isArray(details["subtasks"])
        ? (details["subtasks"] as Subtask[])
        : [];
    }
    return [];
  }, [mode, task]);

  // Reset form when task changes or sheet opens
  useEffect(() => {
    if (mode === "edit" && task) {
      setName(task.name);
      setDescription(
        (typeof task.details === "object" && task.details && "description" in task.details
          ? (task.details.description as string)
          : "") || "",
      );
      setPriority(task.priority);
      setProjectId(task.projectId);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);

      // Load tags from task details if they exist
      // Note: Task tags would need to be fetched separately via getTaskTags API
      // For now, we'll start with an empty array
      const details = task.details as { tags?: Tag[] } | null;
      const taskTags = details?.tags || [];
      setSelectedTags(taskTags);
    } else {
      // Reset form for create mode
      setName("");
      setDescription("");
      setPriority("medium");
      setProjectId(null);
      setDueDate(undefined);
      setSelectedTags([]);
    }
  }, [mode, task, isOpen]);

  const handleAddSubtask = () => {
    if (!newSubtaskName.trim() || !task) return;

    try {
      // Create new subtask object
      const newSubtask: Subtask = {
        id: crypto.randomUUID(),
        title: newSubtaskName.trim(),
        completed: false,
      };

      // Get existing task details
      const details =
        typeof task.details === "object" && task.details !== null
          ? (task.details as Record<string, unknown>)
          : {};

      // Add to existing subtasks array in details.subtasks
      const existingSubtasks = Array.isArray(details["subtasks"])
        ? (details["subtasks"] as Subtask[])
        : [];
      const updatedSubtasks = [...existingSubtasks, newSubtask];

      // Update the task with new subtasks array
      updateTask(task.id, {
        details: {
          ...details,
          subtasks: updatedSubtasks,
        },
      });

      setNewSubtaskName("");
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const taskData: CreateTaskInput | UpdateTaskInput = {
      name: name.trim(),
      priority,
      projectId: projectId ?? undefined,
      dueDate: dueDate ?? undefined,
      details: description ? { description } : undefined,
    };

    if (mode === "create") {
      createTask(taskData as CreateTaskInput);
      // Note: Tags for newly created tasks need to be applied after task creation
      // This would require createTask to return the task ID or use a callback
    } else if (task) {
      updateTask(task.id, taskData as UpdateTaskInput);
      // Update task tags
      if (selectedTags.length > 0) {
        applyTagsToTask({
          taskId: task.id,
          tagIds: selectedTags.map((t) => t.id),
        }).catch((error) => {
          console.error("Failed to apply tags:", error);
        });
      }
    }

    onClose();
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    const newTag = await createTag({
      name,
      color: "#3B82F6", // Default blue color
      category: "services_modalities",
    });
    return newTag as Tag;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Create New Task" : "Edit Task"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Add a new task to your workflow"
              : "Update task details and settings"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name *</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What needs to be done?"
              className="text-base"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={priority} onValueChange={(value: typeof priority) => setPriority(value)}>
              <SelectTrigger id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <Badge className="bg-green-100 text-green-800">Low</Badge>
                </SelectItem>
                <SelectItem value="medium">
                  <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                </SelectItem>
                <SelectItem value="high">
                  <Badge className="bg-orange-100 text-orange-800">High</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label htmlFor="task-project">Project (Optional)</Label>
            <Select
              value={projectId ?? "none"}
              onValueChange={(value) => setProjectId(value === "none" ? null : value)}
            >
              <SelectTrigger id="task-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Subtasks (only for edit mode) */}
          {mode === "edit" && task && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subtasks ({subtasks.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="h-8 px-2"
                >
                  {showSubtasks ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {showSubtasks && (
                <div className="space-y-3">
                  {/* Existing subtasks */}
                  {subtasks.length > 0 && (
                    <div className="space-y-2">
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 text-sm">{subtask.title}</div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              subtask.completed
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {subtask.completed ? "completed" : "pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new subtask */}
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      placeholder="Add a subtask..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddSubtask();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskName.trim()}
                      className="px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => {
                // Get text and border colors based on category
                const textColor = tag.category
                  ? TAG_CATEGORY_TEXT_COLORS[tag.category as TagCategory] || "#334155"
                  : "#334155";
                const borderColor = tag.category
                  ? TAG_CATEGORY_BORDER_COLORS[tag.category as TagCategory] || "#cbd5e1"
                  : "#cbd5e1";

                return (
                  <Badge
                    key={tag.id}
                    style={{
                      backgroundColor: tag.color,
                      color: textColor,
                      borderColor: borderColor,
                      borderWidth: "1px",
                      borderStyle: "solid"
                    }}
                    className="text-xs px-3 py-1"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag.name}
                    <button
                      onClick={() => setSelectedTags(selectedTags.filter((t) => t.id !== tag.id))}
                      className="ml-1.5 hover:opacity-80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTagSelector(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tags
            </Button>
          </div>

          {/* Tag Selector Dialog */}
          <TagSelector
            open={showTagSelector}
            onOpenChange={setShowTagSelector}
            selectedTags={selectedTags}
            availableTags={availableTags as Tag[]}
            onTagsChange={setSelectedTags}
            onCreateTag={handleCreateTag}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {mode === "create" ? "Create Task" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
