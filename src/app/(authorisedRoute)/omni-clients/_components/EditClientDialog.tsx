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
import type { ClientWithNotes } from "./types";
import validator from "validator";

interface EditClientDialogProps {
  client: ClientWithNotes | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditClientData {
  displayName: string;
  primaryEmail: string;
  primaryPhone: string;
}

interface UpdateClientResponse {
  item: ClientWithNotes;
}

/**
 * Edit Client Dialog Component
 * Provides form to edit existing client information
 */
export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: EditClientDialogProps): JSX.Element {
  const [formData, setFormData] = useState<EditClientData>({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const queryClient = useQueryClient();

  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        displayName: client.displayName || "",
        primaryEmail: client.primaryEmail || "",
        primaryPhone: client.primaryPhone || "",
      });
      setFormErrors({});
    }
  }, [client]);

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: EditClientData): Promise<UpdateClientResponse> => {
      if (!client) throw new Error("No client to update");

      const updateData = {
        displayName: data.displayName.trim(),
        primaryEmail: data.primaryEmail.trim() || null,
        primaryPhone: data.primaryPhone.trim() || null,
      };

      return apiClient.put<UpdateClientResponse>(`/api/omni-clients/${client.id}`, updateData);
    },
    onSuccess: (response) => {
      toast.success(`${response.item.displayName} updated successfully`);

      // Invalidate and refetch client data
      queryClient.invalidateQueries({ queryKey: ["/api/omni-clients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/omni-clients/${client?.id}`] });

      // Close dialog
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      console.error("Update client error:", error);

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
        toast.error(errorWithDetails?.message || "Failed to update client");
      }
    },
  });

  const handleSubmit = (): void => {
    // Basic validation
    const errors: Record<string, string[]> = {};

    if (!formData["displayName"].trim()) {
      errors["displayName"] = ["Name is required"];
    }

    if (formData["primaryEmail"].trim() && !validator.isEmail(formData["primaryEmail"].trim())) {
      errors["primaryEmail"] = ["Please enter a valid email address"];
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    updateClientMutation.mutate(formData);
  };

  const handleCancel = (): void => {
    if (client) {
      setFormData({
        displayName: client.displayName || "",
        primaryEmail: client.primaryEmail || "",
        primaryPhone: client.primaryPhone || "",
      });
    }
    setFormErrors({});
    onOpenChange(false);
  };

  const updateField = (field: keyof EditClientData, value: string): void => {
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

  if (!client) return <></>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {client.displayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="Enter client name"
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
