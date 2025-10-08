"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditContactDialog } from "./EditContactDialog";
import { ContactHeader } from "./ContactHeader";
import { NotesMainPane } from "../[contactId]/notes/[noteId]/_components/NotesMainPane";
import { useNotes } from "@/hooks/use-notes";
import { useContact, useDeleteContact } from "@/hooks/use-contacts";
import { type ContactWithNotes } from "@/server/db/schema";

interface ContactDetailsCardProps {
  contactId: string;
}

/**
 * Contact Details Card Component
 * Wellness practitioner optimized: Notes-first layout with AI insights sidebar
 */
export function ContactDetailsCard({ contactId }: ContactDetailsCardProps): JSX.Element {
  const router = useRouter();

  // State management
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch contact data using centralized hook
  const {
    data: client,
    isLoading: clientLoading,
    error: clientError,
  } = useContact(contactId);

  // Use notes hook for CRUD operations
  const { notes, isLoading: notesLoading, createNote } = useNotes({ contactId });

  // Fetch last interaction (latest note or calendar event)
  const { data: lastInteraction } = useQuery({
    queryKey: [`/api/contacts/${contactId}/last-interaction`],
    queryFn: async (): Promise<{ date: Date; type: string } | null> => {
      if (notes && notes.length > 0 && notes[0]) {
        return {
          date: new Date(notes[0].createdAt),
          type: "note",
        };
      }
      return null;
    },
    enabled: !!notes,
  });

  // Fetch next scheduled event from calendar
  const { data: nextEvent } = useQuery({
    queryKey: [`/api/contacts/${contactId}/next-event`],
    queryFn: async (): Promise<{ date: Date } | null> => {
      // TODO: Query calendar_events table in production
      return null;
    },
  });

  // Mutations
  const deleteContactMutation = useDeleteContact();

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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  // Type assertion after null check
  const safeClient = client as ContactWithNotes;

  // Handlers
  const handleDeleteClient = (): void => {
    if (
      confirm(
        `Are you sure you want to delete ${safeClient.displayName}? This action cannot be undone.`,
      )
    ) {
      deleteContactMutation.mutate(contactId, {
        onSuccess: () => {
          router.push("/contacts");
        },
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.push("/contacts")} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Contact Header with Photo, Name, Tags, Timeline */}
      <ContactHeader
        contact={safeClient}
        lastInteraction={lastInteraction ?? null}
        nextEvent={nextEvent ?? null}
        onEdit={() => setEditDialogOpen(true)}
        onDelete={handleDeleteClient}
        onAddNote={() => setIsAddingNote(true)}
      />

      {/* Main Content: Notes */}
      <div>
        <NotesMainPane
          contactId={contactId}
          notes={notes}
          isLoading={notesLoading}
          isAddingNote={isAddingNote}
          setIsAddingNote={setIsAddingNote}
          createNote={createNote}
        />
      </div>

      {/* Dialogs */}
      <EditContactDialog
        contact={safeClient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
