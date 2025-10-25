"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditContactDialog } from "@/app/(authorisedRoute)/contacts/_components/EditContactDialog";
import { useNotes } from "@/hooks/use-notes";
import { useContact } from "@/hooks/use-contacts";
import { LatestNotesCards } from "@/app/(authorisedRoute)/contacts/_components/LatestNotesCards";
import { AITimelineCard } from "@/app/(authorisedRoute)/contacts/_components/AITimelineCard";
import { NextStepsGoalsCard } from "@/app/(authorisedRoute)/contacts/_components/NextStepsGoalsCard";
import { AIInsightsCard } from "@/app/(authorisedRoute)/contacts/_components/AIInsightsCard";
import { AllNotesView } from "@/app/(authorisedRoute)/contacts/_components/AllNotesView";
import { PersonalDetailsView } from "@/app/(authorisedRoute)/contacts/_components/PersonalDetailsView";
import { TagManager } from "@/components/TagManager";

import { type Note, type Interaction } from "@/server/db/schema";
import type { ContactWithLastNote } from "@/server/db/business-schemas/contacts";
import { NoteEditor } from "@/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ContactDetailsCardProps {
  contactId: string;
}

/**
 * Contact Details Card Component with Integrated Navigation
 * Redesigned with single header, navigation controls, and improved note management
 */
