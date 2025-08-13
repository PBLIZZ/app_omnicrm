"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Delete",
  isDestructive = true,
  isLoading = false,
}: Props) {
  const [confirmTyped, setConfirmTyped] = useState("");
  const requiresTyping = isDestructive && confirmText.toLowerCase() === "delete";

  const handleConfirm = () => {
    if (requiresTyping && confirmTyped.toLowerCase() !== "delete") {
      return;
    }
    onConfirm();
  };

  const canConfirm = !requiresTyping || confirmTyped.toLowerCase() === "delete";

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmTyped("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <DialogHeader>
          <DialogTitle id="confirm-title">{title}</DialogTitle>
          <DialogDescription id="confirm-description">{description}</DialogDescription>
        </DialogHeader>

        {requiresTyping && (
          <div className="space-y-2">
            <label htmlFor="confirm-input" className="text-sm font-medium">
              Type &quot;delete&quot; to confirm:
            </label>
            <input
              id="confirm-input"
              type="text"
              value={confirmTyped}
              onChange={(e) => setConfirmTyped(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
              placeholder="delete"
              autoFocus
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant={isDestructive ? "destructive" : "default"}
            disabled={isLoading || !canConfirm}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m15.84 7.85 1.06 1.06c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0L12 6.83 8.51 10.32c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41L10.59 5.42c.39-.39 1.02-.39 1.41 0l3.84 2.43z"
                  ></path>
                </svg>
                Deleting…
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
