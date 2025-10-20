/**
 * Intelligent Processing Approval Component
 *
 * This component provides a UI for users to review and approve AI-generated
 * task breakdowns from the intelligent inbox processing.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Clock, Tag, Calendar } from "lucide-react";
import { toast } from "sonner";

interface IntelligentTask {
  id: string;
  name: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes: number | null;
  dueDate: string | null;
  zoneId: number | null;
  projectId: string | null;
  parentTaskId: string | null;
  tags: string[];
  confidence: number;
  reasoning: string;
}

interface IntelligentProject {
  id: string;
  name: string;
  description: string | null;
  zoneId: number | null;
  status: "active" | "on_hold" | "completed" | "archived";
  dueDate: string | null;
  confidence: number;
  reasoning: string;
}

interface TaskHierarchy {
  parentTaskId: string;
  subtaskIds: string[];
  relationshipType: "task_subtask" | "project_task";
  confidence: number;
}

interface ProcessingResult {
  extractedTasks: IntelligentTask[];
  suggestedProjects: IntelligentProject[];
  taskHierarchies: TaskHierarchy[];
  overallConfidence: number;
  processingNotes: string;
  requiresApproval: boolean;
}

interface InboxItem {
  id: string;
  rawText: string;
  createdAt: string;
  status: string;
}

interface ApprovalItem {
  inboxItem: InboxItem;
  processingResult: ProcessingResult;
}

interface ApprovedTask {
  taskId: string;
  approved: boolean;
  modifications: Record<string, string | number | null>;
}

interface ApprovedProject {
  projectId: string;
  approved: boolean;
  modifications: Record<string, string | number | null>;
}

interface ApprovedHierarchy extends TaskHierarchy {
  approved: boolean;
}

interface ItemApprovalData {
  approvedTasks: ApprovedTask[];
  approvedProjects: ApprovedProject[];
  approvedHierarchies: ApprovedHierarchy[];
}

interface IntelligentProcessingApprovalProps {
  items: ApprovalItem[];
  onApprovalComplete: () => void;
}

export function IntelligentProcessingApproval({
  items,
  onApprovalComplete,
}: IntelligentProcessingApprovalProps): JSX.Element {
  const [approvalData, setApprovalData] = useState<Record<string, ItemApprovalData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(items[0] || null);

  // Initialize approval data
  useEffect(() => {
    const initialData: Record<string, ItemApprovalData> = {};

    items.forEach((item) => {
      initialData[item.inboxItem.id] = {
        approvedTasks: item.processingResult.extractedTasks.map((task) => ({
          taskId: task.id,
          approved: true,
          modifications: {},
        })),
        approvedProjects: item.processingResult.suggestedProjects.map((project) => ({
          projectId: project.id,
          approved: true,
          modifications: {},
        })),
        approvedHierarchies: item.processingResult.taskHierarchies.map((hierarchy) => ({
          ...hierarchy,
          approved: true,
        })),
      };
    });

    setApprovalData(initialData);
  }, [items]);

  const handleTaskApprovalChange = (itemId: string, taskId: string, approved: boolean) => {
    setApprovalData((prev) => {
      const itemData = prev[itemId];
      if (!itemData) return prev;

      return {
        ...prev,
        [itemId]: {
          ...itemData,
          approvedTasks: itemData.approvedTasks.map((task) =>
            task.taskId === taskId ? { ...task, approved } : task,
          ),
        },
      };
    });
  };

  const handleProjectApprovalChange = (itemId: string, projectId: string, approved: boolean) => {
    setApprovalData((prev) => {
      const itemData = prev[itemId];
      if (!itemData) return prev;

      return {
        ...prev,
        [itemId]: {
          ...itemData,
          approvedProjects: itemData.approvedProjects.map((project) =>
            project.projectId === projectId ? { ...project, approved } : project,
          ),
        },
      };
    });
  };

  const handleTaskModification = (
    itemId: string,
    taskId: string,
    field: string,
    value: string | number | null,
  ) => {
    setApprovalData((prev) => {
      const itemData = prev[itemId];
      if (!itemData) return prev;

      return {
        ...prev,
        [itemId]: {
          ...itemData,
          approvedTasks: itemData.approvedTasks.map((task) =>
            task.taskId === taskId
              ? {
                  ...task,
                  modifications: {
                    ...task.modifications,
                    [field]: value,
                  },
                }
              : task,
          ),
        },
      };
    });
  };

  const handleProjectModification = (
    itemId: string,
    projectId: string,
    field: string,
    value: string | number | null,
  ) => {
    setApprovalData((prev) => {
      const itemData = prev[itemId];
      if (!itemData) return prev;

      return {
        ...prev,
        [itemId]: {
          ...itemData,
          approvedProjects: itemData.approvedProjects.map((project) =>
            project.projectId === projectId
              ? {
                  ...project,
                  modifications: {
                    ...project.modifications,
                    [field]: value,
                  },
                }
              : project,
          ),
        },
      };
    });
  };

  const handleApproval = async (itemId: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/omni-momentum/inbox/approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxItemId: itemId,
          ...approvalData[itemId],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process approval");
      }

      const result = await response.json();
      toast.success(result.processingSummary);
      onApprovalComplete();
    } catch (error) {
      toast.error("Failed to process approval");
      console.error("Approval error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (itemId: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/omni-momentum/inbox/approval", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inboxItemId: itemId }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject processing");
      }

      toast.success("Intelligent processing rejected, reverted to manual processing");
      onApprovalComplete();
    } catch (error) {
      toast.error("Failed to reject processing");
      console.error("Reject error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (items.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          No items pending approval. All intelligently processed items have been reviewed.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Intelligent Processing Approval</h2>
        <Badge variant="outline" className="text-sm">
          {items.length} item{items.length !== 1 ? "s" : ""} pending
        </Badge>
      </div>

      <Tabs
        value={selectedItem?.inboxItem.id || ""}
        onValueChange={(value) => {
          const item = items.find((i) => i.inboxItem.id === value);
          setSelectedItem(item || null);
        }}
      >
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TabsTrigger key={item.inboxItem.id} value={item.inboxItem.id}>
              <div className="text-left">
                <div className="font-medium truncate">
                  {item.inboxItem.rawText.substring(0, 30)}...
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.processingResult.extractedTasks.length} tasks,{" "}
                  {item.processingResult.suggestedProjects.length} projects
                </div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {items.map((item) => (
          <TabsContent key={item.inboxItem.id} value={item.inboxItem.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Original Input
                </CardTitle>
                <CardDescription>
                  Confidence:{" "}
                  <span className={getConfidenceColor(item.processingResult.overallConfidence)}>
                    {Math.round(item.processingResult.overallConfidence * 100)}%
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.inboxItem.rawText}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {item.processingResult.processingNotes}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Tasks ({item.processingResult.extractedTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.processingResult.extractedTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={
                            approvalData[item.inboxItem.id]?.approvedTasks?.find(
                              (t) => t.taskId === task.id,
                            )?.approved || false
                          }
                          onCheckedChange={(checked) =>
                            handleTaskApprovalChange(item.inboxItem.id, task.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={
                                (approvalData[item.inboxItem.id]?.approvedTasks?.find(
                                  (t) => t.taskId === task.id,
                                )?.modifications?.name as string | undefined) || task.name
                              }
                              onChange={(e) =>
                                handleTaskModification(
                                  item.inboxItem.id,
                                  task.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              className="font-medium"
                            />
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <Textarea
                            value={
                              (approvalData[item.inboxItem.id]?.approvedTasks?.find(
                                (t) => t.taskId === task.id,
                              )?.modifications?.description as string | undefined) ||
                              task.description ||
                              ""
                            }
                            onChange={(e) =>
                              handleTaskModification(
                                item.inboxItem.id,
                                task.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Task description..."
                            className="text-sm"
                            rows={2}
                          />
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {task.estimatedMinutes && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedMinutes}m
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                            {task.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {task.tags.join(", ")}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            AI Reasoning: {task.reasoning}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Projects */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Projects ({item.processingResult.suggestedProjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.processingResult.suggestedProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={
                            approvalData[item.inboxItem.id]?.approvedProjects?.find(
                              (p) => p.projectId === project.id,
                            )?.approved || false
                          }
                          onCheckedChange={(checked) =>
                            handleProjectApprovalChange(
                              item.inboxItem.id,
                              project.id,
                              checked as boolean,
                            )
                          }
                        />
                        <div className="flex-1 space-y-2">
                          <Input
                            value={
                              (approvalData[item.inboxItem.id]?.approvedProjects?.find(
                                (p) => p.projectId === project.id,
                              )?.modifications?.name as string | undefined) || project.name
                            }
                            onChange={(e) =>
                              handleProjectModification(
                                item.inboxItem.id,
                                project.id,
                                "name",
                                e.target.value,
                              )
                            }
                            className="font-medium"
                          />
                          <Textarea
                            value={
                              (approvalData[item.inboxItem.id]?.approvedProjects?.find(
                                (p) => p.projectId === project.id,
                              )?.modifications?.description as string | undefined) ||
                              project.description ||
                              ""
                            }
                            onChange={(e) =>
                              handleProjectModification(
                                item.inboxItem.id,
                                project.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Project description..."
                            className="text-sm"
                            rows={2}
                          />
                          <div className="text-xs text-muted-foreground">
                            AI Reasoning: {project.reasoning}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleReject(item.inboxItem.id)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject & Use Manual
              </Button>
              <Button onClick={() => handleApproval(item.inboxItem.id)} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve & Create
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
