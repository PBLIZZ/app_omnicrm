"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  NotebookPen,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { NotesHoverCard } from "./NotesHoverCard";
import Link from "next/link";
import { ClientAIInsightsDialog } from "./ClientAIInsightsDialog";
import { NoteComposerPopover } from "./NoteComposerPopover";
import { EditClientDialog } from "./EditClientDialog";
import {
  useAskAIAboutOmniClient,
  useCreateOmniClientNote,
  useDeleteOmniClient,
} from "@/hooks/use-omni-clients-bridge";
import type { ClientWithNotes, ClientAIInsightsResponse } from "./types";
import { toast } from "sonner";

// Helper function to generate initials from display name
function getInitials(displayName: string): string {
  if (!displayName) return "?";
  const names = displayName.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return "?";
  if (names.length === 1) {
    const firstName = names[0];
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return "?";
  }
  const firstName = names[0];
  const lastName = names[names.length - 1];
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return "?";
}

// AI Action Icons Component
function ClientAIActions({ client }: { client: ClientWithNotes }): JSX.Element {
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");

  const [aiInsights, setAiInsights] = useState<ClientAIInsightsResponse | null>(null);

  const askAIMutation = useAskAIAboutOmniClient();
  const createNoteMutation = useCreateOmniClientNote();

  const handleAskAI = async (): Promise<void> => {
    try {
      setAiInsightsOpen(true);
      const insights = await askAIMutation.mutateAsync(client.id);
      setAiInsights(insights);
    } catch {
      // Error handled by mutation
      setAiInsightsOpen(false);
    }
  };

  const handleAddNote = async (): Promise<void> => {
    if (!newNoteContent.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        contactId: client.id,
        content: newNoteContent.trim(),
      });
      setAddNoteDialogOpen(false);
      setNewNoteContent("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950 dark:hover:text-violet-300"
            onClick={handleAskAI}
            data-testid={`ask-ai-${client.id}`}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span className="sr-only">Ask AI</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask AI about this client</p>
        </TooltipContent>
      </Tooltip>

      <NoteComposerPopover clientId={client.id} clientName={client.displayName}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950 dark:hover:text-teal-300"
              data-testid={`take-note-${client.id}`}
            >
              <NotebookPen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span className="sr-only">Take Note</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Take a note</p>
          </TooltipContent>
        </Tooltip>
      </NoteComposerPopover>

      {/* AI Dialogs */}
      <ClientAIInsightsDialog
        open={aiInsightsOpen}
        onOpenChange={setAiInsightsOpen}
        insights={aiInsights}
        isLoading={askAIMutation.isPending}
        clientName={client.displayName}
      />

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Note to {client.displayName}</DialogTitle>
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
                setAddNoteDialogOpen(false);
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
    </div>
  );
}

