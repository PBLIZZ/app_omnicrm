"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Sparkles, Calendar, Mail, Brain } from "lucide-react";
import { ContactsTable } from "./components/contacts-table";
import { contactsColumns, ContactWithNotes } from "./components/contacts-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'calendar_attendee';
}

export default function ContactsPage() {
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
  });
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const contacts: ContactWithNotes[] = contactsData?.contacts || [];

  // Contact suggestions query
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/contacts/suggestions");
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
    enabled: showSuggestions,
  });

  const suggestions: ContactSuggestion[] = suggestionsData?.suggestions || [];

  // Enrich existing contacts mutation
  const enrichContactsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/contacts/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to enrich contacts");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Success",
        description: `Enriched ${data.enrichedCount} contacts with AI insights`,
      });
      if (data.errors?.length > 0) {
        console.warn("Some contacts failed to enrich:", data.errors);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to enrich contacts with AI insights",
        variant: "destructive",
      });
    },
  });

  // Create contacts from suggestions mutation
  const createContactsMutation = useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      const response = await fetch("/api/contacts/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds }),
      });
      if (!response.ok) throw new Error("Failed to create contacts");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/suggestions"] });
      setSelectedSuggestions([]);
      toast({
        title: "Success",
        description: `Created ${data.createdCount} contacts from calendar data`,
      });
      if (data.errors?.length > 0) {
        console.warn("Some contacts failed to create:", data.errors);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create contacts from suggestions",
        variant: "destructive",
      });
    },
  });

  const handleAddContact = async () => {
    if (!newContact.displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) throw new Error("Failed to create contact");

      await queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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

  const handleCreateSuggested = () => {
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

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    };
    return variants[confidence as keyof typeof variants] || variants.low;
  };

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Contacts
          </h1>
          <p className="text-muted-foreground">
            Manage your contacts and relationships
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => enrichContactsMutation.mutate()}
            disabled={enrichContactsMutation.isPending}
            data-testid="enrich-contacts-button"
          >
            <Brain className="h-4 w-4 mr-2" />
            {enrichContactsMutation.isPending ? "Enriching..." : "AI Enrich All"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowSuggestions(!showSuggestions)}
            data-testid="smart-suggestions-button"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Suggestions
          </Button>
          
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
                  onChange={(e) => setNewContact(prev => ({ ...prev, displayName: e.target.value }))}
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
                  onChange={(e) => setNewContact(prev => ({ ...prev, primaryEmail: e.target.value }))}
                  data-testid="contact-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={newContact.primaryPhone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, primaryPhone: e.target.value }))}
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
                          setSelectedSuggestions(suggestions.map(s => s.id));
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
                      {createContactsMutation.isPending ? "Creating..." : `Create ${selectedSuggestions.length} Contacts`}
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
                            setSelectedSuggestions(prev => [...prev, suggestion.id]);
                          } else {
                            setSelectedSuggestions(prev => prev.filter(id => id !== suggestion.id));
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

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            data-testid="search-contacts"
          />
        </div>
        <Button variant="outline" size="sm">
          Filter
        </Button>
        <Button variant="outline" size="sm">
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading contacts...</div>
          </div>
        ) : (
          <ContactsTable 
            columns={contactsColumns} 
            data={contacts}
          />
        )}
      </div>

      {/* Stats */}
      {contacts.length > 0 && (
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Showing {contacts.length} contacts</span>
        </div>
      )}
    </div>
  );
}