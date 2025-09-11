"use client";

import { useState, useMemo, useEffect } from "react";
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
import { OmniClientsTable } from "./omni-clients-table";
import { omniClientsColumns } from "./omni-clients-columns";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  useEnhancedOmniClients,
  useOmniClientSuggestions,
  type ClientWithNotes,
} from "@/hooks/use-omni-clients";

interface ClientSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee";
}

/**
 * OmniClientsPage - Main Client Component
 * Handles all interactive functionality for client management
 * Replaces the old contacts page with wellness-focused terminology
 */
export function OmniClientsPage(): JSX.Element {
  // Enhanced System State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newClient, setNewClient] = useState({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced System Queries using OmniClient endpoints
  const { data: enhancedClientsData, isLoading: enhancedLoading } =
    useEnhancedOmniClients(searchQuery);

  const enhancedClients: ClientWithNotes[] = useMemo(
    () => enhancedClientsData?.items ?? [],
    [enhancedClientsData?.items],
  );

  const filteredClients = useMemo((): ClientWithNotes[] => {
    if (!searchQuery.trim()) return enhancedClients;
    const query = searchQuery.toLowerCase();
    return enhancedClients.filter(
      (client) =>
        client.displayName?.toLowerCase().includes(query) ||
        (client.primaryEmail?.toLowerCase().includes(query) ?? false) ||
        (client.primaryPhone?.toLowerCase().includes(query) ?? false),
    );
  }, [enhancedClients, searchQuery]);

  // OmniClient suggestions query using OmniClient endpoints
  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useOmniClientSuggestions(showSuggestions);

  const suggestions: ClientSuggestion[] = suggestionsData?.suggestions ?? [];

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
      }>("/api/omni-clients/suggestions", { suggestionIds });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-clients"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-clients/suggestions"] });
      setSelectedSuggestions([]);
      toast({
        title: "Success",
        description: `Created ${data.createdCount} OmniClient${data.createdCount === 1 ? "" : "s"} from calendar data`,
      });
      // Log errors for debugging but don't show to user
      if (data.errors?.length > 0) {
        // Errors already shown via toast, no console output needed
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create OmniClients from suggestions",
        variant: "destructive",
      });
    },
  });

  // Enhanced System Handlers
  const handleAddClient = async (): Promise<void> => {
    if (!newClient.displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a client name",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post("/api/omni-clients", newClient);

      await queryClient.invalidateQueries({ queryKey: ["/api/omni-clients"] });
      setIsAddingClient(false);
      setNewClient({ displayName: "", primaryEmail: "", primaryPhone: "" });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const handleCreateSuggested = (): void => {
    if (selectedSuggestions.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select clients to create",
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
    <div className="space-y-6" data-testid="omni-clients-page">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            OmniClients Intelligence
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
              placeholder="Search clients..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-clients"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => streamingEnrichment.startEnrichment()}
            disabled={streamingEnrichment.isRunning}
            data-testid="enrich-clients-button"
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
                Enriching Clients with AI
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

        <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
          <DialogTrigger asChild>
            <Button data-testid="add-client-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter client name"
                  value={newClient.displayName}
                  onChange={(e) =>
                    setNewClient((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  data-testid="client-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newClient.primaryEmail}
                  onChange={(e) =>
                    setNewClient((prev) => ({ ...prev, primaryEmail: e.target.value }))
                  }
                  data-testid="client-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newClient.primaryPhone}
                  onChange={(e) =>
                    setNewClient((prev) => ({ ...prev, primaryPhone: e.target.value }))
                  }
                  data-testid="client-phone-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingClient(false)}
                  data-testid="cancel-add-client"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddClient} data-testid="save-client">
                  Add Client
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smart Suggestions Section */}
      {showSuggestions && (
        <Card
          data-testid="client-suggestions-section"
          className={`transition-opacity duration-[4000ms] ${isFadingOut ? "opacity-0" : "opacity-100"}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Smart Client Suggestions
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
              We found people from your calendar events who could be added as clients
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
                <p>No new clients found in your calendar events</p>
                <p className="text-sm">All attendees may already be in your client list</p>
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
                      data-testid="create-selected-clients"
                    >
                      {createClientsMutation.isPending
                        ? "Creating..."
                        : `Create ${selectedSuggestions.length} Clients`}
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

      {/* Enhanced Clients Table */}
      <Card className="transition-all duration-700 ease-in-out">
        <CardContent>
          <div className="space-y-4">
            {/* Toolbar - now empty since buttons moved to table header */}
            <div className="hidden"></div>

            {/* Enhanced Table */}
            {enhancedLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading client intelligence...</div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clients found</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Add clients or sync from your calendar to get started"}
                </p>
              </div>
            ) : (
              <OmniClientsTable columns={omniClientsColumns} data={filteredClients} />
            )}

            {/* Stats */}
            {enhancedClients.length > 0 && (
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
