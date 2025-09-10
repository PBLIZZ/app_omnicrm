"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Phone,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  NotebookPen,
  User,
  Activity,
  MessageSquare,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ClientAIInsightsDialog } from "../../_components/ClientAIInsightsDialog";
import { ClientEmailDialog } from "../../_components/ClientEmailDialog";
import {
  useAskAIAboutOmniClient,
  useGenerateOmniClientEmailSuggestion,
  useCreateOmniClientNote,
  useDeleteOmniClient,
} from "@/hooks/use-omni-clients-bridge";
import {
  type ClientAIInsightsResponse,
  type ClientEmailSuggestion,
  type OmniClientWithNotesDTO,
} from "@/lib/validation/schemas/omniClients";

interface ClientDetailPageProps {
  clientId: string;
}

interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to generate initials from display name
function getInitials(displayName: string): string {
  if (!displayName) return "?";
  const names = displayName.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return "?";
  if (names.length === 1) {
    return names[0]!.charAt(0).toUpperCase();
  }
  return `${names[0]!.charAt(0)}${names[names.length - 1]!.charAt(0)}`.toUpperCase();
}

/**
 * Comprehensive Client Detail Page Component
 * Full client profile with notes, interactions, and AI features
 */
export function ClientDetailPage({ clientId }: ClientDetailPageProps): JSX.Element {
  // All hooks must be called at the top of the component before any conditional logic
  const router = useRouter();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<ClientAIInsightsResponse | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<ClientEmailSuggestion | null>(null);

  // Fetch client data
  const {
    data: client,
    isLoading: clientLoading,
    error: clientError,
  } = useQuery({
    queryKey: [`/api/omni-clients/${clientId}`],
    queryFn: async (): Promise<OmniClientWithNotesDTO> => {
      const response = await apiClient.get<{ item: OmniClientWithNotesDTO }>(
        `/api/omni-clients/${clientId}`,
      );
      return response.item;
    },
  });

  // Fetch client notes
  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: [`/api/omni-clients/${clientId}/notes`],
    queryFn: async (): Promise<ClientNote[]> => {
      const response = await apiClient.get<{ notes: ClientNote[] }>(
        `/api/omni-clients/${clientId}/notes`,
      );
      return response.notes;
    },
  });

  // Mutations - moved before conditional returns to comply with Rules of Hooks
  const askAIMutation = useAskAIAboutOmniClient();
  const generateEmailMutation = useGenerateOmniClientEmailSuggestion();
  const createNoteMutation = useCreateOmniClientNote();
  const deleteClientMutation = useDeleteOmniClient();

  // Loading state
  if (clientLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading client details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (clientError || !client) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Client Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Button onClick={() => router.push("/omni-clients")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  // Type assertion after null check - we know client exists here
  const safeClient = client as OmniClientWithNotesDTO;
  const initials = getInitials(safeClient.displayName);

  // Handlers
  const handleAskAI = async (): Promise<void> => {
    try {
      setAiInsightsOpen(true);
      const insights = await askAIMutation.mutateAsync(clientId);
      setAiInsights(insights);
    } catch {
      setAiInsightsOpen(false);
    }
  };

  const handleSendEmail = async (): Promise<void> => {
    if (!safeClient.primaryEmail) {
      toast.error("This client has no email address");
      return;
    }

    try {
      setEmailDialogOpen(true);
      const suggestion = await generateEmailMutation.mutateAsync({
        contactId: clientId,
      });
      setEmailSuggestion(suggestion);
    } catch {
      setEmailDialogOpen(false);
    }
  };

  const handleAddNote = async (): Promise<void> => {
    if (!newNoteContent.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        contactId: clientId,
        content: newNoteContent.trim(),
      });
      setIsAddingNote(false);
      setNewNoteContent("");
      await queryClient.invalidateQueries({ queryKey: [`/api/omni-clients/${clientId}/notes`] });
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteClient = (): void => {
    if (
      confirm(
        `Are you sure you want to delete ${safeClient.displayName}? This action cannot be undone.`,
      )
    ) {
      deleteClientMutation.mutate(clientId, {
        onSuccess: () => {
          router.push("/omni-clients");
        },
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/omni-clients")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={`/api/omni-clients/${safeClient.id}/avatar`}
                alt={`${safeClient.displayName} avatar`}
              />
              <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{safeClient.displayName}</h1>
              <p className="text-muted-foreground">
                Client since {new Date(safeClient.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleAskAI}>
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
          <Button variant="outline" onClick={handleSendEmail} disabled={!safeClient.primaryEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button variant="outline" onClick={() => setIsAddingNote(true)}>
            <NotebookPen className="h-4 w-4 mr-2" />
            Add Note
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDeleteClient}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeClient.primaryEmail && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{safeClient.primaryEmail}</span>
                  </div>
                )}
                {safeClient.primaryPhone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{safeClient.primaryPhone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Last updated{" "}
                    {formatDistanceToNow(new Date(safeClient.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Wellness Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Wellness Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeClient.stage && (
                  <div>
                    <Label className="text-sm font-medium">Stage</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">{safeClient.stage}</Badge>
                    </div>
                  </div>
                )}
                {safeClient.tags && safeClient.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {safeClient.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Recent Notes
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("notes")}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="text-muted-foreground">Loading notes...</div>
              ) : notes && notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="border-l-2 border-blue-200 pl-4">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No notes yet. Add your first note to track interactions.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  All Notes
                </div>
                <Button onClick={() => setIsAddingNote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="text-muted-foreground">Loading notes...</div>
              ) : notes && notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                        {note.updatedAt !== note.createdAt && (
                          <span>
                            Edited{" "}
                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first note to track interactions with this client
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <Card>
            <CardHeader>
              <CardTitle>Interaction History</CardTitle>
              <CardDescription>
                Track all interactions and touchpoints with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Interaction tracking coming soon</p>
                <p className="text-sm text-muted-foreground">
                  This will show emails, appointments, and other interactions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                AI Insights
              </CardTitle>
              <CardDescription>
                AI-powered insights and recommendations for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button onClick={handleAskAI} disabled={askAIMutation.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {askAIMutation.isPending ? "Generating Insights..." : "Generate AI Insights"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Note Dialog */}
      <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Note for {safeClient.displayName}</DialogTitle>
            <DialogDescription>
              Add a new note to track interactions or observations about this client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="note">Note Content</Label>
              <Textarea
                id="note"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={createNoteMutation.isPending || !newNoteContent.trim()}
            >
              {createNoteMutation.isPending ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Dialogs */}
      <ClientAIInsightsDialog
        open={aiInsightsOpen}
        onOpenChange={setAiInsightsOpen}
        insights={aiInsights}
        isLoading={askAIMutation.isPending}
        clientName={safeClient.displayName}
      />

      <ClientEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        emailSuggestion={emailSuggestion}
        isLoading={generateEmailMutation.isPending}
        clientName={safeClient.displayName}
        clientEmail={safeClient.primaryEmail ?? undefined}
      />
    </div>
  );
}
