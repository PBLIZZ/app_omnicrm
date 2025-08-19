"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InteractionTimeline } from "../_components/InteractionTimeline";
import { AIInsightsSection } from "../_components/AIInsightsSection";
import { ContactEditDialog } from "../_components/ContactEditDialog";
import { fetchContact } from "@/components/contacts/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ContactDetail {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  source?: string;
  createdAt: string;
  interactionCount: number;
  lastInteractionAt?: string;
}

export default function ContactDetailPage(): JSX.Element {
  const params = useParams();
  const contactId = String((params as Record<string, string | string[]>)?.["id"] ?? "");
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    void (async (): Promise<void> => {
      setLoading(true);
      try {
        const contactData = await fetchContact(contactId);
        if (isMounted) {
          setContact({
            id: contactData.id,
            displayName: contactData.displayName,
            ...(contactData.primaryEmail ? { primaryEmail: contactData.primaryEmail } : {}),
            ...(contactData.primaryPhone ? { primaryPhone: contactData.primaryPhone } : {}),
            source: "manual", // Add source field if needed
            createdAt: contactData.createdAt,
            interactionCount: 0, // This might need to come from a separate API call
          });
        }
      } catch (error) {
        if (isMounted) {
          logger.error("Failed to fetch contact", error, "ContactDetailPage");
          toast.error("Failed to load contact", {
            description: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return (): void => {
      isMounted = false;
      controller.abort();
    };
  }, [contactId]);

  if (loading || !contact) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading contact…</CardTitle>
            <CardDescription>Please wait</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-24 bg-muted rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{contact.displayName}</span>
            <div className="flex gap-2">
              {contact.primaryEmail && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${contact.primaryEmail}`}>Email</a>
                </Button>
              )}
              {contact.primaryPhone && (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${contact.primaryPhone}`}>Call</a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button asChild size="sm">
                <Link href="/contacts">Back</Link>
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Added {new Date(contact.createdAt).toLocaleDateString("en-GB")} •{" "}
            {contact.interactionCount} interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <InteractionTimeline contactId={contact.id} />
            </div>
            <div className="space-y-6">
              <AIInsightsSection contactId={contact.id} />
            </div>
          </div>
        </CardContent>
      </Card>
      <ContactEditDialog
        open={editing}
        onOpenChange={setEditing}
        contact={{
          id: contact.id,
          displayName: contact.displayName,
          ...(contact.primaryEmail ? { primaryEmail: contact.primaryEmail } : {}),
          ...(contact.primaryPhone ? { primaryPhone: contact.primaryPhone } : {}),
          tags: [],
          notes: "",
          createdAt: contact.createdAt,
        }}
        onContactUpdated={(c): void => {
          setContact((prev) =>
            prev
              ? {
                  ...prev,
                  displayName: c.displayName,
                  ...(c.primaryEmail !== undefined ? { primaryEmail: c.primaryEmail } : {}),
                  ...(c.primaryPhone !== undefined ? { primaryPhone: c.primaryPhone } : {}),
                }
              : prev,
          );
        }}
      />
    </div>
  );
}
