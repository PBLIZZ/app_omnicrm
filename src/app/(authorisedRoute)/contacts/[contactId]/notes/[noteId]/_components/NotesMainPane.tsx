"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Link2, NotebookPen } from "lucide-react";
import { NoteEditor } from "./NoteEditor";
import { toast } from "sonner";
import type { Note } from "@/server/db/schema";

interface NotesMainPaneProps {
  contactId: string;
  notes: Note[];
  isLoading: boolean;
  isAddingNote: boolean;
  setIsAddingNote: (value: boolean) => void;
  createNote: (data: { content: string }) => void;
}

export function NotesMainPane({
  contactId,
  notes,
  isLoading,
  isAddingNote,
  setIsAddingNote,
  createNote,
}: NotesMainPaneProps): JSX.Element {
  const router = useRouter();
  const [newNoteContent, setNewNoteContent] = useState("");

  const handleAddNote = (): void => {
    const content = newNoteContent?.trim();

    if (!content) {
      toast.error("Please enter a note");
      return;
    }

    createNote({ content });

    // Close editor and reset
    setIsAddingNote(false);
    setNewNoteContent("");
  };

  const handleNoteChange = (_html: string, text: string): void => {
    setNewNoteContent(text || "");
  };

  return (
    <div className="space-y-6">
      {/* Latest Note Preview */}
      {!isLoading && notes && notes.length > 0 && notes[0] && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Latest Note
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {notes[0].createdAt &&
                formatDistanceToNow(new Date(notes[0].createdAt), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap line-clamp-3">
              {notes[0].contentPlain?.slice(0, 500)}
              {(notes[0].contentPlain?.length ?? 0) > 500 && "..."}
            </p>
            <div className="flex items-center justify-between mt-3">
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push(`/contacts/${contactId}/notes/${notes[0]?.id ?? ""}`)}
                className="px-0 text-xs"
              >
                View full note →
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  const noteUrl = `${window.location.origin}/contacts/${contactId}/notes/${notes[0]?.id ?? ""}`;
                  navigator.clipboard.writeText(noteUrl);
                  toast.success("Link copied to clipboard");
                }}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Note Section */}
      {isAddingNote && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <NotebookPen className="h-5 w-5 mr-2" />
                New Note
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteContent("");
                }}
              >
                Cancel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NoteEditor
              key={isAddingNote ? "adding" : "closed"}
              content={newNoteContent}
              onChange={handleNoteChange}
              onSave={handleAddNote}
              placeholder="Document your session, observations, treatment, and next steps..."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      )}

      {/* All Notes Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Session Notes ({notes?.length ?? 0})
            </div>
            {!isAddingNote && (
              <Button onClick={() => setIsAddingNote(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">Loading notes...</div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => {
                if (!note || !note.contentPlain) return null;

                return (
                  <div
                    key={note.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/contacts/${contactId}/notes/${note.id}`)}
                  >
                    <p className="whitespace-pre-wrap line-clamp-3">{note.contentPlain}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>
                        {note.createdAt &&
                          formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt && (
                          <span>
                            Edited{" "}
                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            const noteUrl = `${window.location.origin}/contacts/${contactId}/notes/${note.id}`;
                            navigator.clipboard.writeText(noteUrl);
                            toast.success("Link copied to clipboard");
                          }}
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {note.contentPlain.length > 300 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-xs mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/contacts/${contactId}/notes/${note.id}`);
                        }}
                      >
                        Read more →
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">No notes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first note to track interactions with this client
              </p>
              <Button onClick={() => setIsAddingNote(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Note
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
