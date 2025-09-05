import type { JSX } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { EmailPreview } from "./types";

interface GmailEmailPreviewProps {
  emails: EmailPreview[];
  isLoading: boolean;
  previewRange: { from: string; to: string } | null;
}

export function GmailEmailPreview({
  emails,
  isLoading,
  previewRange,
}: GmailEmailPreviewProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Emails</CardTitle>
        <CardDescription>
          {previewRange
            ? `Preview range: ${format(new Date(previewRange.from), "MMM d, yyyy")} - ${format(
                new Date(previewRange.to),
                "MMM d, yyyy",
              )}`
            : "Your most recent email communications"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 opacity-50 animate-spin" />
              <p className="text-sm">Loading recent emails...</p>
            </div>
          ) : emails.length > 0 ? (
            emails.map((email, index) => (
              <div key={email.id || index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-sm truncate">{email.subject}</p>
                      {email.hasAttachments && (
                        <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">{email.from}</p>
                      {Array.isArray(email.labels) && email.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {email.labels.slice(0, 2).map((label: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                              {label}
                            </Badge>
                          ))}
                          {email.labels.length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              +{email.labels.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
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
              <p className="text-sm">No emails available</p>
              <p className="text-xs">Click &quot;Sync Now&quot; to preview your recent emails</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
