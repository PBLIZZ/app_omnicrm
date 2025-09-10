"use client";

import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { get } from "@/lib/api/client";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesHoverCardProps {
  clientId: string;
  clientName: string;
  children: React.ReactNode;
  "data-testid"?: string;
}

export function NotesHoverCard({
  clientId,
  clientName,
  children,
  "data-testid": testId,
}: NotesHoverCardProps): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async (): Promise<void> => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await get<{ notes: Note[] }>(`/api/omni-clients/${clientId}/notes`);
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className="cursor-pointer hover:bg-muted/20 p-1 rounded-sm transition-colors"
          data-testid={testId}
          onMouseEnter={fetchNotes}
        >
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-4" side="top" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Notes for {clientName}</h4>

          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && !error && (
            <ScrollArea className="max-h-80">
              {notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.slice(0, 20).map((note, index) => (
                    <div key={note.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={note.createdAt}>
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </time>
                        {index === 0 && <span className="text-primary font-medium">(Latest)</span>}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              )}
            </ScrollArea>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