export const omniClientsColumns: ColumnDef<ClientWithNotes>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all clients"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select client ${row.original.displayName || "Unknown"}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
  },
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => {
      const client = row.original;
      const initials = getInitials(client.displayName);

      // Only try to load avatar image if client has a photo URL
      const hasPhoto = client.photoUrl && client.photoUrl.trim();

      return (
        <Avatar className="size-8" data-testid={`client-avatar-${client.id}`}>
          {hasPhoto && (
            <AvatarImage
              src={`/api/omni-clients/${client.id}/avatar`}
              alt={`${client.displayName} avatar`}
            />
          )}
          <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 dark:from-teal-900 dark:to-teal-800 dark:text-teal-300">
            {initials}
          </AvatarFallback>
        </Avatar>
      );
    },
    size: 60,
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Name
          {column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row, table }) => {
      const client = row.original;
      const name = row.getValue("displayName") as string;

      const handleContactClick = () => {
        // Set up navigation context in localStorage for Tinder-style browsing
        const allRows = table.getFilteredRowModel().rows;
        const contactIds = allRows.map((r) => r.original.id);
        const currentIndex = allRows.findIndex((r) => r.original.id === client.id);

        const searchQuery =
          typeof window !== "undefined" && window.location.search.includes("search=")
            ? new URLSearchParams(window.location.search).get("search") || undefined
            : undefined;

        const navigationContext = {
          currentIndex,
          totalItems: contactIds.length,
          contactIds,
          searchQuery,
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("omniClientsNavigationContext", JSON.stringify(navigationContext));
          } catch (error) {
            // Silently handle storage failures (private mode, quota exceeded, etc.)
            console.warn("Failed to persist navigation context:", error);
          }
        }
      };

      return (
        <Link
          href={`/omni-clients/details?id=${client.id}`}
          onClick={handleContactClick}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          {name ?? "Unknown"}
        </Link>
      );
    },
  },
  {
    id: "aiActions",
    header: "Actions",
    cell: ({ row }) => {
      const client = row.original;
      return <ClientAIActions client={client} />;
    },
    size: 140,
  },
  {
    accessorKey: "primaryEmail",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("primaryEmail") as string | null;
      return email ? (
        <span className="text-muted-foreground">{email}</span>
      ) : (
        <span className="text-muted-foreground italic">No email</span>
      );
    },
  },
  {
    accessorKey: "primaryPhone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("primaryPhone") as string | null;
      return phone ? (
        <span className="text-muted-foreground">{phone}</span>
      ) : (
        <span className="text-muted-foreground italic">No phone</span>
      );
    },
  },
  {
    accessorKey: "lastNote",
    header: "Notes",
    cell: ({ row }) => {
      const lastNote = row.original.lastNote;
      const client = row.original;

      return (
        <div className="max-w-[48ch] min-w-0">
          <NotesHoverCard
            clientId={client.id}
            clientName={client.displayName ?? "Unknown"}
            data-testid={`notes-hover-card-${client.id}`}
          >
            <div className="line-clamp-2 text-sm text-muted-foreground leading-tight overflow-hidden text-ellipsis">
              {lastNote ? (
                <span className="whitespace-pre-wrap">{lastNote}</span>
              ) : (
                <span className="italic text-muted-foreground/60">No notes yet</span>
              )}
            </div>
          </NotesHoverCard>
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tagsData = row.getValue("tags") as string[] | string | null;
      let tags: string[] = [];

      // Tags come as array from API, not string
      if (Array.isArray(tagsData)) {
        tags = tagsData;
      } else if (typeof tagsData === "string" && tagsData) {
        try {
          tags = JSON.parse(tagsData) as string[];
        } catch {
          tags = [];
        }
      }

      const getTagColor = (tag: string): string => {
        // Service types - Blue
        if (
          [
            "Yoga",
            "Massage",
            "Meditation",
            "Pilates",
            "Reiki",
            "Acupuncture",
            "Personal Training",
            "Nutrition Coaching",
            "Life Coaching",
            "Therapy",
          ].includes(tag)
        ) {
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
        }
        // Class/Session types - Purple
        if (["Workshops", "Retreats", "Group Classes", "Private Sessions"].includes(tag)) {
          return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
        }
        // Demographics - Green
        if (
          [
            "Senior",
            "Young Adult",
            "Professional",
            "Parent",
            "Student",
            "Beginner",
            "Intermediate",
            "Advanced",
            "VIP",
            "Local",
            "Traveler",
          ].includes(tag)
        ) {
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        }
        // Goals & Health - Orange
        if (
          [
            "Stress Relief",
            "Weight Loss",
            "Flexibility",
            "Strength Building",
            "Pain Management",
            "Mental Health",
            "Spiritual Growth",
            "Mindfulness",
            "Athletic Performance",
            "Injury Recovery",
            "Prenatal",
            "Postnatal",
          ].includes(tag)
        ) {
          return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
        }
        // Engagement patterns - Teal
        if (
          [
            "Regular Attendee",
            "Weekend Warrior",
            "Early Bird",
            "Evening Preferred",
            "Seasonal Client",
            "Frequent Visitor",
            "Occasional Visitor",
            "High Spender",
            "Referral Source",
            "Social Media Active",
          ].includes(tag)
        ) {
          return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300";
        }
        // Default - Gray
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      };

      return (
        <div className="flex gap-1 flex-wrap">
          {tags.length > 0 ? (
            tags.slice(0, 4).map((tag: string, index: number) => (
              <Badge key={index} className={`text-xs ${getTagColor(tag)}`}>
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground italic text-sm">No tags</span>
          )}
          {tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 4}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "stage",
    header: "Wellness Stage",
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string | null;
      const getStageColor = (stage: string | null): string => {
        switch (stage) {
          case "VIP Client":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
          case "Core Client":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
          case "New Client":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
          case "Prospect":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
          case "At Risk Client":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
          case "Lost Client":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
          default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
        }
      };

      return stage ? (
        <Badge className={`text-xs ${getStageColor(stage)}`}>{stage}</Badge>
      ) : (
        <span className="text-muted-foreground italic text-sm">No stage</span>
      );
    },
  },
  {
    accessorKey: "interactions",
    header: "Interactions",
    cell: ({ row }) => {
      const count = (row.getValue("interactions") as number) || 0;
      return (
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Last Updated
          {column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("updatedAt"));
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const client = row.original;
      return <ClientActionsCell client={client} />;
    },
  },
];

function ClientActionsCell({ client }: { client: ClientWithNotes }): JSX.Element {
  const deleteClient = useDeleteOmniClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEditClient = (): void => {
    setEditDialogOpen(true);
  };

  const handleDeleteClient = (): void => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClient = (): void => {
    deleteClient.mutate(client.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            data-testid={`client-actions-${client.id}`}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid={`edit-client-${client.id}`}
            onClick={() => handleEditClient()}
          >
            <Edit className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
            Edit Client
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid={`add-note-${client.id}`}
            onClick={() => {
              // This should open the add note dialog for this specific client
              // Since this is outside the ClientAIActions component, we'll need to implement this differently
              toast.info(
                `Add note for ${client.displayName ?? "Unknown"} - Use the note icon in the Actions column`,
              );
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </DropdownMenuItem>
          <DropdownMenuItem data-testid={`view-notes-${client.id}`}>
            <MessageSquare className="h-4 w-4 mr-2" />
            View Notes
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            data-testid={`delete-client-${client.id}`}
            onClick={handleDeleteClient}
          >
            <Trash2 className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Client Dialog */}
      <EditClientDialog client={client} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {client.displayName ?? "Unknown"}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClient}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
