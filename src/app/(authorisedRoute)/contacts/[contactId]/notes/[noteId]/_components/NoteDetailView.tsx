"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { useContact } from "@/hooks/use-contacts";
import type { Note } from "@/server/db/schema";

interface NoteDetailViewProps {
  contactId: string;
  noteId: string;
}

function isPIIEntitiesArray(value: unknown): value is Array<unknown> {
  return Array.isArray(value);
}

export function NoteDetailView({ contactId, noteId }: NoteDetailViewProps): JSX.Element {
  const router = useRouter();

  // Fetch note details
  const { data: note, isLoading: noteLoading, error: noteError } = useQuery({
    queryKey: [`/api/notes/${noteId}`],
    queryFn: async (): Promise<Note> => {
      // apiClient.get unwraps { success: true, data: T } to just T
      const note = await apiClient.get<Note>(`/api/notes/${noteId}`);
      return note;
    },
  });

  // Fetch contact basic info using centralized hook
  const { data: contact } = useContact(contactId);

  if (noteLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading note...</div>
        </div>
      </div>
    );
  }

  if (noteError || !note) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Note Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The note you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push(`/contacts/${contactId}`)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contact
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/contacts/${contactId}`)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Note Details</h1>
            {contact && (
              <p className="text-sm text-muted-foreground">
                For {contact.displayName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Note Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardDescription>
                  Created {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </CardDescription>
              </div>
              {note.updatedAt !== note.createdAt && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardDescription className="text-xs">
                    Last edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </CardDescription>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {note.sourceType && (
                <Badge variant="secondary" className="text-xs">
                  {note.sourceType}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PII Warning if redactions occurred */}
          {(() => {
            const piiEntities = note.piiEntities;
            if (!isPIIEntitiesArray(piiEntities) || piiEntities.length === 0) return null;
            
            return (
              <div className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Sensitive information was redacted
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {piiEntities.length} item(s) automatically removed for privacy compliance
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Note Content */}
          <div className="prose prose-sm max-w-none">
            {note.contentRich && typeof note.contentRich === "string" ? (
              <div dangerouslySetInnerHTML={{ __html: note.contentRich }} />
            ) : (
              <p className="whitespace-pre-wrap">{note.contentPlain}</p>
            )}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/contacts/${contactId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contact
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard");
          }}
        >
          Copy Link to Note
        </Button>
      </div>
    </div>
  );
}
