"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContactAIInsightsDialogProps } from "./types";
import { Loader2 } from "lucide-react";

export function ContactAIInsightsDialog({
  open,
  onOpenChange,
  insights,
  isLoading,
  contactName,
}: ContactAIInsightsDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI Insights for {contactName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generating insights...</span>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {insights.insights && insights.insights.length > 0 && (
              <div>
                <h4 className="font-medium">AI Insights</h4>
                <div className="space-y-2">
                  {insights.insights.map((insight, i) => (
                    <div key={i} className="border rounded p-2">
                      <div className="font-medium text-sm">{insight.type}</div>
                      <div className="text-sm text-muted-foreground">{insight.content}</div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(insight.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.summary && (
              <div>
                <h4 className="font-medium">Summary</h4>
                <p className="text-sm text-muted-foreground">{insights.summary}</p>
              </div>
            )}

            {insights.recommendations && insights.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium">Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {insights.recommendations.map((recommendation, i) => (
                    <li key={i}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
