"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactListSkeleton } from "@/components/contacts/ContactListSkeleton";
import { ContactTable } from "@/components/contacts/ContactTable";
import { useRouter } from "next/navigation";
import { ContactListHeader } from "@/components/contacts/ContactListHeader";
import {
  ContactFilters,
  ContactFiltersState,
  defaultFilters,
} from "@/components/contacts/ContactFilters";
import { ConfirmDeleteDialog } from "@/components/contacts/ConfirmDeleteDialog";
import { deleteContacts, fetchContacts } from "@/components/contacts/api";

interface ContactItem {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ContactFiltersState>(defaultFilters());
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  useEffect(() => {
    let isMounted = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = search.trim() ? { search: search.trim() } : {};
        const data = await fetchContacts(params as { search?: string });
        if (isMounted)
          setContacts(
            data.items.map((d) => ({
              id: d.id,
              displayName: d.displayName,
              ...(d.primaryEmail ? { primaryEmail: d.primaryEmail } : {}),
              ...(d.primaryPhone ? { primaryPhone: d.primaryPhone } : {}),
              createdAt: d.createdAt,
            })),
          );
      } catch {
        if (isMounted) setContacts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 200);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [search]);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteContacts(selectedIds);
      setContacts((prev) => prev.filter((contact) => !selectedIds.includes(contact.id)));
      setRowSelection({});
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete contacts:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportCsv = async (file: File) => {
    // Placeholder import logic
    try {
      void file;
      // Simulate file processing
      await new Promise((r) => setTimeout(r, 2000));
      // Would parse CSV and create contacts here
      // no-op in placeholder
    } catch {
      // placeholder swallow
    }
  };

  const handleExportCsv = () => {
    // Placeholder export logic
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncNow = async () => {
    // Placeholder sync logic
    try {
      await new Promise((r) => setTimeout(r, 1500));
      // no-op in placeholder
    } catch {
      // placeholder swallow
    }
  };

  return (
    <div className="p-0">
      <ContactListHeader
        searchQuery={search}
        onSearch={setSearch}
        onContactCreated={(c) => {
          setContacts((prev) => [c, ...prev]);
        }}
        selectedCount={selectedCount}
        onBulkActionEmail={() => {
          // placeholder
        }}
        onBulkActionTag={() => {
          // placeholder
        }}
        onBulkActionExport={() => {
          // placeholder
        }}
        onBulkActionDelete={() => {
          setShowDeleteConfirm(true);
        }}
        onImportCsv={handleImportCsv}
        onExportCsv={handleExportCsv}
        onSyncNow={handleSyncNow}
      />
      <div className="m-6 flex gap-6">
        <div className="hidden lg:block w-64 flex-shrink-0 border rounded-md">
          <ContactFilters filters={filters} onChange={setFilters} className="h-full" />
        </div>
        <Card className="flex-1">
          <CardContent>
            {loading ? (
              <ContactListSkeleton />
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="rounded-full bg-muted p-4">📇</div>
                <h3 className="text-lg font-semibold">No contacts yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Import your existing contacts or connect Google to sync automatically.
                </p>
              </div>
            ) : (
              <ContactTable
                data={contacts}
                onOpen={(id) => router.push(`/contacts/${id}`)}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedCount} contact${selectedCount === 1 ? "" : "s"}?`}
        description={`This action cannot be undone. ${selectedCount === 1 ? "This contact" : "These contacts"} will be permanently removed from your CRM.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
