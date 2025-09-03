"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, Calendar, Eye, CheckCircle, Clock, User, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  hasAttachments: boolean;
  labels: string[];
}

interface SampleEmailData {
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface SyncPreview {
  totalEmails: number;
  estimatedContacts: number;
  dateRange: {
    from: string;
    to: string;
  };
  sampleEmails: EmailPreview[];
  potentialContacts: Array<{
    email: string;
    name?: string;
    frequency: number;
  }>;
}

interface GmailSyncPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  isLoading?: boolean;
}

export function GmailSyncPreview({ isOpen, onClose, onApprove, isLoading }: GmailSyncPreviewProps): JSX.Element | null {
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [isApproving, setIsApproving] = useState(false);


  const loadPreview = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchPost<{
        countByLabel?: Record<string, number>;
        sampleEmails?: any[];
        sampleSubjects?: any[];
        dateRange?: { from: string; to: string };
      }>("/api/sync/preview/gmail", {});
      // console.log("GmailSyncPreview data:", data);
        // Prefer richer preview data when available; fallback to subjects
        if (
          (Array.isArray(data?.sampleEmails) && data.sampleEmails.length > 0) ||
          (Array.isArray(data?.sampleSubjects) && data.sampleSubjects.length > 0)
        ) {
          const totalEmails = Object.values(data.countByLabel || {}).reduce(
            (sum: number, count: any) => sum + (typeof count === "number" ? count : 0),
            0,
          );

          const richEmails = Array.isArray(data.sampleEmails) ? data.sampleEmails : [];
          let sampleEmails: EmailPreview[] = richEmails.slice(0, 5).map((e: any, index: number) => ({
            id: e?.id ?? `email-${index}`,
            subject: e?.subject ?? `Email ${index + 1}`,
            from: e?.from ?? "Unknown Sender",
            to: [],
            date: e?.date ?? new Date(Date.now() - index * 86400000).toISOString(),
            snippet: e?.snippet ?? "",
            hasAttachments: Boolean(e?.hasAttachments),
            labels: Array.isArray(e?.labels) ? e.labels : [],
          }));

          if (sampleEmails.length === 0 && Array.isArray(data.sampleSubjects)) {
            sampleEmails = data.sampleSubjects
              .slice(0, 5)
              .map((emailObj: SampleEmailData, index: number) => ({
                id: emailObj.id ?? `email-${index}`,
                subject: emailObj.subject ?? `Email ${index + 1}`,
                from: emailObj.from ?? "Unknown Sender",
                to: [],
                date:
                  emailObj.date ?? new Date(Date.now() - index * 86400000).toISOString(),
                snippet: `Preview of email ${index + 1}...`,
                hasAttachments: false,
                labels: ["INBOX"],
              }));
          }

          const rangeFrom =
            data?.dateRange?.from ??
            (sampleEmails.length > 0
              ? new Date(
                  Math.min(
                    ...sampleEmails.map((e) => new Date(e.date).getTime() || Date.now()),
                  ),
                ).toISOString()
              : new Date(Date.now() - 30 * 86400000).toISOString());

          const rangeTo =
            data?.dateRange?.to ??
            (sampleEmails.length > 0
              ? new Date(
                  Math.max(
                    ...sampleEmails.map((e) => new Date(e.date).getTime() || Date.now()),
                  ),
                ).toISOString()
              : new Date().toISOString());

          const previewData: SyncPreview = {
            totalEmails,
            estimatedContacts: Math.floor(sampleEmails.length * 0.3),
            dateRange: { from: rangeFrom, to: rangeTo },
            sampleEmails,
            potentialContacts: [],
          };

          setPreview(previewData);
          toast.success(`Preview loaded`, {
            description: `Total ${totalEmails} emails • Showing ${sampleEmails.length} samples`,
          });
        } else {
          console.error("Invalid preview data format:", data);
          toast.error("Failed to load Gmail preview");
        }
    } catch (error) {
      console.error("Error loading preview:", error);
      toast.error("Error loading Gmail preview");
    }
  }, []);

  // Auto-load preview when the modal opens
  useEffect((): void => {
    if (isOpen && !preview) {
      void loadPreview();
    }
  }, [isOpen, preview, loadPreview]);

  const handleApprove = async (): Promise<void> => {
    setIsApproving(true);
    try {
      await onApprove();
      onClose();
    } finally {
      setIsApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">Gmail Sync Preview</h2>
              <p className="text-sm text-muted-foreground">
                Review what will be imported before proceeding
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!preview ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Load Preview</h3>
                <p className="text-muted-foreground mb-4">
                  Click below to see what emails will be processed
                </p>
                <Button onClick={loadPreview} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load Preview"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{preview.totalEmails}</p>
                          <p className="text-sm text-muted-foreground">Total Emails</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{preview.estimatedContacts}</p>
                          <p className="text-sm text-muted-foreground">Potential Contacts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium">Date Range</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(preview.dateRange.from), "MMM d, yyyy")} -{" "}
                            {format(new Date(preview.dateRange.to), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sample Emails */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sample Emails</CardTitle>
                    <CardDescription>
                      Preview of emails that will be processed (showing first 5)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {preview.sampleEmails.map((email: EmailPreview) => (
                        <div key={email.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{email.subject}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <User className="h-3 w-3" />
                                <span>From: {email.from}</span>
                                <Clock className="h-3 w-3 ml-2" />
                                <span>{format(new Date(email.date), "MMM d, HH:mm")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {email.hasAttachments && (
                                <Paperclip
                                  className="h-3 w-3 text-muted-foreground mr-1"
                                  aria-label="Has attachments"
                                />
                              )}
                              {email.labels.slice(0, 2).map((label: string) => (
                                <Badge key={label} variant="outline" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Potential Contacts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Potential Contacts</CardTitle>
                    <CardDescription>
                      Contacts that will be extracted from your emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {preview.potentialContacts.slice(0, 10).map(
                        (
                          contact: { email: string; name?: string; frequency: number },
                          index: number,
                        ) => (
                          <div key={index} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-medium text-sm">{contact.name ?? "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{contact.email}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {contact.frequency} emails
                            </Badge>
                          </div>
                        ),
                      )}
                      {preview.potentialContacts.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          ... and {preview.potentialContacts.length - 10} more contacts
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          {preview && (
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="text-sm text-muted-foreground">
                This action will process {preview.totalEmails} emails and may create up to{" "}
                {preview.estimatedContacts} new contacts.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={isApproving}>
                  {isApproving ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
