import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Clock,
  Tag as TagIcon,
  FolderOpen,
  Target,
  Loader2,
  Check,
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, startOfDay } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/hooks/use-tasks-enhanced";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">) => void;
  workspaces: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; workspaceId: string }>;
  existingTags?: string[];
}

interface TaskEnhancement {
  enhancedTitle: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  suggestedTags: string[];
  estimatedMinutes: number;
  suggestedProject?: { id: string; name: string; confidence: number };
  suggestedWorkspace?: { id: string; name: string; confidence: number };
  aiInsights: {
    reasoning: string;
    businessAlignment: string;
    urgencyFactors: string[];
    suggestions: string[];
  };
  subtasks?: Array<{ title: string; estimatedMinutes: number }>;
  confidenceLevel: number;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date | null;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  workspaceId: string;
  projectId: string;
  tags: string[];
  subtasks: Array<{ title: string; completed: boolean; estimatedMinutes?: number }>;
  estimatedMinutes: number;
}

const QUICK_DATE_OPTIONS = [
  { label: "Today", value: () => startOfDay(new Date()) },
  { label: "Tomorrow", value: () => startOfDay(addDays(new Date(), 1)) },
  { label: "This Week", value: () => startOfDay(addDays(new Date(), 7)) },
  { label: "This Month", value: () => startOfDay(addMonths(new Date(), 1)) },
  { label: "Someday", value: () => null },
];

