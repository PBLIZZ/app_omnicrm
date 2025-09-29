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
import { Users, Brain, Sparkles, Search, Plus, Calendar, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStreamingEnrichment } from "@/hooks/use-streaming-enrichment";

// Enhanced components
import { ContactsTable } from "./contacts-table";
import { contactsColumns } from "./contacts-columns";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useEnhancedContacts, useContactsuggestions } from "@/hooks/use-contacts";
import type { ContactWithNotes, ContactSuggestion, ContactQuickAddData } from "./types";

/**
 * ContactsPage - Main Contact Component
 * Handles all interactive functionality for contact management
 * Replaces the old contacts page with wellness-focused terminology
 */
export function ContactsPage(): JSX.Element {
  // Enhanced System State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newContact, setNewContact] = useState<ContactQuickAddData>({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
    source: "manual",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Enhanced System Queries using OmniClient endpoints
  const { data: enhancedClientsData, isLoading: enhancedLoading } =
    useEnhancedContacts(searchQuery);

  const enhancedClients: ContactWithNotes[] = useMemo(
    () => enhancedClientsData?.items ?? [],
    [enhancedClientsData?.items],
  );

  const filteredContacts = useMemo((): ContactWithNotes[] => {
    if (!searchQuery.trim()) return enhancedClients;
    const query = searchQuery.toLowerCase();
    return enhancedClients.filter(
      (client) =>
        (client.displayName?.toLowerCase().includes(query) ?? false) ||
        (client.primaryEmail?.toLowerCase().includes(query) ?? false) ||
        (client.primaryPhone?.toLowerCase().includes(query) ?? false),
    );
  }, [enhancedClients, searchQuery]);

  // OmniClient suggestions query using OmniClient endpoints
  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useContactsuggestions(showSuggestions);

  const suggestions: ContactSuggestion[] = suggestionsData?.suggestions ?? [];

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

  // Handle addClient URL parameter from sidebar
  useEffect(() => {
    const addClient = searchParams.get("addClient");
    if (addClient === "true") {
      setIsAddingContact(true);
      // Clear the parameter from URL to avoid reopening on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("addClient");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  // Streaming enrichment hook
  const streamingEnrichment = useStreamingEnrichment();

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
      void queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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
    // Simple validation without complex error mapping
    if (!newContact.displayName.trim()) {
      setFormErrors({ displayName: ["Name is required"] });
      toast({
        title: "Validation Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    if (
      newContact.primaryEmail &&
      newContact.primaryEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.primaryEmail.trim())
    ) {
      setFormErrors({ primaryEmail: ["Please enter a valid email address"] });
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Clear any previous errors
    setFormErrors({});

    try {
      const contactData = {
        displayName: newContact.displayName.trim(),
        primaryEmail: newContact.primaryEmail?.trim() || null,
        primaryPhone: newContact.primaryPhone?.trim() || null,
      };

      await apiClient.post("/api/contacts", contactData);

      await queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsAddingContact(false);
      setNewContact({ displayName: "", primaryEmail: "", primaryPhone: "", source: "manual" });
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
    const variants = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return variants[confidence as keyof typeof variants] || variants.low;
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
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-contacts"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => streamingEnrichment.startEnrichment()}
            disabled={streamingEnrichment.isRunning}
            data-testid="enrich-contacts-button"
          >
            <Brain className="h-4 w-4 mr-2" />
            {streamingEnrichment.isRunning
              ? `Enriching... ${streamingEnrichment.enrichedCount}/${streamingEnrichment.totalContacts}`
              : "AI Enrich All"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSuggestions(!showSuggestions)}
            data-testid="smart-suggestions-button"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Suggestions
          </Button>
        </div>

        {/* Enrichment Progress */}
        {streamingEnrichment.isRunning && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Enriching Contacts with AI
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {Math.round(streamingEnrichment.progress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${streamingEnrichment.progress}%` }}
              />
            </div>
            {streamingEnrichment.currentContact && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Currently enriching: {streamingEnrichment.currentContact}
              </p>
            )}
          </div>
        )}

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
                              <span className="truncate">{suggestion.primaryEmail}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{suggestion.calendarEvents?.length ?? 0} events</span>
                          </div>
                        </div>

                        {suggestion.calendarEvents && suggestion.calendarEvents.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span>Recent events: </span>
                            <span>{suggestion.calendarEvents.slice(0, 2).map(e => e.title).join(", ")}</span>
                            {suggestion.calendarEvents.length > 2 && (
                              <span> +{suggestion.calendarEvents.length - 2} more</span>
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

      {/* Enhanced Contacts Table */}
      <Card className="transition-all duration-700 ease-in-out">
        <CardContent>
          <div className="space-y-4">
            {/* Toolbar - now empty since buttons moved to table header */}
            <div className="hidden"></div>

            {/* Enhanced Table */}
            {enhancedLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading contact intelligence...</div>
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
            {enhancedContacts.length > 0 && (
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
