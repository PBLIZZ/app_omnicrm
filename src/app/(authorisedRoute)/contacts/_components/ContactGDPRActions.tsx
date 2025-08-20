"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { fetchDelete } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ContactGDPRActionsProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function ContactGDPRActions({
  contactId,
  contactName,
  open,
  onOpenChange,
  onDeleted,
}: ContactGDPRActionsProps): JSX.Element {
  const [confirmationText, setConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const handleDelete = async (): Promise<void> => {
    if (confirmationText !== "DELETE CONTACT DATA") return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await fetchDelete<{ deleted: number }>(`/api/contacts/${contactId}`);
      onDeleted?.();
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDeleteError(err.message ?? "Unknown error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = (): void => {
    if (!isDeleting) {
      setConfirmationText("");
      setDeleteError(null);
      onOpenChange(false);
    }
  };

  const isConfirmationValid = confirmationText === "DELETE CONTACT DATA";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Contact Data (GDPR)
          </DialogTitle>
          <DialogDescription>
            Permanently delete all data for <strong>{contactName}</strong> in compliance with GDPR
            data subject access requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action is permanent and cannot be undone. All data
              related to this contact will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium">What will be permanently deleted:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground pl-4">
              <li>• Contact profile and personal information</li>
              <li>• All interaction history and communications</li>
              <li>• AI-generated insights and analysis for this contact</li>
              <li>• Manual overrides and customizations</li>
              <li>• Associated files and attachments</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmation">
              Type <strong>DELETE CONTACT DATA</strong> to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE CONTACT DATA"
              className={isConfirmationValid ? "border-green-500" : ""}
              disabled={isDeleting}
            />
          </div>

          {deleteError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Deletion failed:</strong> {deleteError}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription>
              <strong>GDPR Compliance:</strong> This deletion is performed in compliance with data
              subject access requests under GDPR Article 17 (Right to Erasure).
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            variant="destructive"
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Contact Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
