"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Search clients, tasks, notes..." className="w-full" autoFocus />
          <div className="text-sm text-muted-foreground">
            Start typing to search across your wellness practice...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
