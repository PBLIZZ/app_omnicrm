"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateContact } from "@/components/contacts/api";

export type EditableContact = {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EditableContact;
  onContactUpdated?: (contact: EditableContact) => void;
}

export function ContactEditDialog({ open, onOpenChange, contact, onContactUpdated }: Props) {
  const [form, setForm] = useState<EditableContact>(contact);
  const [rawTags, setRawTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(contact);
    setRawTags((contact.tags || []).join(", "));
    setErrors({});
  }, [open, contact]);

  const parsedTags = useMemo(
    () =>
      rawTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [rawTags],
  );

  const hasChanges = useMemo(() => {
    // Efficient shallow comparison instead of expensive JSON.stringify
    if (form.displayName !== contact.displayName) return true;
    if (form.primaryEmail !== contact.primaryEmail) return true;
    if (form.primaryPhone !== contact.primaryPhone) return true;
    if ((form.notes || "") !== (contact.notes || "")) return true;

    // Compare tags arrays
    const contactTags = contact.tags || [];
    if (parsedTags.length !== contactTags.length) return true;
    for (let i = 0; i < parsedTags.length; i++) {
      if (parsedTags[i] !== contactTags[i]) return true;
    }

    return false;
  }, [
    contact.displayName,
    contact.primaryEmail,
    contact.primaryPhone,
    contact.notes,
    contact.tags,
    form.displayName,
    form.primaryEmail,
    form.primaryPhone,
    form.notes,
    parsedTags,
  ]);

  function validate(input: EditableContact): Record<string, string> {
    const next: Record<string, string> = {};
    if (!input.displayName.trim()) next["displayName"] = "Name is required";
    if (input.primaryEmail && !isValidEmail(input.primaryEmail))
      next["primaryEmail"] = "Enter a valid email";
    if (input.primaryPhone && !isValidPhone(input.primaryPhone))
      next["primaryPhone"] = "Enter a valid phone number";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: EditableContact = { ...form, tags: parsedTags };
    const nextErrors = validate(payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateContact(contact.id, {
        displayName: payload.displayName,
        primaryEmail: payload.primaryEmail ?? null,
        primaryPhone: payload.primaryPhone ?? null,
        tags: parsedTags,
        notes: payload.notes ?? null,
      });
      const updatedContact: EditableContact = {
        id: updated.id,
        displayName: updated.displayName,
        primaryEmail: updated.primaryEmail ?? undefined,
        primaryPhone: updated.primaryPhone ?? undefined,
        tags: parsedTags,
        notes: payload.notes ?? "",
        createdAt: updated.createdAt,
      };
      onContactUpdated?.(updatedContact);
      onOpenChange(false);
      toast.success("Contact updated", { description: `${updated.displayName} saved.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to update contact", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDismiss(nextOpen: boolean) {
    if (nextOpen) return onOpenChange(true);
    if (hasChanges) {
      const ok = window.confirm("You have unsaved changes. Discard them?");
      if (!ok) return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="edit-contact-title"
        aria-describedby="edit-contact-description"
      >
        <DialogHeader>
          <DialogTitle id="edit-contact-title">Edit Contact</DialogTitle>
          <DialogDescription id="edit-contact-description">
            Update contact information and preferences.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ec-name">Full Name *</Label>
              <Input
                id="ec-name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                aria-invalid={errors["displayName"] ? "true" : "false"}
                aria-describedby={errors["displayName"] ? "ec-name-error" : undefined}
                required
              />
              {errors["displayName"] && (
                <p id="ec-name-error" className="text-sm text-destructive">
                  {errors["displayName"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ec-email">Email</Label>
              <Input
                id="ec-email"
                type="email"
                value={form.primaryEmail ?? ""}
                onChange={(e) => setForm({ ...form, primaryEmail: e.target.value })}
                aria-invalid={errors["primaryEmail"] ? "true" : "false"}
                aria-describedby={errors["primaryEmail"] ? "ec-email-error" : undefined}
                placeholder="email@example.com"
              />
              {errors["primaryEmail"] && (
                <p id="ec-email-error" className="text-sm text-destructive">
                  {errors["primaryEmail"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ec-phone">Phone</Label>
              <Input
                id="ec-phone"
                type="tel"
                value={form.primaryPhone ?? ""}
                onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}
                aria-invalid={errors["primaryPhone"] ? "true" : "false"}
                aria-describedby={errors["primaryPhone"] ? "ec-phone-error" : undefined}
                placeholder="+44 20 7123 4567"
              />
              {errors["primaryPhone"] && (
                <p id="ec-phone-error" className="text-sm text-destructive">
                  {errors["primaryPhone"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ec-tags">Tags</Label>
              <Input
                id="ec-tags"
                value={rawTags}
                onChange={(e) => setRawTags(e.target.value)}
                placeholder="client, lead, referral"
              />
              <p className="text-xs text-muted-foreground">Separate tags with commas</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ec-notes">Notes</Label>
            <Textarea
              id="ec-notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {hasChanges ? "Unsaved changes" : "No changes"}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDismiss(false)}
                  disabled={submitting}
                >
                  {hasChanges ? "Discard" : "Close"}
                </Button>
                <Button type="submit" disabled={submitting || !hasChanges}>
                  {submitting ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isValidPhone(input: string): boolean {
  return /^[+()\d][\d\s().-]{6,}$/.test(input);
}
