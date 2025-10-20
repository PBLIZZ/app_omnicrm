/**
 * ContactSearchCombobox Component
 *
 * A simplified searchable contact selector that shows results as you type.
 * No dropdown wrapper - just a search input with results below.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/hooks/use-contacts";
import { useDebounce } from "@/hooks/use-debounce";

export interface Contact {
  id: string;
  displayName: string;
  primaryEmail?: string | null;
}

interface ContactSearchComboboxProps {
  value?: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function ContactSearchCombobox({
  value,
  onValueChange,
  placeholder = "Search contacts...",
  className,
}: ContactSearchComboboxProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch contacts with search query
  const { data: contactsData, isLoading } = useContacts(debouncedSearchQuery, 1, 20);
  const contacts = contactsData?.items || [];

  // Find selected contact
  const selectedContact = contacts.find((contact) => contact.id === value);

  // Handle contact selection
  const handleSelect = (contactId: string): void => {
    onValueChange(contactId);
    setSearchQuery(selectedContact?.displayName || "");
    setShowResults(false);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setShowResults(true);
    setSelectedIndex(-1); // Reset selection when typing

    // Clear selection if search doesn't match selected contact
    if (
      value &&
      selectedContact &&
      !selectedContact.displayName.toLowerCase().includes(newQuery.toLowerCase())
    ) {
      onValueChange("");
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showResults || contacts.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < contacts.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : contacts.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < contacts.length) {
          handleSelect(contacts[selectedIndex].id);
        }
        break;
      case "Escape":
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input focus
  const handleFocus = (): void => {
    setShowResults(true);
  };

  // Handle input blur (with delay to allow clicking on results)
  const handleBlur = (): void => {
    setTimeout(() => setShowResults(false), 200);
  };

  // Update search query when value changes externally
  useEffect(() => {
    if (value && selectedContact) {
      setSearchQuery(selectedContact.displayName);
    } else if (!value) {
      setSearchQuery("");
    }
  }, [value, selectedContact]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedButton = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleSearchChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn("w-full", className)}
      />

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Searching contacts...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searchQuery ? "No contacts found." : "Start typing to search contacts"}
            </div>
          ) : (
            <div className="py-1" ref={resultsRef}>
              {contacts.map((contact, index) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact.id)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between",
                    value === contact.id && "bg-accent",
                    selectedIndex === index && "bg-accent text-accent-foreground",
                  )}
                  tabIndex={-1} // Prevent tab navigation to individual buttons
                >
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="truncate font-medium">{contact.displayName}</span>
                    {contact.primaryEmail && (
                      <span className="text-xs text-muted-foreground truncate">
                        {contact.primaryEmail}
                      </span>
                    )}
                  </div>
                  {value === contact.id && <Check className="ml-2 h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
