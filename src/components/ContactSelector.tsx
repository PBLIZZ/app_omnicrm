"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, Search, Check, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface LinkedContact {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
}

interface ContactSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: LinkedContact[];
  availableContacts: LinkedContact[];
  onContactsChange: (contacts: LinkedContact[]) => void;
  title?: string;
  placeholder?: string;
}

/**
 * Calculate fuzzy match score (0-1, higher is better)
 * Implements simple fuzzy matching with:
 * - Exact matches get highest score
 * - Case-insensitive substring matches
 * - Character-by-character matching for typos
 */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (q === t) return 1;

  // Starts with query
  if (t.startsWith(q)) return 0.9;

  // Contains query
  if (t.includes(q)) return 0.7;

  // Fuzzy character matching for typos
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }

  // If all query chars found in order, return proportional score
  if (queryIndex === q.length) {
    return 0.5 * (score / t.length);
  }

  return 0;
}

/**
 * Get initials from contact name for avatar fallback
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Contact Selector Component with Enhanced Features:
 * - Fuzzy autocomplete with typo tolerance
 * - Keyboard navigation (Tab/Enter/Esc)
 * - Contact avatars with photo fallback
 * - Save/Close buttons
 * - Click outside or ESC to close
 */
export function ContactSelector({
  open,
  onOpenChange,
  selectedContacts,
  availableContacts,
  onContactsChange,
  title = "Link Contacts",
  placeholder = "Search contacts by name or email...",
}: ContactSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContacts, setFilteredContacts] = useState<LinkedContact[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pendingChanges, setPendingChanges] = useState<LinkedContact[]>(selectedContacts);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Initialize pending changes when dialog opens
  useEffect(() => {
    if (open) {
      setPendingChanges(selectedContacts);
      setSearchQuery("");
      setHighlightedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, selectedContacts]);

  // Filter and sort contacts with fuzzy matching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts([]);
      return;
    }

    const query = searchQuery.trim();

    // Score and filter contacts by name and email
    const scoredContacts = availableContacts
      .map((contact) => {
        const nameScore = fuzzyMatch(query, contact.name);
        const emailScore = contact.email ? fuzzyMatch(query, contact.email) : 0;
        const maxScore = Math.max(nameScore, emailScore);

        return {
          contact,
          score: maxScore,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Show top 8 matches
      .map(({ contact }) => contact);

    setFilteredContacts(scoredContacts);
    setHighlightedIndex(0);
  }, [searchQuery, availableContacts]);

  // Check if contact is selected in pending changes
  const isContactSelected = (contactId: string): boolean => {
    return pendingChanges.some((c) => c.id === contactId);
  };

  // Toggle contact in pending changes (not saved yet)
  const handleContactToggle = (contact: LinkedContact): void => {
    if (isContactSelected(contact.id)) {
      setPendingChanges(pendingChanges.filter((c) => c.id !== contact.id));
    } else {
      setPendingChanges([...pendingChanges, contact]);
    }
  };

  // Remove contact from pending changes
  const handleRemoveContact = (contactId: string): void => {
    setPendingChanges(pendingChanges.filter((c) => c.id !== contactId));
  };

  // Save changes and close
  const handleSave = (): void => {
    onContactsChange(pendingChanges);
    onOpenChange(false);
  };

  // Close without saving (revert to original)
  const handleClose = (): void => {
    setPendingChanges(selectedContacts);
    onOpenChange(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (!searchQuery.trim()) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredContacts.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;

      case "Tab":
        e.preventDefault();
        if (filteredContacts.length > 0) {
          const selectedContact = filteredContacts[highlightedIndex];
          if (selectedContact) {
            handleContactToggle(selectedContact);
            setSearchQuery("");
          }
        }
        break;

      case "Enter":
        e.preventDefault();
        if (filteredContacts.length > 0 && highlightedIndex >= 0) {
          // Select highlighted contact
          const selectedContact = filteredContacts[highlightedIndex];
          if (selectedContact) {
            handleContactToggle(selectedContact);
            setSearchQuery("");
          }
        }
        break;

      case "Escape":
        e.preventDefault();
        if (searchQuery) {
          setSearchQuery("");
        } else {
          handleClose();
        }
        break;
    }
  };

  // Get contacts to display in suggested section (not already selected)
  const displayedSuggestedContacts = availableContacts
    .filter((contact) => !isContactSelected(contact.id))
    .slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[550px] p-0 bg-white/95 backdrop-blur-md"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Search Input with Autocomplete */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              autoComplete="off"
            />

            {/* Autocomplete Dropdown */}
            {searchQuery.trim() && filteredContacts.length > 0 && (
              <div
                ref={autocompleteRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
              >
                {filteredContacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      handleContactToggle(contact);
                      setSearchQuery("");
                    }}
                    className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                      index === highlightedIndex
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-8 h-8">
                        {contact.photoUrl ? (
                          <AvatarImage src={contact.photoUrl} alt={contact.name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{contact.name}</span>
                        {contact.email && (
                          <span className="text-xs text-gray-500 truncate">{contact.email}</span>
                        )}
                      </div>
                    </div>
                    {isContactSelected(contact.id) && (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Contacts Section */}
          {pendingChanges.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">
                Selected Contacts ({pendingChanges.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {pendingChanges.map((contact) => (
                  <Badge
                    key={contact.id}
                    className="px-3 py-1.5 text-sm font-medium flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <Avatar className="w-5 h-5">
                      {contact.photoUrl ? (
                        <AvatarImage src={contact.photoUrl} alt={contact.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px]">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.name}</span>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${contact.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Contacts Section */}
          {!searchQuery && displayedSuggestedContacts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Available Contacts</h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {displayedSuggestedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactToggle(contact)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${
                      isContactSelected(contact.id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {contact.photoUrl ? (
                        <AvatarImage src={contact.photoUrl} alt={contact.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{contact.name}</span>
                      {contact.email && (
                        <span className="text-xs text-gray-500 truncate">{contact.email}</span>
                      )}
                    </div>
                    {isContactSelected(contact.id) && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {availableContacts.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No contacts available</p>
              <p className="text-xs text-gray-400 mt-1">
                Add contacts from the Contacts page first
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>

          {/* Keyboard Hints */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Tab</kbd> or{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to select •{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
