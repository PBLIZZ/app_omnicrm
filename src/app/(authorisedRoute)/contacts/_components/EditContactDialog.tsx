"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import type { Contact, EditContactData, UpdateContactResponse } from "./types";
import { UpdateContactBodySchema } from "@/server/db/business-schemas/contacts";
import { z } from "zod";

// Form validation schema - inline
const formSchema = UpdateContactBodySchema.extend({
  confirmEmail: z.string().email().optional(),
}).refine(
  (data) => {
    if (data.confirmEmail && data.primaryEmail) {
      return data.confirmEmail === data.primaryEmail;
    }
    return true;
  },
  { message: "Email addresses must match", path: ["confirmEmail"] },
);

interface EditContactDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edit Contact Dialog Component
 * Provides form to edit existing contact information
 */
export function EditContactDialog({
  contact,
  open,
  onOpenChange,
}: EditContactDialogProps): JSX.Element {
  const [formData, setFormData] = useState<{
    displayName: string;
    primaryEmail: string;
    primaryPhone: string;
  }>({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
  });
  const [confirmEmail, setConfirmEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const queryClient = useQueryClient();

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        displayName: contact.displayName || "",
        primaryEmail: contact.primaryEmail || "",
        primaryPhone: contact.primaryPhone || "",
      });
      setConfirmEmail("");
      setFormErrors({});
    }
  }, [contact]);

  // Update contact mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: EditContactData): Promise<UpdateContactResponse> => {
      if (!contact) throw new Error("No contact to update");

      const updateData = {
        displayName: data.displayName?.trim() ?? "",
        primaryEmail: data.primaryEmail?.trim() || null,
        primaryPhone: data.primaryPhone?.trim() || null,
      };

      return apiClient.put<UpdateContactResponse>(`/api/contacts/${contact.id}`, updateData);
    },
    onSuccess: (response) => {
      const updatedContact = response.data;
      toast.success(`${updatedContact?.displayName ?? "Contact"} updated successfully`);

      // Invalidate and refetch contact data using centralized query keys
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      if (contact?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contact.id) });
      }

      // Close dialog
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      console.error("Update contact error:", error);

      // Handle validation errors
      const errorWithDetails = error as {
        details?: Array<{ path?: string[]; message?: string }>;
        message?: string;
      };
      if (errorWithDetails?.details && Array.isArray(errorWithDetails.details)) {
        const fieldErrors: Record<string, string[]> = {};
        errorWithDetails.details.forEach((err) => {
          if (err.path && err.message) {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
          }
        });
        setFormErrors(fieldErrors);
      } else {
        toast.error(errorWithDetails?.message || "Failed to update contact");
      }
    },
  });

  const handleSubmit = (): void => {
    // Validate
    const validation = formSchema.safeParse({
      displayName: formData.displayName || undefined,
      primaryEmail: formData.primaryEmail || null,
      primaryPhone: formData.primaryPhone || null,
      confirmEmail: confirmEmail || undefined,
    });

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path.join(".");
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      setFormErrors(errors);
      return;
    }

    // Extract only API fields
    const { confirmEmail: _unused, ...apiData } = validation.data;
    updateClientMutation.mutate(apiData as EditContactData);
  };

  const handleCancel = (): void => {
    if (contact) {
      setFormData({
        displayName: contact.displayName || "",
        primaryEmail: contact.primaryEmail || "",
        primaryPhone: contact.primaryPhone || "",
      });
    }
    setConfirmEmail("");
    setFormErrors({});
    onOpenChange(false);
  };

  const updateField = (
    field: "displayName" | "primaryEmail" | "primaryPhone",
    value: string,
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!contact) return <></>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {contact.displayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="Enter contact name"
              value={formData.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              className={formErrors["displayName"] ? "border-red-500" : ""}
              disabled={updateClientMutation.isPending}
            />
            {formErrors["displayName"] && (
              <p className="text-sm text-red-500">{formErrors["displayName"][0]}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="Enter email address"
              value={formData.primaryEmail}
              onChange={(e) => updateField("primaryEmail", e.target.value)}
              className={formErrors["primaryEmail"] ? "border-red-500" : ""}
              disabled={updateClientMutation.isPending}
            />
            {formErrors["primaryEmail"] && (
              <p className="text-sm text-red-500">{formErrors["primaryEmail"][0]}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              placeholder="Enter phone number"
              value={formData.primaryPhone}
              onChange={(e) => updateField("primaryPhone", e.target.value)}
              className={formErrors["primaryPhone"] ? "border-red-500" : ""}
              disabled={updateClientMutation.isPending}
            />
            {formErrors["primaryPhone"] && (
              <p className="text-sm text-red-500">{formErrors["primaryPhone"][0]}</p>
            )}
          </div>

          {/* Confirm Email Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-confirm-email">Confirm Email</Label>
            <Input
              id="edit-confirm-email"
              type="email"
              placeholder="Re-enter email address"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                // Clear field error when user starts typing
                if (formErrors["confirmEmail"]) {
                  setFormErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors["confirmEmail"];
                    return newErrors;
                  });
                }
              }}
              className={formErrors["confirmEmail"] ? "border-red-500" : ""}
              disabled={updateClientMutation.isPending}
            />
            {formErrors["confirmEmail"] && (
              <p className="text-sm text-red-500">{formErrors["confirmEmail"][0]}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
