"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Plus, Edit2, Trash2, Save, X, Clock, User } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNotes } from "@/hooks/use-notes";
import type { Note } from "@/server/db/schema";

interface NotesHoverCardProps {
  contactId: string;
  contactName: string;
  notesCount: number;
  lastNote?: string | undefined;
  className?: string;
}

interface NoteItemProps {
  note: Note;
  onEdit: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function NoteItem({ note, onEdit, onDelete, isUpdating, isDeleting }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== note.content) {
      onEdit(note.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <>
      <div
        className="group relative p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
        data-testid={`note-item-${note.id}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>You</span>
            <Clock className="h-3 w-3" />
            <span title={format(new Date(note.createdAt), "PPpp")}>
              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
            </span>
            {note.updatedAt !== note.createdAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => setIsEditing(true)}
              disabled={isEditing || isUpdating}
              data-testid={`edit-note-${note.id}`}
            >
              <Edit2 className="h-3 w-3" />
              <span className="sr-only">Edit note</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isEditing || isDeleting}
              data-testid={`delete-note-${note.id}`}
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Delete note</span>
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
              placeholder="Enter your note..."
              data-testid={`edit-note-textarea-${note.id}`}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Press Cmd+Enter to save, Esc to cancel
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleCancelEdit}
                  data-testid={`cancel-edit-${note.id}`}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === note.content || isUpdating}
                  data-testid={`save-edit-${note.id}`}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`cancel-delete-${note.id}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(note.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid={`confirm-delete-${note.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddNoteForm({
  onSubmit,
  isCreating,
}: {
  onSubmit: (content: string) => void;
  isCreating: boolean;
}) {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (content.trim()) {
        handleSubmit(e as any);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsExpanded(false);
      setContent("");
    }
  };

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsExpanded(true)}
        data-testid="add-note-button"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add a note...
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your note..."
        className="min-h-[80px] resize-none"
        data-testid="add-note-textarea"
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Press Cmd+Enter to save, Esc to cancel</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsExpanded(false);
              setContent("");
            }}
            data-testid="cancel-add-note"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || isCreating}
            data-testid="save-add-note"
          >
            {isCreating ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NotesHoverCard({
  contactId,
  contactName,
  notesCount,
  lastNote,
  className,
}: NotesHoverCardProps) {
  const {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting,
  } = useNotes({ contactId });

  const handleCreateNote = (content: string) => {
    createNote({ content });
  };

  const handleEditNote = (noteId: string, content: string) => {
    updateNote({ noteId, content });
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote({ noteId });
  };

  const trigger = (
    <div
      className={`flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors ${className}`}
      data-testid={`notes-hover-trigger-${contactId}`}
    >
      <Badge variant="secondary" className="text-xs">
        {notesCount}
      </Badge>
      {lastNote && (
        <span className="text-xs text-muted-foreground truncate max-w-32">{lastNote}</span>
      )}
    </div>
  );

  return (
    <HoverCard key={`${contactId}-${notes.length}`} openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        className="w-[400px] p-0"
        side="right"
        align="start"
        data-testid={`notes-hover-content-${contactId}`}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" />
            <h3 className="font-semibold">Notes for {contactName}</h3>
            <Badge variant="outline" className="ml-auto">
              {notesCount} notes
            </Badge>
          </div>

          <div className="space-y-4">
            <AddNoteForm onSubmit={handleCreateNote} isCreating={isCreating} />

            {notesCount > 0 && <Separator />}

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Failed to load notes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Error: {error.message || "Unknown error"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground">Add your first note above</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3 pr-2">
                  {notes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      isUpdating={isUpdating}
                      isDeleting={isDeleting}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
