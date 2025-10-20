/**
 * Global Search Context
 *
 * Provides global search functionality with keyboard shortcuts and state management.
 */

"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export interface SearchResult {
  id: string;
  type: "contact" | "note" | "interaction" | "calendar_event" | "task";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  url: string;
  similarity?: number;
  score?: number;
  source?: "traditional" | "semantic" | "hybrid";
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface SearchContextType {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  recentSearches: string[];
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  performSearch: (
    searchQuery: string,
    searchType?: "hybrid" | "traditional" | "semantic",
  ) => Promise<void>;
  clearResults: () => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Global search hotkeys: Cmd/Ctrl + K
  useHotkeys(
    "cmd+k,ctrl+k",
    (e: KeyboardEvent) => {
      e.preventDefault();
      openSearch();
    },
    { enableOnFormTags: true },
  );

  // Close modal: Escape
  useHotkeys(
    "escape",
    () => {
      if (isOpen) closeSearch();
    },
    { enableOnFormTags: true },
  );

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  const performSearch = useCallback(async (searchQuery: string, searchType = "hybrid") => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Build URL with query parameters
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        limit: "20",
      });

      const response = await fetch(`/api/search?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);

        // Add to recent searches
        setRecentSearches((prev) => {
          const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)];
          return updated.slice(0, 5); // Keep last 5
        });
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery("");
  }, []);

  const value = {
    isOpen,
    query,
    results,
    isLoading,
    recentSearches,
    openSearch,
    closeSearch,
    setQuery,
    performSearch,
    clearResults,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useGlobalSearch(): SearchContextType {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useGlobalSearch must be used within a GlobalSearchProvider");
  }
  return context;
}
