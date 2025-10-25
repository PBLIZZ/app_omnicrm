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
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/server/db/business-schemas";

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

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);

  // Subtask state
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Memoize filtered subtasks to prevent infinite loops
  const filteredSubtasks = useMemo(() => {
    if (mode === "edit" && task && tasks) {
      return tasks.filter((t) => t.parentTaskId === task.id);
    }
    return [];
  }, [mode, task?.id, tasks]);

  // Use filteredSubtasks directly instead of storing in state
  const subtasks = filteredSubtasks;

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
      // TODO: Load tags from task_tags join table
      setTags([]);
    } else {
      // Reset form for create mode
      setName("");
      setDescription("");
      setPriority("medium");
      setProjectId(null);
      setDueDate(undefined);
      setTags([]);
    }
  }, [mode, task, isOpen]);

  const handleAddSubtask = async () => {
    if (!newSubtaskName.trim() || !task) return;

    try {
      await createTask({
        name: newSubtaskName.trim(),
        parentTaskId: task.id,
        priority: "medium",
        projectId: task.projectId,
      });
      setNewSubtaskName("");
    } catch (error) {
      console.error("Failed to create subtask:", error);
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
    } else if (task) {
      updateTask(task.id, taskData as UpdateTaskInput);
    }

    onClose();
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
                <SelectItem value="urgent">
                  <Badge className="bg-red-100 text-red-800">Urgent</Badge>
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
                          <div className="flex-1 text-sm">{subtask.name}</div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              subtask.status === "done"
                                ? "bg-green-100 text-green-800"
                                : subtask.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {subtask.status.replace("_", " ")}
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

          {/* Tags (TODO: Integrate with global tags system) */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">Tag integration coming soon</p>
          </div>
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
