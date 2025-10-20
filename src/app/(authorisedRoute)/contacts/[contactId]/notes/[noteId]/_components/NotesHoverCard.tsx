"use client";

import React, { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { get } from "@/lib/api/client";

interface Note {
  id: string;
  contentPlain: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesResponse {
  notes: Note[];
  total: number;
}

interface NotesHoverCardProps {
  contactId: string;
  contactName: string;
  children: React.ReactNode;
  "data-testid"?: string;
}

export function NotesHoverCard({
  contactId,
  contactName,
  children,
  "data-testid": testId,
}: NotesHoverCardProps): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Reset state when contactId changes
  React.useEffect(() => {
    setNotes([]);
    setLoading(false);
    setError(null);
    setHasFetched(false);
  }, [contactId]);

  const fetchNotes = async (): Promise<void> => {
    if (!contactId || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const data = await get<NotesResponse>(`/api/contacts/${contactId}/notes`);
      setNotes(data?.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard openDelay={150} closeDelay={200}>
      <HoverCardTrigger
        asChild
        onMouseEnter={fetchNotes}
        onFocus={fetchNotes}
        data-testid={testId}
        className="cursor-pointer hover:bg-muted/20"
        tabIndex={0}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-96 p-4 min-h-[120px]"
        side="top"
        align="center"
        sideOffset={10}
        avoidCollisions={false}
      >
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Notes for {contactName}</h4>

          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && !error && (
            <>
              {notes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notes.slice(0, 20).map((note, index) => (
                    <div key={note.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={note.createdAt}>
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </time>
                        {index === 0 && <span className="text-primary font-medium">(Latest)</span>}
                      </div>
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {note.contentPlain.slice(0, 500)}
                        {note.contentPlain.length > 500 && "..."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              )}
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
