"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Lightbulb, ArrowRight, Target, Loader2 } from 'lucide-react';
import { ContactAIInsightResponse } from '@/hooks/use-contact-ai-actions';

interface ContactAIInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: ContactAIInsightResponse | null;
  isLoading: boolean;
  contactName?: string;
}

export function ContactAIInsightsDialog({
  open,
  onOpenChange,
  insights,
  isLoading,
  contactName,
}: ContactAIInsightsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <DialogTitle>AI Insights</DialogTitle>
          </div>
          <DialogDescription>
            {contactName && `AI-generated insights and recommendations for ${contactName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analyzing contact data...
            </span>
          </div>
        )}

        {insights && !isLoading && (
          <div className="space-y-6">
            {/* Main Insights */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Key Insights
              </h3>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
                  {insights.insights}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Confidence: {Math.round(insights.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            {insights.keyFindings.length > 0 && (
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Key Findings
                </h3>
                <div className="grid gap-2">
                  {insights.keyFindings.map((finding, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {finding}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Suggestions */}
            {insights.suggestions.length > 0 && (
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {insights.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg"
                    >
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-yellow-900 dark:text-yellow-100">
                        {suggestion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {insights.nextSteps.length > 0 && (
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Recommended Next Steps
                </h3>
                <div className="space-y-2">
                  {insights.nextSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                    >
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm text-green-900 dark:text-green-100">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!insights && !isLoading && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No insights available. Try generating insights for this contact.
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