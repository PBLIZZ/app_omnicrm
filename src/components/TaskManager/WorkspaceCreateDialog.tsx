"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Sparkles, Palette } from "lucide-react";
import {
  useWorkspacesEnhanced,
  CreateWorkspaceData,
  PREDEFINED_WORKSPACES,
} from "@/hooks/use-workspaces-enhanced";

interface WorkspaceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_OPTIONS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Pink", value: "#ec4899" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
  { name: "Teal", value: "#14b8a6" },
];

export function WorkspaceCreateDialog({
  open,
  onOpenChange,
}: WorkspaceCreateDialogProps): JSX.Element {
  const {
    availablePredefinedWorkspaces,
    createWorkspace,
    createPredefinedWorkspace,
    isCreatingWorkspace,
  } = useWorkspacesEnhanced();

  const [customWorkspace, setCustomWorkspace] = useState<CreateWorkspaceData>({
    name: "",
    description: "",
    color: "#6366f1",
    isDefault: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateCustomWorkspace = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!customWorkspace.name.trim()) {
      newErrors["name"] = "Workspace name is required";
    } else if (customWorkspace.name.trim().length < 2) {
      newErrors["name"] = "Workspace name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCustomWorkspace = async () => {
    if (!validateCustomWorkspace()) {
      return;
    }

    try {
      await createWorkspace(customWorkspace);
      onOpenChange(false);
      // Reset form
      setCustomWorkspace({
        name: "",
        description: "",
        color: "#6366f1",
        isDefault: false,
      });
      setErrors({});
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const handleCreatePredefined = async (predefined: (typeof PREDEFINED_WORKSPACES)[0]) => {
    try {
      await createPredefinedWorkspace(predefined);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create predefined workspace:", error);
    }
  };

  const handleInputChange = (field: keyof CreateWorkspaceData, value: string) => {
    setCustomWorkspace((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a custom workspace or choose from our predefined templates to organize your work.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="predefined" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predefined" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predefined" className="space-y-4 mt-6">
            <div className="space-y-3">
              <h3 className="font-medium text-lg">Choose a Template</h3>
              <p className="text-sm text-muted-foreground">
                Select from our wellness-focused workspace templates designed for different types of
                work.
              </p>

              {availablePredefinedWorkspaces.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-4xl mb-2">✨</div>
                      <p className="text-muted-foreground">
                        All predefined workspaces have been created!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Switch to the "Custom" tab to create a personalized workspace.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {availablePredefinedWorkspaces.map((workspace) => (
                    <Card
                      key={workspace.name}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                      onClick={() => handleCreatePredefined(workspace)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{workspace.icon}</div>
                            <div>
                              <CardTitle className="text-base">{workspace.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {workspace.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: workspace.color }}
                            />
                            <Badge variant="outline" className="text-xs">
                              {workspace.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Custom Workspace</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Name *</Label>
                  <Input
                    id="workspace-name"
                    placeholder="Enter workspace name..."
                    value={customWorkspace.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={errors["name"] ? "border-red-500" : ""}
                  />
                  {errors["name"] && <p className="text-sm text-red-500">{errors["name"]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspace-description">Description</Label>
                  <Textarea
                    id="workspace-description"
                    placeholder="Describe what you'll use this workspace for..."
                    value={customWorkspace.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          customWorkspace.color === color.value
                            ? "border-gray-800 scale-110"
                            : "border-gray-300 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleInputChange("color", color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {COLOR_OPTIONS.find((c) => c.value === customWorkspace.color)?.name}
                  </p>
                </div>

                <div className="pt-4">
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: customWorkspace.color }}
                        />
                        <div>
                          <p className="font-medium">
                            {customWorkspace.name || "Your Workspace Name"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customWorkspace.description ||
                              "Your workspace description will appear here"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <TabsContent value="custom" className="m-0">
            <Button
              onClick={handleCreateCustomWorkspace}
              disabled={!customWorkspace.name.trim() || isCreatingWorkspace}
            >
              {isCreatingWorkspace && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workspace
            </Button>
          </TabsContent>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
