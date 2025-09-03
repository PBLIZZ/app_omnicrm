"use client";

import { RefreshCw, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface OmniConnectRecentEmailsProps {
  recentEmails: EmailPreview[];
  isLoadingEmails: boolean;
}

export function OmniConnectRecentEmails({
  recentEmails,
  isLoadingEmails,
}: OmniConnectRecentEmailsProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Emails</CardTitle>
        <CardDescription>
          Your most recent email communications with business intelligence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoadingEmails ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 opacity-50 animate-spin" />
              <p className="text-sm">Loading recent emails...</p>
            </div>
          ) : recentEmails.length > 0 ? (
            recentEmails.map((email, index) => (
              <div key={email.id || index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{email.from}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        const date = new Date(email.date);
                        return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d");
                      } catch {
                        return "Invalid date";
                      }
                    })()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Recent emails will appear here after syncing</p>
              <p className="text-xs">
                Use the "Sync Now" button to start importing your emails
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
