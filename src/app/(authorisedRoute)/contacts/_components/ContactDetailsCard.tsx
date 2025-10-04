"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ContactAIInsightsDialog } from "@/app/(authorisedRoute)/contacts/_components/ContactAIInsightsDialog";
import { EditContactDialog } from "./EditContactDialog";
import { ContactHeader } from "./ContactHeader";
import { NotesMainPane } from "../[contactId]/notes/[noteId]/_components/NotesMainPane";
import { AIInsightsSidebar } from "./AIInsightsSidebar";
import { useAskAIAboutContact } from "@/hooks/use-contacts-bridge";
import { useNotes } from "@/hooks/use-notes";
import { useDeleteContact } from "@/hooks/use-contact-delete";
import {
  type ContactWithNotes,
  type ContactAIInsightsResponse,
} from "@/server/db/business-schemas/contacts";

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
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<ContactAIInsightsResponse | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch contact data
  const {
    data: client,
    isLoading: clientLoading,
    error: clientError,
  } = useQuery({
    queryKey: [`/api/contacts/${contactId}`],
    queryFn: async (): Promise<ContactWithNotes> => {
      const response = await apiClient.get<{ item: ContactWithNotes }>(
        `/api/contacts/${contactId}`,
      );
      return response.item;
    },
  });

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
  const askAIMutation = useAskAIAboutContact();
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
  const handleAskAI = async (): Promise<void> => {
    try {
      setAiInsightsOpen(true);
      const insights = await askAIMutation.mutateAsync(contactId);
      setAiInsights(insights);
    } catch {
      setAiInsightsOpen(false);
    }
  };

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
        onAskAI={handleAskAI}
        onAddNote={() => setIsAddingNote(true)}
      />

      {/* Main Content: 2/3 Notes + 1/3 AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes Main Pane (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <NotesMainPane
            contactId={contactId}
            notes={notes}
            isLoading={notesLoading}
            isAddingNote={isAddingNote}
            setIsAddingNote={setIsAddingNote}
            createNote={createNote}
          />
        </div>

        {/* AI Insights Sidebar (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          <AIInsightsSidebar
            contactId={contactId}
            insights={aiInsights}
            isLoading={askAIMutation.isPending}
            onGenerateInsights={handleAskAI}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ContactAIInsightsDialog
        contact={safeClient}
        open={aiInsightsOpen}
        onOpenChange={setAiInsightsOpen}
        insights={aiInsights}
        isLoading={askAIMutation.isPending}
        contactName={safeClient.displayName}
      />

      <EditContactDialog
        contact={safeClient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
