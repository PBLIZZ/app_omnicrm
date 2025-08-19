"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactListSkeleton } from "@/app/(authorisedRoute)/contacts/_components/ContactListSkeleton";
import { ContactTable } from "@/app/(authorisedRoute)/contacts/_components/ContactTable";
import { useRouter } from "next/navigation";
import { ContactListHeader } from "@/app/(authorisedRoute)/contacts/_components/ContactListHeader";
import { ConfirmDeleteDialog } from "@/app/(authorisedRoute)/contacts/_components/ConfirmDeleteDialog";
import { deleteContacts, fetchContacts, type ContactDTO } from "@/components/contacts/api";
import { logger } from "@/lib/logger";

interface ContactItem {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt: string;
}

export default function ContactsPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const selectedCount = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]).length,
    [rowSelection],
  );
  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection],
  );

  useEffect(() => {
    let isMounted = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = search.trim() ? { search: search.trim() } : {};
        const data = await fetchContacts(params as { search?: string });
        if (isMounted && data && Array.isArray(data.items)) {
          setContacts(
            data.items.map((d: ContactDTO) => ({
              id: d.id,
              displayName: d.displayName,
              ...(d.primaryEmail ? { primaryEmail: d.primaryEmail } : {}),
              ...(d.primaryPhone ? { primaryPhone: d.primaryPhone } : {}),
              createdAt: d.createdAt,
            })),
          );
          setTotalCount(data.total || 0);
        } else if (isMounted) {
          setContacts([]);
          setTotalCount(0);
        }
      } catch (error) {
        logger.error("Failed to fetch contacts", error, "ContactsPage");
        if (isMounted) {
          setContacts([]);
          setTotalCount(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 200);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [search]);

  const handleBulkDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteContacts(selectedIds);
      setContacts((prev) => prev.filter((contact) => !selectedIds.includes(contact.id)));
      setRowSelection({});
      setShowDeleteConfirm(false);
    } catch (error) {
      logger.error("Failed to delete contacts", error, "ContactsPage");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds]);

  const handleImportCsv = useCallback(async (file: File) => {
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
  }, []);

  const handleExportCsv = useCallback(() => {
    // Placeholder export logic
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleContactCreated = useCallback((c: ContactItem) => {
    setContacts((prev) => [c, ...prev]);
  }, []);

  const handleBulkActionEmail = useCallback(() => {
    // placeholder
  }, []);

  const handleBulkActionTag = useCallback(() => {
    // placeholder
  }, []);

  const handleBulkActionExport = useCallback(() => {
    // placeholder
  }, []);

  const handleBulkActionDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleOpenContact = useCallback(
    (id: string) => {
      router.push(`/contacts/${id}`);
    },
    [router],
  );

  // Sync now handler omitted to allow UI to show toast fallback via header

  return (
    <div className="p-0">
      <ContactListHeader
        searchQuery={search}
        onSearch={setSearch}
        onContactCreated={handleContactCreated}
        selectedCount={selectedCount}
        totalCount={totalCount}
        displayedCount={contacts.length}
        onBulkActionEmail={handleBulkActionEmail}
        onBulkActionTag={handleBulkActionTag}
        onBulkActionExport={handleBulkActionExport}
        onBulkActionDelete={handleBulkActionDelete}
        onImportCsv={handleImportCsv}
        onExportCsv={handleExportCsv}
      />
      <div className="m-6">
        <Card className="w-full">
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
                onOpen={handleOpenContact}
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
