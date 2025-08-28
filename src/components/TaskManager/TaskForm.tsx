import { useState, useEffect } from "react";
import { TaskFormData, TASK_CATEGORIES } from "./types";
import { Task, Workspace, Project } from "@/hooks/use-tasks-enhanced";
import { useTaskAI } from "@/hooks/useTaskAI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceCreateDialog } from "./WorkspaceCreateDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Bot, Loader2, Plus } from "lucide-react";

interface TaskFormProps {
  isOpen: boolean;
  task?: Task | undefined;
  workspaces: Workspace[];
  projects: Project[];
  onSave: (taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskForm({
  isOpen,
  task,
  workspaces,
  projects,
  onSave,
  onCancel,
  isLoading = false,
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    dueDate: "",
    category: "",
    workspaceId: "",
    projectId: "",
    priority: "medium",
  });
  const [useAI, setUseAI] = useState(true);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  const { categorizeTask, isAnalyzing, categorization, reset: resetAI } = useTaskAI();

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title,
          description: task.description || "",
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
          category: task.category || "",
          workspaceId: task.workspaceId || "",
          projectId: task.projectId || "none",
          priority: task.priority || "medium",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          dueDate: "",
          category: "",
          workspaceId: workspaces.find((w) => w.isDefault)?.id || workspaces[0]?.id || "",
          projectId: "none",
          priority: "medium",
        });
      }
      setErrors({});
      setShowAISuggestion(false);
      resetAI();
    }
  }, [isOpen, task, resetAI, workspaces]);

  // Handle AI categorization when title/description changes
  useEffect(() => {
    if (useAI && formData.title.trim() && !task) {
      const debounceTimer = setTimeout(() => {
        categorizeTask({
          title: formData.title,
          description: formData.description,
        });
      }, 1000);

      return () => {
        clearTimeout(debounceTimer);
      };
    }
    return undefined;
  }, [formData.title, formData.description, useAI, task, categorizeTask]);

  // Show AI suggestion when categorization completes
  useEffect(() => {
    if (categorization && !formData.category) {
      setShowAISuggestion(true);
    }
  }, [categorization, formData.category]);

  const handleInputChange = (field: keyof TaskFormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData["title"].trim()) {
      newErrors["title"] = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      category: formData.category || "",
      completed: task?.completed || false,
      aiSuggestedCategory: categorization?.category || null,
      status: task?.status || "todo",
      priority: formData.priority || "medium",
      color: task?.color || "#8B5CF6",
      workspaceId:
        formData.workspaceId ||
        workspaces.find((w) => w.isDefault)?.id ||
        workspaces[0]?.id ||
        "default-workspace",
      projectId: formData.projectId === "none" ? null : formData.projectId || null,
      assignee: task?.assignee || "user",
      source: task?.source || "user",
      approvalStatus: task?.approvalStatus || "approved",
      taggedContacts: task?.taggedContacts || null,
      parentTaskId: task?.parentTaskId || null,
      completedAt: task?.completedAt || null,
      estimatedMinutes: task?.estimatedMinutes || null,
      actualMinutes: task?.actualMinutes || null,
      aiContext: task?.aiContext || null,
    };

    onSave(taskData);
  };

  const acceptAISuggestion = () => {
    if (categorization) {
      setFormData((prev) => ({ ...prev, category: categorization.category }));
      setShowAISuggestion(false);
    }
  };

  const rejectAISuggestion = () => {
    setShowAISuggestion(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="text-form-title">
              {task ? "Edit Task" : "Create New Task"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel} data-testid="button-close-form">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                required
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                data-testid="input-task-title"
              />
              {errors["title"] && (
                <p className="text-destructive text-sm" data-testid="error-title">
                  {errors["title"]}
                </p>
              )}
            </div>

            {/* Workspace Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="workspace">Workspace</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWorkspaceDialogOpen(true)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </div>
              <Select
                value={formData.workspaceId}
                onValueChange={(value) => handleInputChange("workspaceId", value)}
              >
                <SelectTrigger data-testid="select-workspace">
                  <SelectValue placeholder="Select workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: workspace.color }}
                        />
                        {workspace.name}
                        {workspace.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Field */}
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => handleInputChange("projectId", value)}
              >
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="No project selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects
                    .filter((project) => project.workspaceId === formData.workspaceId)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Add task description..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="resize-none"
                data-testid="textarea-task-description"
              />
            </div>

            {/* Due Date Field */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                data-testid="input-due-date"
              />
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger data-testid="select-task-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Field */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
              >
                <SelectTrigger data-testid="select-task-priority">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Categorization Toggle */}
            {!task && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">AI-Powered Categorization</h4>
                    <p className="text-sm text-blue-700">
                      Let AI suggest the best category based on your task details
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={useAI}
                      onCheckedChange={setUseAI}
                      data-testid="checkbox-use-ai"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI Processing State */}
            {isAnalyzing && (
              <div
                className="rounded-lg border border-blue-200 bg-blue-50 p-4"
                data-testid="ai-processing-state"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium text-blue-800">AI is analyzing your task...</span>
                </div>
              </div>
            )}

            {/* AI Suggestion */}
            {showAISuggestion && categorization && (
              <div
                className="rounded-lg border border-blue-200 bg-blue-50 p-4"
                data-testid="ai-suggestion"
              >
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      AI suggests categorizing this as{" "}
                      <strong>
                        "
                        {TASK_CATEGORIES.find((cat) => cat.value === categorization.category)
                          ?.label || categorization.category}
                        "
                      </strong>
                      {categorization.confidence && (
                        <Badge variant="secondary" className="ml-2">
                          {Math.round(categorization.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={acceptAISuggestion}
                        data-testid="button-accept-ai-suggestion"
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={rejectAISuggestion}
                        data-testid="button-reject-ai-suggestion"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                data-testid="button-cancel-form"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
                data-testid="button-submit-form"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <WorkspaceCreateDialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen} />
    </div>
  );
}
