"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { NewContactDialog } from "@/components/contacts/NewContactDialog";
import { useState } from "react";
import type { CreatedContact } from "@/components/contacts/NewContactDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface Props {
  searchQuery: string;
  onSearch: (value: string) => void;
  onNewContact?: () => void;
  onContactCreated?: ((contact: CreatedContact) => void) | undefined;
  selectedCount?: number;
  totalCount?: number;
  onBulkActionEmail?: (() => void) | undefined;
  onBulkActionTag?: (() => void) | undefined;
  onBulkActionExport?: (() => void) | undefined;
  onBulkActionDelete?: (() => void) | undefined;
  onImportCsv?: ((file: File) => void) | undefined;
  onExportCsv?: (() => void) | undefined;
  onSyncNow?: (() => void) | undefined;
}

export function ContactListHeader(props: Props) {
  const {
    searchQuery,
    onSearch,
    selectedCount = 0,
    totalCount = 0,
    onNewContact,
    onContactCreated,
    onBulkActionEmail,
    onBulkActionTag,
    onBulkActionExport,
    onBulkActionDelete,
    onImportCsv,
    onExportCsv,
    onSyncNow,
  } = props;
  const [openNew, setOpenNew] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Contacts</h1>
            {totalCount > 0 && (
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-medium">
                {totalCount}
              </span>
            )}
          </div>
          <CardDescription>Search, filter and manage your contacts.</CardDescription>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative">
            <Input
              placeholder="Search contacts…"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full lg:w-80"
              aria-label="Search contacts"
              ref={searchRef}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => (onNewContact ? onNewContact() : setOpenNew(true))}
              size="sm"
              aria-label="Create new contact"
            >
              New Contact
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="More actions" aria-haspopup="menu">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (onExportCsv) {
                      onExportCsv();
                    } else {
                      toast.info("Export feature", {
                        description: "Contact export functionality will be available soon.",
                      });
                    }
                  }}
                >
                  Export Contacts
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (onSyncNow) {
                      onSyncNow();
                    } else {
                      toast.info("Sync feature", {
                        description: "Google Contacts sync will be available soon.",
                      });
                    }
                  }}
                >
                  Sync Now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (onImportCsv) {
                    onImportCsv(f);
                  } else {
                    toast.info("Import feature", {
                      description: `Ready to import ${f.name}. This feature will be available soon.`,
                    });
                  }
                  e.currentTarget.value = "";
                }
              }}
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/sync">Connect Google</Link>
            </Button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="border-t bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{selectedCount} selected</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onBulkActionEmail}>
                Send Email
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkActionTag}>
                Add Tags
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkActionExport}>
                Export
              </Button>
              <Button size="sm" variant="destructive" onClick={onBulkActionDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      <NewContactDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onContactCreated={onContactCreated as ((contact: CreatedContact) => void) | undefined}
      />
    </div>
  );
}
