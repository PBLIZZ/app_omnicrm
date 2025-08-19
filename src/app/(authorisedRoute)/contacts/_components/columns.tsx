"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { ArrowUpDown, Bot, Mail, FileText, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteContacts } from "@/components/contacts/api";
import { useState } from "react";

// Minimal local type compatible with the table usage
export type ContactRow = {
  id: string;
  fullName: string;
  lifecycleStage?: string | null;
  tags?: string[];
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  createdAt: Date;
  hasOverrides?: boolean;
};

// Actions cell component that can use hooks
function ActionsCell({ contact }: { contact: ContactRow }): JSX.Element {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleEdit = (): void => {
    router.push(`/contacts/${contact.id}/edit`);
  };

  const handleDelete = async (): Promise<void> => {
    if (
      window.confirm(
        `Are you sure you want to delete ${contact.fullName}? This action cannot be undone.`,
      )
    ) {
      try {
        setIsPending(true);
        await deleteContacts([contact.id]);
        window.location.reload(); // Refresh the page after successful deletion
      } catch (error: unknown) {
        console.error("Error deleting contact:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error details:", {
          message: errorMessage,
          error,
        });
        alert(`Failed to delete contact: ${errorMessage}`);
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent"
        onClick={() => {
          /* TODO: Implement AI chat functionality */
        }}
        title="Chat with AI about this contact"
      >
        <Bot className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent"
        onClick={() => {
          /* TODO: Implement send message functionality */
        }}
        title="Send personalized message"
      >
        <Mail className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent"
        onClick={() => {
          /* TODO: Implement expand notes functionality */
        }}
        title="View notes and AI summary"
      >
        <FileText className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent"
        onClick={handleEdit}
        title="Edit contact"
      >
        <Edit className="h-4 w-4 text-teal-700" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-accent"
        onClick={handleDelete}
        title="Delete contact"
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

// Minimal working columns that match ContactRow DTO structure
export const columns: ColumnDef<ContactRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className="text-foreground"
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        className="text-foreground"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-violet-700/80 h-auto p-0 font-medium"
      >
        Name
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <Link href={`/contacts/${contact.id}`} className="block hover:underline">
          <div className="font-medium">{contact.fullName}</div>
        </Link>
      );
    },
  },
  {
    accessorKey: "lifecycleStage",
    header: () => <div className="text-foreground font-medium">Group</div>,
    cell: ({ row }) => {
      const stage = row.getValue("lifecycleStage") as string | null;
      return stage ? (
        <Badge variant="secondary" className="text-xs">
          {stage}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "tags",
    header: () => <div className="text-foreground font-medium">Tags</div>,
    cell: ({ getValue }) => {
      const tags = (getValue() as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="rounded px-2 py-0.5 text-xs border">
              {t}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "primaryEmail",
    header: () => <div className="text-foreground font-medium">Email</div>,
    cell: ({ row }) => {
      const email = row.getValue("primaryEmail") as string | null;
      return email ? (
        <div className="text-sm">{email}</div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "primaryPhone",
    header: () => <div className="text-foreground font-medium">Phone</div>,
    cell: ({ row }) => {
      const phone = row.getValue("primaryPhone") as string | null;
      return phone ? (
        <div className="text-sm">{phone}</div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-violet-700/80 h-auto p-0 font-medium"
      >
        Created
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => (getValue() as Date).toLocaleDateString(),
  },
  {
    accessorKey: "hasOverrides",
    header: () => <div className="text-foreground font-medium">Manual</div>,
    cell: ({ getValue }) => (getValue() ? "✓" : ""),
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <div className="text-foreground font-medium">Actions</div>,
    cell: ({ row }) => {
      const contact = row.original;
      return <ActionsCell contact={contact} />;
    },
    enableSorting: false,
    enableHiding: false,
  },
];
