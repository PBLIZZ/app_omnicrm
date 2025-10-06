"use client";

import { useState } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { NotesHoverCard } from "../[contactId]/notes/[noteId]/_components/NotesHoverCard";
import Link from "next/link";
import { EditContactDialog } from "./EditContactDialog";
import { useDeleteContact } from "@/hooks/use-contacts";
import type { ContactWithLastNote } from "@/server/db/business-schemas/contacts";

// Custom Filter Functions for TanStack Table
const arrayIncludesFilter: FilterFn<ContactWithLastNote> = (row, columnId, filterValue) => {
  if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  const cellValue = row.getValue(columnId) as string | null | undefined;
  if (!cellValue) return false;
  return filterValue.includes(cellValue);
};

export const contactsColumns: ColumnDef<ContactWithLastNote>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all contacts"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select contact ${row.original.displayName || "Unknown"}`}
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

      return (
        <AvatarImage
          src={contact.photoUrl}
          alt={contact.displayName}
          size="sm"
          className="size-8"
          data-testid={`contact-avatar-${contact.id}`}
        />
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
      const contact = row.original;
      const name = row.getValue("displayName") as string;

      const handleContactClick = () => {
        // Set up navigation context in localStorage for Tinder-style browsing
        const allRows = table.getFilteredRowModel().rows;
        const contactIds = allRows.map((r) => r.original.id);
        const currentIndex = allRows.findIndex((r) => r.original.id === contact.id);

        const searchQuery =
          typeof window !== "undefined" && window.location.search.includes("search=")
            ? (new URLSearchParams(window.location.search).get("search") ?? undefined)
            : undefined;

        // Get active filters from table meta
        const tableMeta = table.options.meta as { activeFilters?: unknown } | undefined;
        const filterState = tableMeta?.activeFilters;

        const navigationContext = {
          currentIndex,
          totalItems: contactIds.length,
          contactIds,
          searchQuery,
          filterState, // Include filter state for display in navigation bar
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("contactsNavigationContext", JSON.stringify(navigationContext));
          } catch (error) {
            // Silently handle storage failures (private mode, quota exceeded, etc.)
            console.warn("Failed to persist navigation context:", error);
          }
        }
      };

      return (
        <Link
          href={`/contacts/${contact.id}`}
          onClick={handleContactClick}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          {name ?? "Unknown"}
        </Link>
      );
    },
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
      // Access lastNote preview directly from API response (first 500 chars)
      const lastNote = row.original.lastNote;
      const contact = row.original;

      // Display nothing if no note exists
      if (!lastNote) {
        return null;
      }

      // Display "See note" trigger with hover card showing preview
      return (
        <div className="max-w-[48ch] min-w-0">
          <NotesHoverCard
            contactId={contact.id}
            contactName={contact.displayName ?? "Unknown"}
            data-testid={`notes-hover-card-${contact.id}`}
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors px-3 py-1"
            >
              See note ↑
            </Badge>
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
    accessorKey: "source",
    header: "Source",
    filterFn: arrayIncludesFilter,
    cell: ({ row }) => {
      const source = row.getValue("source") as string | null;
      const formatSource = (source: string | null): string => {
        if (!source) return "Unknown";
        return source
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

      return source ? (
        <span className="text-sm text-muted-foreground">{formatSource(source)}</span>
      ) : (
        <span className="text-muted-foreground italic text-sm">Unknown</span>
      );
    },
    enableHiding: true,
  },
  {
    accessorKey: "lifecycleStage",
    header: "Lifecycle Stage",
    filterFn: arrayIncludesFilter,
    cell: ({ row }) => {
      const stage = row.getValue("lifecycleStage") as string | null;
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

function ContactActionsCell({ contact }: { contact: ContactWithLastNote }): JSX.Element {
  const deleteContact = useDeleteContact();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEditContact = (): void => {
    setEditDialogOpen(true);
  };

  const handleDeleteContact = (): void => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = (): void => {
    deleteContact.mutate(contact.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditContact}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
                data-testid={`edit-contact-${contact.id}`}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit contact</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit contact</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteContact}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                data-testid={`delete-contact-${contact.id}`}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete contact</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete contact</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Edit Contact Dialog */}
      <EditContactDialog contact={contact} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {contact.displayName ?? "Unknown"}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteContact}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? "Deleting..." : "Delete Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
