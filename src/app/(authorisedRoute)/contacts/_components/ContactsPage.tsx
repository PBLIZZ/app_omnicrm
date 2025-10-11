"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
} from "@/components/ui";
import { Users, Sparkles, Plus, Calendar, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContactsTable } from "./contacts-table";
import { contactsColumns } from "./contacts-columns";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { useContacts, useContactSuggestions } from "@/hooks/use-contacts";
import type { ContactWithLastNote, ContactQuickAddData } from "./types";
import { CreateContactBodySchema } from "@/server/db/business-schemas/contacts";
import { z } from "zod";

// Form validation schema - inline, simple
const formSchema = CreateContactBodySchema.extend({
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

/**
 * ContactsPage - Main Contact Component
 * Handles all interactive functionality for contact management
 */
export function ContactsPage(): JSX.Element {
  // Component State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [searchQuery] = useState(""); // Keeping for future global search implementation
  const [newContact, setNewContact] = useState<ContactQuickAddData>({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
    source: "manual",
  });
  const [confirmEmail, setConfirmEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // System Queries using Contact endpoints
  // Fetch all contacts at once (pageSize=3000) for client-side pagination/filtering
  // Uses smart caching (30min staleTime) to minimize API calls
  const { data: contactsData, isLoading } = useContacts(searchQuery, 1, 3000);

  // API returns ContactWithLastNote (has lastNote preview, not full notes array)
  const contacts: ContactWithLastNote[] = useMemo(
    (): ContactWithLastNote[] => contactsData?.items ?? [],
    [contactsData?.items],
  );

  const filteredContacts = useMemo((): ContactWithLastNote[] => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (client) =>
        (client.primaryEmail?.toLowerCase().includes(query) ?? false) ||
        (client.primaryPhone?.toLowerCase().includes(query) ?? false),
    );
  }, [contacts, searchQuery]);

  const { data: suggestions = [], isLoading: suggestionsLoading } =
    useContactSuggestions(showSuggestions);

  // Auto-fade effect when no suggestions found
  useEffect(() => {
    if (!suggestionsLoading && suggestions.length === 0 && showSuggestions && !isDismissed) {
      // Start fade animation after 3 seconds
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3000);

      // Remove component after fade animation completes (3s + 4s = 7s total)
      const removeTimer = setTimeout(() => {
        setShowSuggestions(false);
        setIsFadingOut(false);
        setIsDismissed(false); // Reset for next time
      }, 7000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
    return undefined;
  }, [suggestionsLoading, suggestions.length, showSuggestions, isDismissed]);

  // Handle addContact URL parameter from sidebar
  useEffect(() => {
    const addContact = searchParams.get("addContact");
    if (addContact === "true") {
      setIsAddingContact(true);
      // Clear the parameter from URL to avoid reopening on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("addContact");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  const createClientsMutation = useMutation({
    mutationFn: async (
      suggestionIds: string[],
    ): Promise<{
      success: boolean;
      createdCount: number;
      errors: string[];
    }> => {
      return await apiClient.post<{
        success: boolean;
        createdCount: number;
        errors: string[];
      }>("/api/contacts/suggestions", { suggestionIds });
    },
    onSuccess: (data) => {
      // Invalidate all contacts queries to refetch with new data
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({ queryKey: ["/api/contacts/suggestions"] });
      setSelectedSuggestions([]);
      toast({
        title: "Success",
        description: `Created ${data.createdCount} Contact${data.createdCount === 1 ? "" : "s"} from calendar data`,
      });
      // Log errors for debugging but don't show to user
      if (data.errors?.length > 0) {
        // Errors already shown via toast, no console output needed
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Contacts from suggestions",
        variant: "destructive",
      });
    },
  });

  // Enhanced System Handlers
  const handleAddContact = async (): Promise<void> => {
    // Validate form data
    const validation = formSchema.safeParse({
      displayName: newContact.displayName,
      primaryEmail: newContact.primaryEmail || null,
      primaryPhone: newContact.primaryPhone || null,
      source: newContact.source || "manual",
      confirmEmail: confirmEmail || undefined,
    });

    if (!validation.success) {
      // Map errors
      const errors: Record<string, string[]> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path.join(".");
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      setFormErrors(errors);

      toast({
        title: "Validation Error",
        description: validation.error.issues[0]?.message ?? "Validation failed",
        variant: "destructive",
      });
      return;
    }

    setFormErrors({});

    try {
      // Extract only API fields (no confirmEmail)
      const { confirmEmail: _unused, ...apiData } = validation.data;

      await apiClient.post("/api/contacts", apiData);
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });

      setIsAddingContact(false);
      setNewContact({ displayName: "", primaryEmail: "", primaryPhone: "", source: "manual" });
      setConfirmEmail("");

      toast({
        title: "Success",
        description: "Contact created successfully",
      });
    } catch (error) {
      console.error("Failed to create contact:", error);
      toast({
        title: "Error",
        description: "Failed to create contact",
        variant: "destructive",
      });
    }
  };

  const handleCreateSuggested = (): void => {
    if (selectedSuggestions.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to create",
        variant: "destructive",
      });
      return;
    }

    createClientsMutation.mutate(selectedSuggestions);
  };

  const getConfidenceBadge = (confidence: string): string => {
    const variants: Record<string, string> = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return variants[confidence] ?? variants["low"] ?? "";
  };

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            Contacts Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-powered client relationship management with wellness insights and smart automation
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowSuggestions(!showSuggestions)}
            data-testid="smart-suggestions-button"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Suggestions
          </Button>
        </div>

        <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
          <DialogTrigger asChild>
            <Button data-testid="add-contact-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter contact name"
                  value={newContact.displayName || ""}
                  onChange={(e) => {
                    setNewContact((prev) => ({ ...prev, displayName: e.target.value }));
                    // Clear field error when user starts typing
                    if (formErrors["displayName"]) {
                      setFormErrors((prev) => {
                        const { displayName: _displayName, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  data-testid="contact-name-input"
                  className={formErrors["displayName"] ? "border-red-500" : ""}
                />
                {formErrors["displayName"] && (
                  <p className="text-sm text-red-500">{formErrors["displayName"][0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newContact.primaryEmail || ""}
                  onChange={(e) => {
                    setNewContact((prev) => ({ ...prev, primaryEmail: e.target.value }));
                    // Clear field error when user starts typing
                    if (formErrors["primaryEmail"]) {
                      setFormErrors((prev) => {
                        const { primaryEmail: _primaryEmail, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  data-testid="contact-email-input"
                  className={formErrors["primaryEmail"] ? "border-red-500" : ""}
                />
                {formErrors["primaryEmail"] && (
                  <p className="text-sm text-red-500">{formErrors["primaryEmail"][0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newContact.primaryPhone || ""}
                  onChange={(e) => {
                    setNewContact((prev) => ({ ...prev, primaryPhone: e.target.value }));
                    // Clear field error when user starts typing
                    if (formErrors["primaryPhone"]) {
                      setFormErrors((prev) => {
                        const { primaryPhone: _primaryPhone, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  data-testid="contact-phone-input"
                  className={formErrors["primaryPhone"] ? "border-red-500" : ""}
                />
                {formErrors["primaryPhone"] && (
                  <p className="text-sm text-red-500">{formErrors["primaryPhone"][0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Confirm Email</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  placeholder="Re-enter email address"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    // Clear field error when user starts typing
                    if (formErrors["confirmEmail"]) {
                      setFormErrors((prev) => {
                        const { confirmEmail: _confirmEmail, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  data-testid="contact-confirm-email-input"
                  className={formErrors["confirmEmail"] ? "border-red-500" : ""}
                />
                {formErrors["confirmEmail"] && (
                  <p className="text-sm text-red-500">{formErrors["confirmEmail"][0]}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingContact(false)}
                  data-testid="cancel-add-contact"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddContact} data-testid="save-contact">
                  Add Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smart Suggestions Section */}
      {showSuggestions && (
        <Card
          data-testid="contact-suggestions-section"
          className={`transition-opacity duration-[4000ms] ${isFadingOut ? "opacity-0" : "opacity-100"}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Smart Contact Suggestions
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSuggestions(false);
                  setIsDismissed(true);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              We found people from your calendar events who could be added as contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Analyzing calendar data...</div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No new contacts found in your calendar events</p>
                <p className="text-sm">All attendees may already be in your contact list</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All / Actions */}
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSuggestions.length === suggestions.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSuggestions(suggestions.map((s) => s.id));
                        } else {
                          setSelectedSuggestions([]);
                        }
                      }}
                      data-testid="select-all-suggestions"
                    />
                    <span className="font-medium">
                      Select All ({suggestions.length} suggestions)
                    </span>
                  </div>

                  {selectedSuggestions.length > 0 && (
                    <Button
                      onClick={handleCreateSuggested}
                      disabled={createClientsMutation.isPending}
                      data-testid="create-selected-contacts"
                    >
                      {createClientsMutation.isPending
                        ? "Creating..."
                        : `Create ${selectedSuggestions.length} Contacts`}
                    </Button>
                  )}
                </div>

                {/* Suggestion Cards */}
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`suggestion-${suggestion.id}`}
                    >
                      <Checkbox
                        checked={selectedSuggestions.includes(suggestion.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSuggestions((prev) => [...prev, suggestion.id]);
                          } else {
                            setSelectedSuggestions((prev) =>
                              prev.filter((id) => id !== suggestion.id),
                            );
                          }
                        }}
                        data-testid={`checkbox-${suggestion.id}`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{suggestion.displayName}</h4>
                          <Badge
                            variant="secondary"
                            className={getConfidenceBadge(suggestion.confidence)}
                          >
                            {suggestion.confidence} confidence
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{suggestion.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{suggestion.eventCount ?? 0} events</span>
                          </div>
                        </div>

                        {suggestion.eventTitles && suggestion.eventTitles.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span>Recent events: </span>
                            <span>
                              {suggestion.eventTitles
                                .slice(0, 2)
                                .join(", ")}
                            </span>
                            {suggestion.eventTitles.length > 2 && (
                              <span> +{suggestion.eventTitles.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card className="transition-all duration-700 ease-in-out">
        <CardContent>
          <div className="space-y-4">
            {/* Contacts Table */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading contacts...</div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contacts found</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Add contacts or sync from your calendar to get started"}
                </p>
              </div>
            ) : (
              <ContactsTable columns={contactsColumns} data={filteredContacts} />
            )}

            {/* Stats */}
            {contacts.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span></span>
                <div className="flex items-center gap-4"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
