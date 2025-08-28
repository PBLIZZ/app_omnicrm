"use client";

import { useState } from "react";
import { useProjectTemplates, ProjectTemplate } from "@/hooks/use-project-templates";
import { Workspace } from "@/hooks/use-tasks-enhanced";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckSquare, Sparkles, Loader2 } from "lucide-react";

interface ProjectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
}

export function ProjectTemplateDialog({
  open,
  onOpenChange,
  workspaces,
}: ProjectTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const { templates, createProjectFromTemplate, isCreating } = useProjectTemplates();

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.name);
    setDescription(template.description);
  };

  const handleCreateProject = () => {
    if (!selectedTemplate || !projectName.trim() || !workspaceId) {
      return;
    }

    createProjectFromTemplate({
      templateId: selectedTemplate.id,
      projectName: projectName.trim(),
      workspaceId,
      startDate: new Date(startDate),
      description: description.trim() || "",
    });

    // Reset form
    setSelectedTemplate(null);
    setProjectName("");
    setDescription("");
    setWorkspaceId("");
    onOpenChange(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "client_onboarding":
        return "👋";
      case "content_creation":
        return "✍️";
      case "program_delivery":
        return "🎯";
      case "business_development":
        return "📈";
      default:
        return "📋";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Create Project from Template
          </DialogTitle>
          <DialogDescription>
            Choose a template to quickly create a project with pre-configured tasks and timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Choose Template</Label>
              <p className="text-sm text-muted-foreground">
                Select a pre-built template that matches your project type
              </p>
            </div>

            <div className="space-y-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: template.color }}
                        />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(template.category)}</span>
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {template.estimatedDurationDays} days
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        {template.tasks.length} tasks
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(
                          template.tasks.reduce(
                            (sum, task) => sum + (task.estimatedMinutes || 0),
                            0,
                          ) / 60,
                        )}
                        h total
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Project Configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Project Details</Label>
              <p className="text-sm text-muted-foreground">Customize your project settings</p>
            </div>

            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace *</Label>
                  <Select value={workspaceId} onValueChange={setWorkspaceId}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Template Preview */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Template Tasks ({selectedTemplate.tasks.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTemplate.tasks.map((task, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="flex-1">{task.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          <span>Day {task.dueOffsetDays}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || !workspaceId || isCreating}
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreating ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a template to configure your project</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
