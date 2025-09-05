"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Clock, Loader2, CheckCircle } from "lucide-react";
import { ContactTaskSuggestion, useCreateTaskFromSuggestion } from "@/hooks/use-contact-ai-actions";

interface ContactTaskSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: ContactTaskSuggestion[] | null;
  isLoading: boolean;
  contactId: string;
  contactName?: string;
}

export function ContactTaskSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  isLoading,
  contactId,
  contactName,
}: ContactTaskSuggestionsDialogProps): JSX.Element {
  const [createdTasks, setCreatedTasks] = useState<Set<number>>(new Set());
  const createTaskMutation = useCreateTaskFromSuggestion();

  const handleCreateTask = async (
    suggestion: ContactTaskSuggestion,
    index: number,
  ): Promise<void> => {
    try {
      await createTaskMutation.mutateAsync({
        contactId,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        estimatedMinutes: suggestion.estimatedMinutes,
      });
      setCreatedTasks((prev) => new Set(prev).add(index));
    } catch {
      // Error is handled by the mutation
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "follow-up":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "outreach":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "service":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300";
      case "admin":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatEstimatedTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-600" />
            <DialogTitle>AI Task Suggestions</DialogTitle>
          </div>
          <DialogDescription>
            {contactName && `AI-generated task suggestions for ${contactName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating task suggestions...
            </span>
          </div>
        )}

        {suggestions && !isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Here are AI-generated task suggestions to improve the relationship with this contact.
              Click &quot;Create Task&quot; to add any suggestion to your task list.
            </p>

            <Separator />

            <div className="space-y-4">
              {suggestions.map((suggestion, index) => {
                const isCreated = createdTasks.has(index);
                const isCreating = createTaskMutation.isPending;

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {suggestion.description}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority} priority
                          </Badge>
                          <Badge className={`text-xs ${getCategoryColor(suggestion.category)}`}>
                            {suggestion.category}
                          </Badge>
                          {suggestion.estimatedMinutes > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatEstimatedTime(suggestion.estimatedMinutes)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isCreated ? (
                          <Button variant="outline" size="sm" disabled className="text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Created
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateTask(suggestion, index)}
                            disabled={isCreating}
                          >
                            {isCreating ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-1" />
                            )}
                            Create Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {suggestions.length === 0 && (
              <div className="text-center py-8">
                <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No task suggestions available for this contact.
                </p>
              </div>
            )}
          </div>
        )}

        {!suggestions && !isLoading && (
          <div className="text-center py-8">
            <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No task suggestions available. Try generating suggestions for this contact.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