export function TaskCreateModal({
  isOpen,
  onClose,
  onSave,
  workspaces,
  projects,
  existingTags = [],
}: TaskCreateModalProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    dueDate: addWeeks(new Date(), 1), // Default to one week from now
    priority: "medium",
    category: "administrative",
    workspaceId: workspaces[0]?.id || "",
    projectId: "",
    tags: [],
    subtasks: [],
    estimatedMinutes: 60,
  });

  // UI state
  const [step, setStep] = useState<"title" | "when" | "details">("title");
  const [showAIDetails, setShowAIDetails] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    project: false,
    tags: false,
    subtasks: false,
    notes: false,
  });
  const [newTag, setNewTag] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [aiEnhancement, setAiEnhancement] = useState<TaskEnhancement | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // AI Enhancement mutation
  const enhanceTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const userContext = {
        existingProjects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          workspaceId: p.workspaceId,
        })),
        existingTags,
        workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
      };

      return apiRequest("/api/tasks/enhance", {
        method: "POST",
        body: JSON.stringify({
          action: "enhance",
          title,
          dueDate: formData.dueDate,
          userContext,
        }),
      });
    },
    onSuccess: (data) => {
      // Check if the response is an error
      if (data && typeof data === "object" && "error" in data) {
        toast({
          title: "AI Enhancement Failed",
          description: "API error occurred. Continuing with manual task creation.",
          variant: "destructive",
        });
        return;
      }

      const enhancement = data.enhancement as TaskEnhancement;

      // Validate that we have a proper enhancement object
      if (!enhancement || typeof enhancement !== "object" || !enhancement.enhancedTitle) {
        toast({
          title: "AI Enhancement Failed",
          description: "Invalid response received. Continuing with manual task creation.",
          variant: "destructive",
        });
        return;
      }

      setAiEnhancement(enhancement);

      // Auto-apply high-confidence suggestions
      if (enhancement.confidenceLevel > 80) {
        setFormData((prev) => ({
          ...prev,
          title: enhancement.enhancedTitle,
          description: enhancement.description,
          priority: enhancement.priority,
          category: enhancement.category,
          tags: [...prev.tags, ...enhancement.suggestedTags],
          estimatedMinutes: enhancement.estimatedMinutes,
          ...(enhancement.suggestedProject && {
            projectId: enhancement.suggestedProject.id,
          }),
          ...(enhancement.suggestedWorkspace && {
            workspaceId: enhancement.suggestedWorkspace.id,
          }),
          ...(enhancement.subtasks && {
            subtasks: enhancement.subtasks.map((st) => ({
              title: st.title,
              completed: false,
              estimatedMinutes: st.estimatedMinutes,
            })),
          }),
        }));
        setShowAIDetails(true);
      }
    },
    onError: (error) => {
      toast({
        title: "AI Enhancement Failed",
        description: "Continuing with manual task creation",
        variant: "destructive",
      });
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        dueDate: addWeeks(new Date(), 1),
        priority: "medium",
        category: "administrative",
        workspaceId: workspaces[0]?.id || "",
        projectId: "",
        tags: [],
        subtasks: [],
        estimatedMinutes: 60,
      });
      setStep("title");
      setShowAIDetails(false);
      setAiEnhancement(null);
      setIsCompleted(false);
      setExpandedSections({
        project: false,
        tags: false,
        subtasks: false,
        notes: false,
      });

      // Focus the input after a short delay to ensure DOM is ready
      setTimeout(() => {
        const input = document.querySelector(
          '[data-testid="task-title-input"]',
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }, [isOpen, workspaces]);

  const handleNext = () => {
    if (step === "title" && formData.title.trim()) {
      setStep("when");
    } else if (step === "when") {
      setStep("details");
    }
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("when");
    } else if (step === "when") {
      setStep("title");
    }
  };

  const handleAIEnhance = () => {
    if (formData.title.trim()) {
      enhanceTaskMutation.mutate(formData.title);
    }
  };

  const handleQuickDate = (dateGetter: () => Date | null) => {
    const date = dateGetter();
    setFormData((prev) => ({ ...prev, dueDate: date }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setFormData((prev) => ({
        ...prev,
        subtasks: [
          ...prev.subtasks,
          {
            title: newSubtask.trim(),
            completed: false,
            estimatedMinutes: 30,
          },
        ],
      }));
      setNewSubtask("");
    }
  };

  const removeSubtask = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index),
    }));
  };

  const toggleSubtask = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) =>
        i === index ? { ...subtask, completed: !subtask.completed } : subtask,
      ),
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    // Prepare aiContext with enhancement data
    const aiContext = aiEnhancement
      ? {
          category: formData.category,
          tags: formData.tags,
          insights: aiEnhancement.aiInsights.reasoning,
          businessAlignment: aiEnhancement.aiInsights.businessAlignment,
          suggestions: aiEnhancement.aiInsights.suggestions,
          subtasks: formData.subtasks,
          confidenceLevel: aiEnhancement.confidenceLevel,
        }
      : {
          category: formData.category,
          tags: formData.tags,
          subtasks: formData.subtasks,
        };

    const taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt"> = {
      workspaceId: formData.workspaceId,
      projectId: formData.projectId || null,
      parentTaskId: null,
      title: formData.title,
      description: formData.description || null,
      status: isCompleted ? "done" : "todo",
      priority: formData.priority,
      assignee: "user",
      source: aiEnhancement ? "ai_enhanced" : "user",
      approvalStatus: "approved",
      taggedContacts: null,
      dueDate: formData.dueDate,
      completedAt: isCompleted ? new Date() : null,
      estimatedMinutes: formData.estimatedMinutes,
      actualMinutes: null,
      aiContext,
      // Computed properties
      completed: isCompleted,
      category: formData.category,
      aiSuggestedCategory: aiEnhancement?.category || null,
      color: "#8B5CF6",
    };

    onSave(taskData);
    onClose();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const selectedWorkspace = workspaces.find((w) => w.id === formData.workspaceId);
  const availableProjects = projects.filter((p) => p.workspaceId === formData.workspaceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "title" && "What is your task?"}
            {step === "when" && "When do you want to have this completed?"}
            {step === "details" && "Task Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "title" && "Enter a brief description of what you need to accomplish"}
            {step === "when" && "Choose when you'd like to complete this task"}
            {step === "details" && "Configure task details and let AI help enhance your task"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Task Title */}
          {step === "title" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    setIsCompleted(checked === "indeterminate" ? false : checked)
                  }
                  className="mt-2"
                />
                <div className="flex-1">
                  <Input
                    placeholder="e.g., Segment clients for email newsletter"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, title: e.target.value }));
                    }}
                    className="text-lg font-medium"
                    autoFocus
                    data-testid="task-title-input"
                  />
                </div>
              </div>

              {formData.title.trim() && (
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleAIEnhance}
                    disabled={enhanceTaskMutation.isPending}
                    className="text-sm"
                  >
                    {enhanceTaskMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    AI Autocomplete Task Details
                  </Button>

                  <Button onClick={handleNext} disabled={!formData.title.trim()}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Due Date Selection */}
          {step === "when" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {QUICK_DATE_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    variant={
                      (option.value() === null && formData.dueDate === null) ||
                      (option.value() !== null &&
                        formData.dueDate !== null &&
                        option.value()!.getTime() === formData.dueDate.getTime())
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleQuickDate(option.value)}
                    className="h-12"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="text-center">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate || undefined}
                      onSelect={(date) => {
                        setFormData((prev) => ({ ...prev, dueDate: date || null }));
                        setShowCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 3: Task Details */}
          {step === "details" && (
            <div className="space-y-4">
              {/* Task Title and Completion */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    setIsCompleted(checked === "indeterminate" ? false : checked)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="font-medium border-0 shadow-none px-3 py-1 bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "No due date"}
                    {selectedWorkspace && ` • ${selectedWorkspace.name}`}
                  </div>
                </div>
              </div>

              {/* AI Enhancement Display */}
              {aiEnhancement && showAIDetails && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">AI Enhanced</span>
                    <Badge variant="secondary">{aiEnhancement.confidenceLevel}% confidence</Badge>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">{aiEnhancement.aiInsights.reasoning}</p>
                  {aiEnhancement.aiInsights.suggestions.length > 0 && (
                    <div className="text-sm text-blue-700">
                      <strong>Suggestions:</strong>{" "}
                      {aiEnhancement.aiInsights.suggestions.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {/* Notes Section */}
              <Collapsible
                open={expandedSections.notes}
                onOpenChange={() => toggleSection("notes")}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                    {expandedSections.notes ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    Notes
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <Textarea
                    placeholder="Add notes or description..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="min-h-[80px]"
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Project Section */}
              <Collapsible
                open={expandedSections.project}
                onOpenChange={() => toggleSection("project")}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                    {expandedSections.project ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Project & Workspace
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  <div>
                    <label className="text-sm font-medium">Workspace</label>
                    <Select
                      value={formData.workspaceId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, workspaceId: value, projectId: "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <div>
                    <label className="text-sm font-medium">Project</label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, projectId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Inbox (no project)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Inbox (no project)</SelectItem>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Tags Section */}
              <Collapsible open={expandedSections.tags} onOpenChange={() => toggleSection("tags")}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                    {expandedSections.tags ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    <TagIcon className="mr-2 h-4 w-4" />
                    Tags
                    {formData.tags.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.tags.length}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                    />
                    <Button variant="outline" size="sm" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {existingTags
                      .filter((tag) => !formData.tags.includes(tag))
                      .map((tag) => (
                        <Button
                          key={tag}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
                          }
                        >
                          {tag}
                        </Button>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Subtasks Section */}
              <Collapsible
                open={expandedSections.subtasks}
                onOpenChange={() => toggleSection("subtasks")}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                    {expandedSections.subtasks ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    <Target className="mr-2 h-4 w-4" />
                    Subtasks
                    {formData.subtasks.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.subtasks.length}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  <div className="space-y-2">
                    {formData.subtasks.map((subtask, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => toggleSubtask(index)}
                        />
                        <span
                          className={`flex-1 text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {subtask.title}
                        </span>
                        {subtask.estimatedMinutes && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {subtask.estimatedMinutes}m
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubtask(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add subtask..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                    />
                    <Button variant="outline" size="sm" onClick={addSubtask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Priority and Time Estimate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
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
                  <label className="text-sm font-medium">Estimated Time (minutes)</label>
                  <Input
                    type="number"
                    value={formData.estimatedMinutes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedMinutes: parseInt(e.target.value) || 60,
                      }))
                    }
                    min="15"
                    step="15"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleSave} className="min-w-[100px]">
                  <Check className="mr-2 h-4 w-4" />
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
