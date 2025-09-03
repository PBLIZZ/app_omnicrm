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
import { MessageSquare, Plus, Loader2, CheckCircle } from "lucide-react";
import { ContactNoteSuggestion, useCreateNoteFromSuggestion } from "@/hooks/use-contact-ai-actions";

interface ContactNoteSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: ContactNoteSuggestion[] | null;
  isLoading: boolean;
  contactId: string;
  contactName?: string;
}

export function ContactNoteSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  isLoading,
  contactId,
  contactName,
}: ContactNoteSuggestionsDialogProps) {
  const [createdNotes, setCreatedNotes] = useState<Set<number>>(new Set());
  const createNoteMutation = useCreateNoteFromSuggestion();

  const handleCreateNote = async (suggestion: ContactNoteSuggestion, index: number) => {
    try {
      await createNoteMutation.mutateAsync({
        contactId,
        content: suggestion.content,
      });
      setCreatedNotes((prev) => new Set(prev).add(index));
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "interaction":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "observation":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "follow-up":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "preference":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <DialogTitle>AI Note Suggestions</DialogTitle>
          </div>
          <DialogDescription>
            {contactName && `AI-generated note suggestions for ${contactName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating note suggestions...
            </span>
          </div>
        )}

        {suggestions && !isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Here are AI-generated note suggestions based on the contact history and patterns.
              Click Add Note to save any suggestion to their record.
            </p>

            <Separator />

            <div className="space-y-3">
              {suggestions.map((suggestion, index) => {
                const isCreated = createdNotes.has(index);
                const isCreating = createNoteMutation.isPending;

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{suggestion.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs ${getCategoryColor(suggestion.category)}`}>
                            {suggestion.category}
                          </Badge>
                          <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isCreated ? (
                          <Button variant="outline" size="sm" disabled className="text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Added
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateNote(suggestion, index)}
                            disabled={isCreating}
                          >
                            {isCreating ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-1" />
                            )}
                            Add Note
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
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No note suggestions available for this contact.
                </p>
              </div>
            )}
          </div>
        )}

        {!suggestions && !isLoading && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No note suggestions available. Try generating suggestions for this contact.
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
