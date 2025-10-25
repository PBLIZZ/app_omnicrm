"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { type Note } from "@/server/db/schema";

interface LatestNotesCardsProps {
  contactId: string;
  notes: Note[] | undefined;
  isLoading: boolean;
  onAddNote?: () => void;
  onEditNote?: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
}

/**
 * Latest Notes Cards Component
 * Displays 3 most recent notes in horizontal card layout (Perplexity Finance style)
 */
export function LatestNotesCards({
  contactId,
  notes,
  isLoading,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: LatestNotesCardsProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[300px]">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">No notes yet</p>
          <p className="text-sm text-muted-foreground">Add your first note to track interactions</p>
        </div>
      </Card>
    );
  }

  // Get the 3 most recent notes
  const latestNotes = notes.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Notes</h2>
        <Button variant="outline" size="sm" onClick={() => onAddNote?.()}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Add a new Note
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {latestNotes.map((note) => (
          <Card
            key={note.id}
            className="h-[300px] flex flex-col border-l-4 border-l-orange-500 relative group cursor-pointer"
            onClick={() => onEditNote?.(note)}
          >
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                <MessageSquare className="h-4 w-4" />
                {format(new Date(note.createdAt), "EEEE, dd MMMM yyyy")} •{" "}
                {format(new Date(note.createdAt), "HH:mm")}
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-sm text-muted-foreground line-clamp-8 leading-relaxed">
                  {note.contentPlain}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote?.(note.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </Card>
        ))}

        {/* Fill remaining slots if less than 3 notes */}
        {latestNotes.length < 3 &&
          Array.from({ length: 3 - latestNotes.length }).map((_, index) => (
            <Card
              key={`empty-${index}`}
              className="h-[300px] flex items-center justify-center border-dashed"
            >
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No note yet</p>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
