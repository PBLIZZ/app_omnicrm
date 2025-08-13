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
import { createContact, type CreateContactInput } from "./api";

export type NewContactInput = {
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  tags: string[];
  notes?: string;
};

export type CreatedContact = {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated?: ((contact: CreatedContact) => void) | undefined;
}

export function NewContactDialog({ open, onOpenChange, onContactCreated }: Props) {
  const [form, setForm] = useState<NewContactInput>({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
    tags: [],
    notes: "",
  });
  const [rawTags, setRawTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Smooth reset with a small delay to avoid flashing
    const timer = setTimeout(() => {
      setForm({ displayName: "", primaryEmail: "", primaryPhone: "", tags: [], notes: "" });
      setRawTags("");
      setErrors({});
      setSubmitting(false);
      setSuccess(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [open]);

  const parsedTags = useMemo(
    () =>
      rawTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [rawTags],
  );

  function validate(input: NewContactInput): Record<string, string> {
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
    const payload: NewContactInput = { ...form, tags: parsedTags };
    const nextErrors = validate(payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const contactInput: CreateContactInput = {
        displayName: payload.displayName.trim(),
        primaryEmail: payload.primaryEmail?.trim() || null,
        primaryPhone: payload.primaryPhone?.trim() || null,
        tags: payload.tags,
        notes: payload.notes?.trim() || null,
        source: "manual",
      };
      const createdContact = await createContact(contactInput);
      const created: CreatedContact = {
        id: createdContact.id,
        displayName: createdContact.displayName,
        ...(createdContact.primaryEmail ? { primaryEmail: createdContact.primaryEmail } : {}),
        ...(createdContact.primaryPhone ? { primaryPhone: createdContact.primaryPhone } : {}),
        createdAt: createdContact.createdAt,
      };
      setSuccess(true);
      onContactCreated?.(created);
      toast.success("Contact created", { description: `${created.displayName} has been added.` });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create contact", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="new-contact-title"
        aria-describedby="new-contact-description"
      >
        <DialogHeader>
          <DialogTitle id="new-contact-title">Add New Contact</DialogTitle>
          <DialogDescription id="new-contact-description">
            Create a new contact. Only the name is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nc-name">Full Name *</Label>
            <Input
              id="nc-name"
              value={form.displayName}
              onChange={(e) => {
                setForm({ ...form, displayName: e.target.value });
                if (errors["displayName"]) {
                  const otherErrors = { ...errors };
                  delete otherErrors["displayName"];
                  setErrors(otherErrors);
                }
              }}
              aria-invalid={errors["displayName"] ? "true" : "false"}
              aria-describedby={errors["displayName"] ? "nc-name-error" : undefined}
              required
              autoFocus
              disabled={submitting}
              placeholder="Enter full name"
            />
            {errors["displayName"] && (
              <p id="nc-name-error" className="text-sm text-destructive" role="alert">
                {errors["displayName"]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-email">Email</Label>
            <Input
              id="nc-email"
              type="email"
              value={form.primaryEmail ?? ""}
              onChange={(e) => {
                setForm({ ...form, primaryEmail: e.target.value });
                if (errors["primaryEmail"]) {
                  const otherErrors = { ...errors };
                  delete otherErrors["primaryEmail"];
                  setErrors(otherErrors);
                }
              }}
              aria-invalid={errors["primaryEmail"] ? "true" : "false"}
              aria-describedby={errors["primaryEmail"] ? "nc-email-error" : undefined}
              placeholder="email@example.com"
              disabled={submitting}
            />
            {errors["primaryEmail"] && (
              <p id="nc-email-error" className="text-sm text-destructive" role="alert">
                {errors["primaryEmail"]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-phone">Phone</Label>
            <Input
              id="nc-phone"
              type="tel"
              value={form.primaryPhone ?? ""}
              onChange={(e) => {
                setForm({ ...form, primaryPhone: e.target.value });
                if (errors["primaryPhone"]) {
                  const otherErrors = { ...errors };
                  delete otherErrors["primaryPhone"];
                  setErrors(otherErrors);
                }
              }}
              aria-invalid={errors["primaryPhone"] ? "true" : "false"}
              aria-describedby={errors["primaryPhone"] ? "nc-phone-error" : undefined}
              placeholder="+44 20 7123 4567"
              disabled={submitting}
            />
            {errors["primaryPhone"] && (
              <p id="nc-phone-error" className="text-sm text-destructive" role="alert">
                {errors["primaryPhone"]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-tags">Tags</Label>
            <Input
              id="nc-tags"
              value={rawTags}
              onChange={(e) => setRawTags(e.target.value)}
              placeholder="client, lead, referral"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {parsedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-notes">Notes</Label>
            <Textarea
              id="nc-notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="resize-none"
              disabled={submitting}
              placeholder="Additional notes about this contact..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting || success}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || success || !form.displayName.trim()}>
              {success ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  Created!
                </>
              ) : submitting ? (
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
                  Creating…
                </>
              ) : (
                "Create Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isValidEmail(input: string): boolean {
  // Simple RFC 5322-ish email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isValidPhone(input: string): boolean {
  // E.164-ish / common separators allowed
  return /^[+()\d][\d\s().-]{6,}$/.test(input);
}
