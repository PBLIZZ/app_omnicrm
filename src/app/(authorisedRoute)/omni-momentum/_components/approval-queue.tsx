"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Check,
  X, 
  Bot,
  Clock,
  Flag,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Momentum } from "@/server/db/schema";

interface TaskActionRequestBody {
  notes?: string;
}

interface ApprovalQueueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingTasks: Momentum[];
}

interface TaskApprovalCardProps {
  task: Momentum;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onApprove: (taskId: string, notes?: string) => void;
  onReject: (taskId: string, notes?: string) => void;
}

function TaskApprovalCard({ 
  task, 
  isSelected, 
  onSelect, 
  onApprove, 
  onReject 
}: TaskApprovalCardProps): JSX.Element {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const getPriorityColor = (priority: string): string => {
    const colors = {
      low: "text-green-600 dark:text-green-400 border-l-green-500",
      medium: "text-blue-600 dark:text-blue-400 border-l-blue-500",
      high: "text-orange-600 dark:text-orange-400 border-l-orange-500", 
      urgent: "text-red-600 dark:text-red-400 border-l-red-500",
    } as const;
    
    if (priority in colors) {
      return colors[priority as keyof typeof colors];
    }
    return colors.medium;
  };

  const handleApprove = (): void => {
    onApprove(task.id, notes.trim() || undefined);
    setNotes("");
    setShowNotes(false);
  };

  const handleReject = (): void => {
    onReject(task.id, notes.trim() || undefined);
    setNotes("");
    setShowNotes(false);
  };

  return (
    <Card className={`border-l-4 ${getPriorityColor(task.priority)} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={onSelect}
              data-testid={`checkbox-task-${task.id}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium">
                  {task.title}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Flag className={`h-3 w-3 ${getPriorityColor(task.priority)}`} />
                  <span className="text-xs capitalize">{task.priority}</span>
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {task.description}
                </p>
              )}

              {task.aiContext != null && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-3 w-3 text-blue-500" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      AI Reasoning
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {((): string => {
                      if (typeof task.aiContext === 'string') {
                        return task.aiContext;
                      } else if (task.aiContext !== null && typeof task.aiContext === 'object') {
                        try {
                          return JSON.stringify(task.aiContext, null, 2);
                        } catch {
                          return 'Unable to display AI context';
                        }
                      }
                      return 'No AI context available';
                    })()}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.createdAt), "MMM dd, hh:mm a")}
                </div>
                {task.estimatedMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.estimatedMinutes}min
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {showNotes && (
          <div className="space-y-2 mb-4">
            <Label htmlFor={`notes-${task.id}`}>Notes (optional)</Label>
            <Textarea
              id={`notes-${task.id}`}
              placeholder="Add notes about your decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid={`textarea-notes-${task.id}`}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700"
            data-testid={`button-approve-${task.id}`}
          >
            <Check className="h-3 w-3 mr-1" />
            Approve
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            data-testid={`button-reject-${task.id}`}
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotes(!showNotes)}
            data-testid={`button-add-notes-${task.id}`}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {showNotes ? 'Hide Notes' : 'Add Notes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalQueue({ open, onOpenChange, pendingTasks }: ApprovalQueueProps): JSX.Element {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkNotes, setBulkNotes] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const body: TaskActionRequestBody = {};
      if (notes !== undefined) {
        body.notes = notes;
      }
      return fetchPost(`/api/omni-momentum/${taskId}/approve`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-momentum"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-momentum/pending-approval"] });
      toast({
        title: "Task Approved",
        description: "The task has been approved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error approving task:", error);
      toast({
        title: "Error",
        description: "Failed to approve task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const body: TaskActionRequestBody = {};
      if (notes !== undefined) {
        body.notes = notes;
      }
      return fetchPost(`/api/omni-momentum/${taskId}/reject`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-momentum"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-momentum/pending-approval"] });
      toast({
        title: "Task Rejected",
        description: "The task has been rejected.",
      });
    },
    onError: (error) => {
      console.error("Error rejecting task:", error);
      toast({
        title: "Error",
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (taskId: string, notes?: string): void => {
    approveMutation.mutate({ 
      taskId, 
      ...(notes ? { notes } : {})
    });
  };

  const handleReject = (taskId: string, notes?: string): void => {
    rejectMutation.mutate({ 
      taskId, 
      ...(notes ? { notes } : {})
    });
  };

  const handleBulkApprove = (): void => {
    const trimmedNotes = bulkNotes.trim();
    selectedTasks.forEach(taskId => {
      approveMutation.mutate({ 
        taskId, 
        ...(trimmedNotes ? { notes: trimmedNotes } : {})
      });
    });
    setSelectedTasks([]);
    setBulkNotes("");
  };

  const handleBulkReject = (): void => {
    const trimmedNotes = bulkNotes.trim();
    selectedTasks.forEach(taskId => {
      rejectMutation.mutate({ 
        taskId, 
        ...(trimmedNotes ? { notes: trimmedNotes } : {})
      });
    });
    setSelectedTasks([]);
    setBulkNotes("");
  };

  const toggleTaskSelection = (taskId: string, selected: boolean): void => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const toggleSelectAll = (): void => {
    if (selectedTasks.length === pendingTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(pendingTasks.map(t => t.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-approval-queue">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            AI Task Suggestions
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Review and approve AI-generated task suggestions. Your decisions help improve future suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending suggestions</h3>
              <p className="text-sm text-muted-foreground">
                All AI-generated tasks have been reviewed. New suggestions will appear here overnight.
              </p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedTasks.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} selected
                        </span>
                        <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                          {selectedTasks.length === pendingTasks.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleBulkApprove}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-bulk-approve"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve Selected
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkReject}
                          data-testid="button-bulk-reject"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject Selected
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bulk-notes">Bulk Notes (optional)</Label>
                      <Textarea
                        id="bulk-notes"
                        placeholder="Add notes for all selected tasks..."
                        value={bulkNotes}
                        onChange={(e) => setBulkNotes(e.target.value)}
                        rows={2}
                        data-testid="textarea-bulk-notes"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Individual Task Cards */}
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <TaskApprovalCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.includes(task.id)}
                    onSelect={(selected) => toggleTaskSelection(task.id, selected)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}