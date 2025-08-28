"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Users, Sparkles, Calendar, Mail, Brain, Download, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStreamingEnrichment } from "@/hooks/use-streaming-enrichment";

// Enhanced components
import { ContactsTable } from "./_components/contacts-table-new";
import { contactsColumns, ContactWithNotes } from "./_components/contacts-columns-new";

import { queryClient } from "@/lib/queryClient";
import { fetchPost } from "@/lib/api";

interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee";
}

export default function ContactsPage(): JSX.Element {
  // Enhanced System State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newContact, setNewContact] = useState({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
  });

  const { toast } = useToast();

  // Enhanced System Queries
  const { data: enhancedContactsData, isLoading: enhancedLoading } = useQuery({
    queryKey: ["/api/contacts-new", searchQuery],
    queryFn: async () => {
      const url = new URL("/api/contacts-new", window.location.origin);
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const json = await response.json();
      // Handle the API envelope { ok, data: { items } }
      return json?.data ?? json;
    },
  });

  const enhancedContacts: ContactWithNotes[] = enhancedContactsData?.contacts || [];
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return enhancedContacts;
    const query = searchQuery.toLowerCase();
    return enhancedContacts.filter(
      (contact) =>
        contact.displayName?.toLowerCase().includes(query) ||
        contact.primaryEmail?.toLowerCase().includes(query) ||
        contact.primaryPhone?.toLowerCase().includes(query),
    );
  }, [enhancedContacts, searchQuery]);

  // Contact suggestions query
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/contacts-new/suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/contacts-new/suggestions");
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      const json = await response.json();
      // Handle the API envelope { ok, data }
      return json?.data ?? json;
    },
    enabled: showSuggestions,
  });

  const suggestions: ContactSuggestion[] = suggestionsData?.suggestions || [];

  // Streaming enrichment hook
  const streamingEnrichment = useStreamingEnrichment();

  const createContactsMutation = useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      return await fetchPost<{
        success: boolean;
        createdCount: number;
        errors: string[];
      }>("/api/contacts-new/suggestions", { suggestionIds });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts-new/suggestions"] });
      setSelectedSuggestions([]);
      toast({
        title: "Success",
        description: `Created ${data.createdCount} contacts from calendar data`,
      });
      if (data.errors?.length > 0) {
        console.warn("Some contacts failed to create:", data.errors);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contacts from suggestions",
        variant: "destructive",
      });
    },
  });

  // Enhanced System Handlers
  const handleAddContact = async (): Promise<void> => {
    if (!newContact.displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetchPost("/api/contacts-new", newContact);

      await queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"] });
      setIsAddingContact(false);
      setNewContact({ displayName: "", primaryEmail: "", primaryPhone: "" });
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
    } catch (error) {
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

    createContactsMutation.mutate(selectedSuggestions);
  };

  const getConfidenceBadge = (confidence: string): string => {
    const variants = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return variants[confidence as keyof typeof variants] || variants.low;
  };

  const handleExportContacts = () => {
    try {
      if (filteredContacts.length === 0) {
        toast({
          title: "No Data",
          description: "No contacts to export",
          variant: "destructive",
        });
        return;
      }

      const headers = ["Name", "Email", "Phone", "Stage", "Tags", "AI Insights", "Last Updated"];
      const rows = filteredContacts.map((c) => [
        c.displayName ?? "",
        c.primaryEmail ?? "",
        c.primaryPhone ?? "",
        c.stage ?? "",
        Array.isArray(c.tags) ? c.tags.join(", ") : "",
        c.notes ?? "",
        new Date(c.updatedAt).toLocaleDateString(),
      ]);

      const escapeCsv = (val: string): string => {
        const needsQuotes = /[",\n]/.test(val);
        const escaped = val.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const csv = [headers, ...rows]
        .map((r) => r.map((v) => escapeCsv(String(v ?? ""))).join(","))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enhanced-contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Exported ${filteredContacts.length} contacts to CSV`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export contacts",
        variant: "destructive",
      });
    }
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
            AI-powered contact management with calendar integration and smart suggestions
          </p>
        </div>

        <div className="flex gap-2">
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
                  value={newContact.displayName}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  data-testid="contact-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newContact.primaryEmail}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, primaryEmail: e.target.value }))
                  }
                  data-testid="contact-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newContact.primaryPhone}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, primaryPhone: e.target.value }))
                  }
                  data-testid="contact-phone-input"
                />
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
        <Card data-testid="contact-suggestions-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Contact Suggestions
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
                <p className="text-sm">All attendees may already be in your contacts</p>
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
                      disabled={createContactsMutation.isPending}
                      data-testid="create-selected-contacts"
                    >
                      {createContactsMutation.isPending
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
                            <span>{suggestion.eventCount} events</span>
                          </div>
                        </div>

                        {suggestion.eventTitles.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span>Recent events: </span>
                            <span>{suggestion.eventTitles.slice(0, 2).join(", ")}</span>
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

      {/* Enhanced Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Contacts with AI Insights</CardTitle>
          <CardDescription>
            Contacts enriched with AI-generated insights, stages, and timeline data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="search-contacts"
                />
              </div>
              <Button variant="outline" size="sm">
                <Tag className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportContacts}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Enhanced Table */}
            {enhancedLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading enhanced contacts...</div>
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
                <span>
                  Showing {filteredContacts.length} of {enhancedContacts.length} contacts
                  {searchQuery && ` matching "${searchQuery}"`}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Brain className="h-4 w-4" />
                    AI-enhanced
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Calendar-synced
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