export function ContactDetailsCard({ contactId }: ContactDetailsCardProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get active tab from URL search params
  const activeTab = searchParams.get("tab") || "overview";

  // State management
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addNoteSheetOpen, setAddNoteSheetOpen] = useState(false);
  const [editNoteSheetOpen, setEditNoteSheetOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteHtml, setNewNoteHtml] = useState("");
  const [newNoteEventId, setNewNoteEventId] = useState<string>("");
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Fetch contact data using centralized hook
  const { data: client, isLoading: clientLoading, error: clientError } = useContact(contactId);

  // Use notes hook for CRUD operations
  const {
    notes,
    isLoading: notesLoading,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
  } = useNotes({ contactId });

  // Fetch interactions for event linking
  const { data: interactions } = useQuery<Interaction[]>({
    queryKey: [`/api/contacts/${contactId}/interactions`],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/interactions`);
      if (!response.ok) return [];
      const data = await response.json();
      return data as Interaction[];
    },
    enabled: !!contactId,
  });

  // Note handlers
  const handleAddNote = (): void => {
    const content = newNoteContent?.trim();
    if (!content) {
      toast({
        title: "Please enter a note",
        description: "Note content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    createNote({
      content: newNoteContent,
    });

    setAddNoteSheetOpen(false);
    setNewNoteContent("");
    setNewNoteEventId("");
  };

  const handleEditNote = (note: Note): void => {
    setSelectedNote(note);
    // Use rich content for editing, fallback to plain if rich is empty
    const contentToEdit =
      note.contentRich && typeof note.contentRich === 'object' && Object.keys(note.contentRich as Record<string, unknown>).length > 0
        ? note.contentRich
        : note.contentPlain;
    setNewNoteContent(
      typeof contentToEdit === "string" ? contentToEdit : JSON.stringify(contentToEdit),
    );
    setNewNoteHtml(
      typeof contentToEdit === "string" ? contentToEdit : JSON.stringify(contentToEdit),
    );
    setEditNoteSheetOpen(true);
  };

  const handleUpdateNote = (): void => {
    if (!selectedNote) return;

    const content = newNoteContent?.trim();
    if (!content) {
      toast({
        title: "Please enter a note",
        description: "Note content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateNote({
      noteId: selectedNote.id,
      content: newNoteContent,
      contentRich: newNoteHtml,
    });

    setEditNoteSheetOpen(false);
    setSelectedNote(null);
    setNewNoteContent("");
    setNewNoteHtml("");
  };

  const handleDeleteNote = (noteId: string): void => {
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      deleteNote({ noteId });
    }
  };

  // Loading state
  if (clientLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading contact details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (clientError || !client) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Contact Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The contact you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Button onClick={() => router.push("/contacts")} className="mt-4">
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  // Type assertion after null check
  const safeClient = client as ContactWithLastNote;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Main Content */}
      <div className="space-y-6">
        {/* Overview Tab - Perplexity Finance-like Layout */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Tags Section */}
            <div className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Tags</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTagSelector(true)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Tags
                </Button>
              </div>
              <TagManager
                tags={safeClient.tags || []}
                entityType="contact"
                entityId={contactId}
                maxVisible={10}
                showModal={showTagSelector}
                onModalChange={setShowTagSelector}
              />
            </div>

            {/* Recent Notes - Perplexity Style */}
            <LatestNotesCards
              contactId={contactId}
              notes={notes}
              isLoading={notesLoading}
              onAddNote={() => setAddNoteSheetOpen(true)}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
            />

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Left Column (70%) - Latest Contact Movement */}
              <div className="space-y-6">
                <AITimelineCard contactId={contactId} />
              </div>

              {/* Right Column (30%) */}
              <div className="space-y-6">
                {/* Goals and Next Steps */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Goals and Next Steps</h2>
                  <NextStepsGoalsCard contactId={contactId} />
                </div>

                {/* AI Insights */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">AI Insights</h2>
                  <AIInsightsCard contactId={contactId} expanded={true} onToggle={() => {}} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Notes Tab */}
        {activeTab === "notes" && (
          <div className="h-[calc(100vh-200px)]">
            <AllNotesView
              contactId={contactId}
              onAddNote={() => setAddNoteSheetOpen(true)}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        )}

        {/* Contact Details Tab */}
        {activeTab === "details" && (
          <PersonalDetailsView contact={safeClient} onEdit={() => setEditDialogOpen(true)} />
        )}
      </div>

      {/* Add Note Sheet */}
      <Sheet open={addNoteSheetOpen} onOpenChange={setAddNoteSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <SheetTitle className="text-2xl">Add New Note</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Document your session, observations, and next steps
            </p>
          </SheetHeader>
          <div className="space-y-6">
            {/* Event Linking */}
            <div className="space-y-2">
              <Label htmlFor="event-select">Link to Event (Optional)</Label>
              <Select value={newNoteEventId} onValueChange={setNewNoteEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event to link this note to" />
                </SelectTrigger>
                <SelectContent>
                  {interactions?.map((interaction) => (
                    <SelectItem key={interaction.id} value={interaction.id}>
                      {interaction.subject ?? 'No subject'} -{" "}
                      {format(new Date(interaction.occurredAt), "dd/MM/yyyy HH:mm")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note Editor */}
            <div className="space-y-2">
              <Label>Note Content</Label>
              <NoteEditor
                content={newNoteContent}
                onChange={(_html, text) => setNewNoteContent(text)}
                placeholder="Document your session, observations, treatment, and next steps..."
                className="min-h-[300px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setAddNoteSheetOpen(false)} size="lg">
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={isCreating}
                size="lg"
                className="min-w-[120px]"
              >
                {isCreating ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Note Sheet */}
      <Sheet open={editNoteSheetOpen} onOpenChange={setEditNoteSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <SheetTitle className="text-2xl">Edit Note</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Update your session notes and observations
            </p>
          </SheetHeader>
          <div className="space-y-6">
            {/* Event Linking */}
            <div className="space-y-2">
              <Label htmlFor="event-select">Link to Event (Optional)</Label>
              <Select value={newNoteEventId} onValueChange={setNewNoteEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event to link this note to" />
                </SelectTrigger>
                <SelectContent>
                  {interactions?.map((interaction) => (
                    <SelectItem key={interaction.id} value={interaction.id}>
                      {interaction.subject ?? 'No subject'} -{" "}
                      {format(new Date(interaction.occurredAt), "dd/MM/yyyy HH:mm")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note Editor */}
            <div className="space-y-2">
              <Label>Note Content</Label>
              <NoteEditor
                content={newNoteContent}
                onChange={(html, text) => {
                  setNewNoteContent(text);
                  setNewNoteHtml(html);
                }}
                placeholder="Document your session, observations, treatment, and next steps..."
                className="min-h-[300px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditNoteSheetOpen(false)} size="lg">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateNote}
                disabled={isUpdating}
                size="lg"
                className="min-w-[120px]"
              >
                {isUpdating ? "Saving..." : "Update Note"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <EditContactDialog
        contact={safeClient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
