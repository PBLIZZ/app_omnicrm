"use client";

import { useState } from "react";
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

  const fetchNotes = async (): Promise<void> => {
    if (!contactId || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const data = await get<Note[]>(`/api/notes?contactId=${contactId}`);
      setNotes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild onMouseEnter={fetchNotes} onFocus={fetchNotes} data-testid={testId}>
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
          <h4 className="text-sm font-semibold text-foreground">Last Note for {contactName}</h4>

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
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <time dateTime={notes[0].createdAt}>
                      {formatDistanceToNow(new Date(notes[0].createdAt), { addSuffix: true })}
                    </time>
                  </div>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {notes[0].contentPlain.slice(0, 500)}
                    {notes[0].contentPlain.length > 500 && "..."}
                  </p>
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
