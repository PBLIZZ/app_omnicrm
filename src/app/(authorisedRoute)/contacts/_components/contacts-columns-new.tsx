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
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  PenTool,
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
import { Contact } from "@/server/db/schema";
import { formatDistanceToNow } from "date-fns";
import { NotesHoverCard } from "@/app/(authorisedRoute)/contacts/_components/NotesHoverCard";
import { ContactAIInsightsDialog } from "@/app/(authorisedRoute)/contacts/_components/ContactAIInsightsDialog";
import { ContactEmailDialog } from "@/app/(authorisedRoute)/contacts/_components/ContactEmailDialog";
import { ContactNoteSuggestionsDialog } from "@/app/(authorisedRoute)/contacts/_components/ContactNoteSuggestionsDialog";
import {
  useAskAIAboutContact,
  useGenerateEmailSuggestion,
  useGenerateNoteSuggestions,
  useCreateContactNote,
  ContactAIInsightResponse,
  ContactEmailSuggestion,
  ContactNoteSuggestion,
} from "@/hooks/use-contact-ai-actions";
import { useDeleteContact } from "@/hooks/use-contact-delete";
import { toast } from "sonner";

export interface ContactWithNotes extends Contact {
  notesCount?: number;
  lastNote?: string;
  interactions?: number;
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

// AI Action Icons Component
function ContactAIActions({ contact }: { contact: ContactWithNotes }): JSX.Element {
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");

  const [aiInsights, setAiInsights] = useState<ContactAIInsightResponse | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<ContactEmailSuggestion | null>(null);
  const [noteSuggestions, setNoteSuggestions] = useState<ContactNoteSuggestion[] | null>(null);

  const askAIMutation = useAskAIAboutContact();
  const generateEmailMutation = useGenerateEmailSuggestion();
  const generateNotesMutation = useGenerateNoteSuggestions();
  const createNoteMutation = useCreateContactNote();

  const handleAskAI = async (): Promise<void> => {
    try {
      setAiInsightsOpen(true);
      const insights = await askAIMutation.mutateAsync(contact.id);
      setAiInsights(insights);
    } catch {
      // Error handled by mutation
      setAiInsightsOpen(false);
    }
  };

  const handleSendEmail = async (): Promise<void> => {
    if (!contact.primaryEmail) {
      toast.error("This contact has no email address");
      return;
    }

    try {
      setEmailDialogOpen(true);
      const suggestion = await generateEmailMutation.mutateAsync({
        contactId: contact.id,
      });
      setEmailSuggestion(suggestion);
    } catch {
      // Error handled by mutation
      setEmailDialogOpen(false);
    }
  };

  const handleTakeNote = async (): Promise<void> => {
    try {
      setNoteDialogOpen(true);
      const suggestions = await generateNotesMutation.mutateAsync(contact.id);
      setNoteSuggestions(suggestions);
    } catch {
      // Error handled by mutation
      setNoteDialogOpen(false);
    }
  };

  const handleAddNote = async (): Promise<void> => {
    if (!newNoteContent.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        contactId: contact.id,
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
            data-testid={`ask-ai-${contact.id}`}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span className="sr-only">Ask AI</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask AI about this contact</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950 dark:hover:text-sky-300"
            onClick={handleSendEmail}
            data-testid={`send-email-${contact.id}`}
            disabled={!contact.primaryEmail}
          >
            <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span className="sr-only">Send Email</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{contact.primaryEmail ? "Send email" : "No email address"}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950 dark:hover:text-teal-300"
            onClick={handleTakeNote}
            data-testid={`take-note-${contact.id}`}
          >
            <PenTool className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span className="sr-only">Take Note</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Take a note</p>
        </TooltipContent>
      </Tooltip>

      {/* AI Dialogs */}
      <ContactAIInsightsDialog
        open={aiInsightsOpen}
        onOpenChange={setAiInsightsOpen}
        insights={aiInsights}
        isLoading={askAIMutation.isPending}
        contactName={contact.displayName}
      />

      <ContactEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        emailSuggestion={emailSuggestion}
        isLoading={generateEmailMutation.isPending}
        contactName={contact.displayName}
        contactEmail={contact.primaryEmail}
      />

      <ContactNoteSuggestionsDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        suggestions={noteSuggestions}
        isLoading={generateNotesMutation.isPending}
        contactId={contact.id}
        contactName={contact.displayName}
      />

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Note to {contact.displayName}</DialogTitle>
            <DialogDescription>
              Add a new note to track interactions or observations about this contact.
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

export const contactsColumns: ColumnDef<ContactWithNotes>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all contacts"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select contact"
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
      const contact = row.original;
      const initials = getInitials(contact.displayName);

      return (
        <Avatar className="size-8" data-testid={`contact-avatar-${contact.id}`}>
          <AvatarImage
            src={`/api/contacts/${contact.id}/avatar`}
            alt={`${contact.displayName} avatar`}
          />
          <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
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
    cell: ({ row }) => {
      const name = row.getValue("displayName") as string;
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    id: "aiActions",
    header: "Actions",
    cell: ({ row }) => {
      const contact = row.original;
      return <ContactAIActions contact={contact} />;
    },
    size: 140,
  },
  {
    accessorKey: "primaryEmail",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("primaryEmail") as string;
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
      const phone = row.getValue("primaryPhone") as string;
      return phone ? (
        <span className="text-muted-foreground">{phone}</span>
      ) : (
        <span className="text-muted-foreground italic">No phone</span>
      );
    },
  },
  {
    accessorKey: "notesCount",
    header: "Notes",
    cell: ({ row }) => {
      const count = (row.getValue("notesCount") as number) || 0;
      const lastNote = row.original.lastNote;
      const contact = row.original;

      return (
        <NotesHoverCard
          contactId={contact.id}
          contactName={contact.displayName}
          notesCount={count}
          lastNote={lastNote}
          data-testid={`notes-hover-card-${contact.id}`}
        />
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
    header: "Stage",
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string;
      const getStageColor = (stage: string): string => {
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
    accessorKey: "notes",
    header: "AI Insights",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string;
      const confidence = row.original.confidenceScore;
      return notes ? (
        <div className="max-w-60">
          <span className="text-sm text-muted-foreground truncate block">{notes}</span>
          {confidence && (
            <span className="text-xs text-muted-foreground">
              Confidence: {Math.round(parseFloat(confidence) * 100)}%
            </span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground italic text-sm">No insights</span>
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
      const contact = row.original;
      return <ContactActionsCell contact={contact} />;
    },
  },
];

function ContactActionsCell({ contact }: { contact: ContactWithNotes }): JSX.Element {
  const deleteContact = useDeleteContact();

  const handleEditContact = (contact: ContactWithNotes): void => {
    toast.info(`Edit contact functionality for ${contact.displayName} - Coming soon!`);
    // TODO: Open edit contact dialog/form
  };

  const handleDeleteContact = (contact: ContactWithNotes): void => {
    if (
      confirm(
        `Are you sure you want to delete ${contact.displayName}? This action cannot be undone.`,
      )
    ) {
      deleteContact.mutate(contact.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          data-testid={`contact-actions-${contact.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-testid={`edit-contact-${contact.id}`}
          onClick={() => handleEditContact(contact)}
        >
          <Edit className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          Edit Contact
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid={`add-note-${contact.id}`}
          onClick={() => {
            // This should open the add note dialog for this specific contact
            // Since this is outside the ContactAIActions component, we'll need to implement this differently
            toast.info(
              `Add note for ${contact.displayName} - Use the note icon in the Actions column`,
            );
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </DropdownMenuItem>
        <DropdownMenuItem data-testid={`view-notes-${contact.id}`}>
          <MessageSquare className="h-4 w-4 mr-2" />
          View Notes
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          data-testid={`delete-contact-${contact.id}`}
          onClick={() => handleDeleteContact(contact)}
        >
          <Trash2 className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
