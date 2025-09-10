"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type ClientAIInsightsResponse } from "@/lib/validation/schemas/omniClients";
import { Loader2 } from "lucide-react";

interface ClientAIInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: ClientAIInsightsResponse | null;
  isLoading: boolean;
  clientName: string;
}

export function ClientAIInsightsDialog({
  open,
  onOpenChange,
  insights,
  isLoading,
  clientName,
}: ClientAIInsightsDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI Insights for {clientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generating insights...</span>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {insights.insights.wellnessGoals && (
              <div>
                <h4 className="font-medium">Wellness Goals</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {insights.insights.wellnessGoals.map((goal, i) => (
                    <li key={i}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.insights.nextSteps && (
              <div>
                <h4 className="font-medium">Next Steps</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {insights.insights.nextSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Confidence: {Math.round(insights.confidence * 100)}%
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
