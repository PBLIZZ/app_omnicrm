"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientNoteSuggestionsDialogProps } from "./types";
import { Loader2 } from "lucide-react";

export function ClientNoteSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  isLoading,
  clientName,
}: ClientNoteSuggestionsDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Note Suggestions for {clientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generating note suggestions...</span>
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        suggestion.priority === "high"
                          ? "border-red-200 text-red-700"
                          : suggestion.priority === "medium"
                            ? "border-yellow-200 text-yellow-700"
                            : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {suggestion.priority}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{suggestion.content}</p>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement create note functionality
                  }}
                >
                  Use This Note
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No note suggestions available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
