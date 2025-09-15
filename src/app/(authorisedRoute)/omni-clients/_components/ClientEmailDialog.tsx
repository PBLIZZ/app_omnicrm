"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClientEmailDialogProps } from "./types";
import { Loader2 } from "lucide-react";

export function ClientEmailDialog({
  open,
  onOpenChange,
  emailSuggestion,
  isLoading,
  clientName,
  clientEmail,
}: ClientEmailDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Email Suggestion for {clientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generating email suggestion...</span>
          </div>
        ) : emailSuggestion ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">To:</label>
              <p className="text-sm text-muted-foreground">{clientEmail}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Subject:</label>
              <p className="text-sm">{emailSuggestion.subject}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Content:</label>
              <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                {emailSuggestion.content}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">Tone: {emailSuggestion.tone}</div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
