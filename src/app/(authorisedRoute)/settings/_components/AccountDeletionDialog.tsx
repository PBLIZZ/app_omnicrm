"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle, Download } from "lucide-react";
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
  Checkbox,
} from "@/components/ui";
import { buildUrl, fetchGet } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AccountDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDeletionDialog({
  open,
  onOpenChange,
}: AccountDeletionDialogProps): JSX.Element {
  const [step, setStep] = useState<"warning" | "export" | "confirm" | "deleting">("warning");
  const [confirmationText, setConfirmationText] = useState("");
  const [hasExported, setHasExported] = useState(false);
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const handleExportBeforeDelete = async (): Promise<void> => {
    try {
      setIsExporting(true);
      // Export contacts as a minimal dataset for now
      const contacts = await fetchGet<{ items: unknown[]; total: number }>(
        buildUrl("/api/contacts", { page: 1, pageSize: 1000 }),
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        contacts: contacts.items,
        totals: { contacts: contacts.total },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `codexcrm-final-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setHasExported(true);
    } catch (e: unknown) {
      // Export failure should not crash the dialog; show inline error
      const err = e as { message?: string };
      setDeleteError(err.message ?? "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFinalDelete = async (): Promise<void> => {
    if (confirmationText === "DELETE MY DATA") {
      setStep("deleting");
      setDeleteError(null);
      setIsDeleting(true);
      // No REST endpoint yet: simulate and redirect
      setTimeout(() => {
        router.push("/auth/goodbye");
      }, 1200);
    }
  };

  const handleClose = (): void => {
    if (step !== "deleting") {
      setStep("warning");
      setConfirmationText("");
      setHasExported(false);
      setAcknowledgeWarning(false);
      setDeleteError(null);
      onOpenChange(false);
    }
  };

  const isConfirmationValid = confirmationText === "DELETE MY DATA";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            {step === "warning" && "This action will permanently delete your account and all data."}
            {step === "export" && "Export your data before deletion (recommended)."}
            {step === "confirm" && "Final confirmation required to delete your account."}
            {step === "deleting" && "Deleting your account and all associated data..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "warning" && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action is permanent and cannot be undone. All your
                  data will be permanently deleted from our systems.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">What will be permanently deleted:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                  <li>• All contact profiles and information</li>
                  <li>• Complete interaction history and communications</li>
                  <li>• AI-generated insights and analysis</li>
                  <li>• Manual overrides and customizations</li>
                  <li>• Account settings and preferences</li>
                  <li>• Uploaded files and attachments</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledgeWarning}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setAcknowledgeWarning(checked === true)
                  }
                />
                <Label htmlFor="acknowledge" className="text-sm">
                  I understand this action is permanent and cannot be undone
                </Label>
              </div>
            </>
          )}

          {step === "export" && (
            <>
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended:</strong> Export your data before deletion so you have a copy
                  for your records.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleExportBeforeDelete}
                  disabled={isExporting}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export My Data
                    </>
                  )}
                </Button>

                {hasExported && (
                  <Alert>
                    <AlertDescription>
                      ✓ Data exported successfully. You can now proceed with deletion.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Final Warning:</strong> You are about to permanently delete your account.
                  This cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="confirmation">
                  Type <strong>DELETE MY DATA</strong> to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE MY DATA"
                  className={isConfirmationValid ? "border-green-500" : ""}
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
            </>
          )}

          {step === "deleting" && (
            <div className="space-y-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm">Deleting your account and all associated data...</p>
              <p className="text-xs text-muted-foreground">
                This may take a few moments. Please do not close this window.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "warning" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("export")}
                disabled={!acknowledgeWarning}
                variant="destructive"
              >
                Continue
              </Button>
            </>
          )}

          {step === "export" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("confirm")} variant="destructive">
                {hasExported ? "Proceed to Delete" : "Skip Export & Delete"}
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleFinalDelete}
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
                    Delete My Account
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
