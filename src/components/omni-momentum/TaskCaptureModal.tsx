"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Sparkles, Plus } from "lucide-react";
import { TaskCaptureInput } from "./TaskCaptureInput";
import { TaskEnhancementPreview } from "./TaskEnhancementPreview";
import { CategorySuggestions } from "./CategorySuggestions";
import { useTaskEnhancements } from "@/hooks/use-task-enhancements";
import type { TaskEnhancementResponse } from "@/server/ai/task-enhancement";

interface TaskCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData) => Promise<void>;
  workspaces: Array<{ id: string; name: string; }>;
  projects: Array<{ id: string; name: string; workspaceId: string; }>;
  existingTags: string[];
}

interface TaskFormData {
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  priority: string;
  estimatedMinutes?: number;
  taggedContacts?: string[];
  dueDate?: Date;
  aiContext?: unknown;
}

type ModalStep = "capture" | "enhance" | "form";

export function TaskCaptureModal({
  isOpen,
  onClose,
  onSave,
  workspaces,
  projects,
  existingTags,
}: TaskCaptureModalProps) {
  const [step, setStep] = useState<ModalStep>("capture");
  const [originalTitle, setOriginalTitle] = useState("");
  const [enhancement, setEnhancement] = useState<TaskEnhancementResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<TaskFormData>({
    workspaceId: workspaces[0]?.id || "",
    title: "",
    priority: "medium",
    estimatedMinutes: 30,
  });

  const { enhanceTask, shouldUseAIEnhancement } = useTaskEnhancements();

  const handleTaskCapture = async (taskData: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    estimatedMinutes?: number;
    suggestedTags?: string[];
  }) => {
    setOriginalTitle(taskData.title);
    setIsProcessing(true);

    try {
      if (shouldUseAIEnhancement(taskData.title)) {
        const enhancementResult = await enhanceTask({
          title: taskData.title,
          userContext: {
            existingTags,
            businessPriorities: ["client-care", "wellness", "growth"],
          }
        });

        setEnhancement(enhancementResult);
        setFormData({
          ...formData,
          title: enhancementResult.enhancedTitle,
          description: enhancementResult.description,
          priority: enhancementResult.priority,
          estimatedMinutes: enhancementResult.estimatedMinutes,
          aiContext: enhancementResult,
        });
        setStep("enhance");
      } else {
        setFormData({
          ...formData,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || "medium",
          estimatedMinutes: taskData.estimatedMinutes || 30,
        });
        setStep("form");
      }
    } catch (error) {
      // Fallback to form with basic data
      setFormData({
        ...formData,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || "medium",
        estimatedMinutes: taskData.estimatedMinutes || 30,
      });
      setStep("form");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptEnhancement = () => {
    setStep("form");
  };

  const handleRejectEnhancement = () => {
    setFormData({
      ...formData,
      title: originalTitle,
      description: "",
      priority: "medium",
      estimatedMinutes: 30,
      aiContext: undefined,
    });
    setEnhancement(null);
    setStep("form");
  };

  const handleEditEnhancement = () => {
    setStep("form");
  };

  const handleSaveTask = async () => {
    setIsProcessing(true);
    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("capture");
    setOriginalTitle("");
    setEnhancement(null);
    setFormData({
      workspaceId: workspaces[0]?.id || "",
      title: "",
      priority: "medium",
      estimatedMinutes: 30,
    });
    onClose();
  };

  const getDialogTitle = () => {
    switch (step) {
      case "capture": return "Quick Task Capture";
      case "enhance": return "AI Enhancement";
      case "form": return "Task Details";
      default: return "Create Task";
    }
  };

  const getDialogDescription = () => {
    switch (step) {
      case "capture": return "Describe what needs to be done and let AI enhance it";
      case "enhance": return "Review AI suggestions and enhancements";
      case "form": return "Add final details and create your task";
      default: return "";
    }
  };

  const workspaceProjects = projects.filter(p => p.workspaceId === formData.workspaceId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getDialogTitle()}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`flex items-center gap-1 ${step === "capture" ? "text-primary" : ""}`}>
              1. Capture
            </div>
            <div className="h-px w-4 bg-border" />
            <div className={`flex items-center gap-1 ${step === "enhance" ? "text-primary" : ""}`}>
              2. Enhance
            </div>
            <div className="h-px w-4 bg-border" />
            <div className={`flex items-center gap-1 ${step === "form" ? "text-primary" : ""}`}>
              3. Details
            </div>
          </div>

          {/* Capture Step */}
          {step === "capture" && (
            <TaskCaptureInput
              onTaskCreate={handleTaskCapture}
              placeholder="What do you need to accomplish?"
              showEnhancement={true}
              autoFocus={true}
              size="lg"
            />
          )}

          {/* Enhancement Step */}
          {step === "enhance" && enhancement && (
            <TaskEnhancementPreview
              enhancement={enhancement}
              originalTitle={originalTitle}
              onAccept={handleAcceptEnhancement}
              onEdit={handleEditEnhancement}
              onReject={handleRejectEnhancement}
              isLoading={isProcessing}
            />
          )}

          {/* Form Step */}
          {step === "form" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workspace">Workspace</Label>
                  <Select
                    value={formData.workspaceId}
                    onValueChange={(value) => setFormData({ ...formData, workspaceId: value, projectId: undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {workspaceProjects.length > 0 && (
                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <Select
                      value={formData.projectId || ""}
                      onValueChange={(value) => setFormData({ ...formData, projectId: value || undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {workspaceProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this task..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
                  <Input
                    id="estimatedMinutes"
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={formData.estimatedMinutes || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      estimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="30"
                  />
                </div>
              </div>

              {enhancement && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                    <Sparkles className="h-4 w-4" />
                    AI Enhanced Task
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enhancement.suggestedTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTask} 
                  disabled={!formData.title.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Task
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}