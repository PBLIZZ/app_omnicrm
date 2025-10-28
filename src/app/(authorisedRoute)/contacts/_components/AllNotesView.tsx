"use client";

import { useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, MessageSquare, Edit, Trash2 } from "lucide-react";
import { useNotesInfinite } from "@/hooks/use-notes-infinite";
import { NoteEditor } from "@/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor";
import type { Note } from "@/server/db/schema";

interface PaginatedNotesResponse {
  notes: Note[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface AllNotesViewProps {
  contactId: string;
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export function AllNotesView({
  contactId,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: AllNotesViewProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useNotesInfinite({ contactId, pageSize: 10 });

  // Flatten all notes from all pages
  const allNotes = data?.pages.flatMap((page: PaginatedNotesResponse) => page.notes) ?? [];

  // Group notes by year
  const groupedNotes = allNotes.reduce(
    (acc, note) => {
      const year = new Date(note.createdAt).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(note);
      return acc;
    },
    {} as Record<number, Note[]>,
  );

  // Sort years in descending order
  const sortedYears = Object.keys(groupedNotes)
    .map(Number)
    .sort((a, b) => b - a);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef } = useInView({
    threshold: 0,
    rootMargin: "100px",
    onChange: (inView: boolean) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const handleNoteClick = (note: Note) => {
    setEditingNote(note);
    // Use rich content for editing, fallback to plain if rich is empty
    const contentToEdit =
      note.contentRich && Object.keys(note.contentRich).length > 0
        ? note.contentRich
        : note.contentPlain;
    setEditContent(
      typeof contentToEdit === "string" ? contentToEdit : JSON.stringify(contentToEdit),
    );
    setEditHtml(typeof contentToEdit === "string" ? contentToEdit : JSON.stringify(contentToEdit));
    setEditSheetOpen(true);
  };

  const handleEditSave = () => {
    if (editingNote) {
      onEditNote({
        ...editingNote,
        contentPlain: editContent,
        contentRich: editHtml,
      });
      setEditSheetOpen(false);
      setEditingNote(null);
      setEditContent("");
      setEditHtml("");
    }
  };

  const handleEditCancel = () => {
    setEditSheetOpen(false);
    setEditingNote(null);
    setEditContent("");
    setEditHtml("");
  };

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6">
          <div className="text-muted-foreground">Loading notes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6">
          <div className="text-destructive">Error loading notes. Please try again.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">All Notes</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onAddNote}>
                <Plus className="h-4 w-4 mr-2" />
                Add a New Note
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <ScrollArea className="flex-1" ref={scrollContainerRef}>
            <div className="p-6">
              {allNotes.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first note to track interactions with this client
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {sortedYears.map((year) => (
                    <div key={year}>
                      {/* Year Header */}
                      <div className="text-2xl font-bold text-foreground mb-4">{year}</div>

                      {/* Notes for this year */}
                      <div className="space-y-1">
                        {groupedNotes[year]
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                          )
                          .map((note, index) => (
                            <div
                              key={note.id}
                              id={`note-${note.id}`}
                              className="group relative py-3 px-0 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
                              onClick={() => handleNoteClick(note)}
                            >
                              <div className="flex items-start justify-between">
                                {/* Note Content */}
                                <div className="flex-1 pr-4">
                                  <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none">
                                    {note.contentRich &&
                                    Object.keys(note.contentRich).length > 0 ? (
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            typeof note.contentRich === "string"
                                              ? note.contentRich
                                              : JSON.stringify(note.contentRich),
                                        }}
                                      />
                                    ) : (
                                      <div className="whitespace-pre-wrap">{note.contentPlain}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Date and Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(note.createdAt), "MMM d, h:mm a")}
                                  </div>

                                  {/* Hover Actions */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNoteClick(note);
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteNote(note.id);
                                      }}
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Load more trigger for last note */}
                              {index === groupedNotes[year].length - 1 &&
                                year === sortedYears[sortedYears.length - 1] &&
                                hasNextPage && (
                                  <div ref={loadMoreRef} className="py-4">
                                    {isFetchingNextPage ? (
                                      <div className="text-center text-muted-foreground">
                                        Loading more notes...
                                      </div>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        onClick={() => fetchNextPage()}
                                        className="w-full"
                                      >
                                        Load More Notes
                                      </Button>
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Edit Note Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <SheetTitle className="text-2xl">Edit Note</SheetTitle>
            <p className="text-sm text-muted-foreground">Update your note content</p>
          </SheetHeader>
          <div className="space-y-6">
            {/* Note Editor */}
            <div className="space-y-2">
              <NoteEditor
                content={editContent}
                onChange={(html, text) => {
                  setEditContent(text);
                  setEditHtml(html);
                }}
                placeholder="Enter your note content..."
                className="min-h-[300px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleEditCancel}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
