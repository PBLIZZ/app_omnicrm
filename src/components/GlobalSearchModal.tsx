/**
 * Global Search Modal Component
 *
 * Provides a Spotlight-style search interface with keyboard navigation,
 * multiple search modes, and result previews.
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalSearchModal() {
  const router = useRouter();
  const {
    isOpen,
    query,
    results,
    isLoading,
    recentSearches,
    closeSearch,
    setQuery,
    performSearch,
    clearResults,
  } = useGlobalSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const [searchType, setSearchType] = useState<"hybrid" | "traditional" | "semantic">("hybrid");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Memoized debounced search function
  const debouncedPerformSearch = useCallback(
    (searchQuery: string, type: "hybrid" | "traditional" | "semantic") => {
      const timer = setTimeout(() => {
        performSearch(searchQuery, type);
      }, 300);
      return () => clearTimeout(timer);
    },
    [performSearch],
  );

  // Debounced search
  useEffect(() => {
    if (!query) {
      clearResults();
      return;
    }

    const cleanup = debouncedPerformSearch(query, searchType);
    return cleanup;
  }, [query, searchType, debouncedPerformSearch, clearResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Early guard for empty results
    if (results.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results.length > 0 && results[selectedIndex]) {
      e.preventDefault();
      const url = results[selectedIndex].url;
      // Check if it's an external URL
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.location.href = url;
      } else {
        router.push(url);
      }
    }
  };

  const getResultIcon = (type: string) => {
    const icons = {
      client: "👤",
      contact: "👤",
      appointment: "📅",
      calendar_event: "📅",
      task: "✅",
      email: "📧",
      interaction: "📧",
      note: "📝",
      goal: "🎯",
    };
    return icons[type as keyof typeof icons] || "📄";
  };

  const getResultTypeColor = (type: string) => {
    const colors = {
      client: "bg-blue-100 text-blue-800",
      contact: "bg-blue-100 text-blue-800",
      appointment: "bg-green-100 text-green-800",
      calendar_event: "bg-green-100 text-green-800",
      task: "bg-yellow-100 text-yellow-800",
      email: "bg-purple-100 text-purple-800",
      interaction: "bg-purple-100 text-purple-800",
      note: "bg-gray-100 text-gray-800",
      goal: "bg-red-100 text-red-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={closeSearch}
        />

        {/* Modal */}
        <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all sm:my-8"
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Global Search</h3>

                {/* Search Type Toggle */}
                <div className="flex items-center space-x-2">
                  <select
                    value={searchType}
                    onChange={(e) =>
                      setSearchType(e.target.value as "hybrid" | "traditional" | "semantic")
                    }
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="hybrid">🤖 Smart Search</option>
                    <option value="traditional">🔍 Exact Match</option>
                    <option value="semantic">🧠 AI Search</option>
                  </select>

                  <button onClick={closeSearch} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search clients, appointments, tasks, notes..."
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />

                {/* Loading spinner */}
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Search Tips */}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>⌘K to open</span>
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
                <span>ESC to close</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {!query && recentSearches.length > 0 && (
                <div className="p-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Recent Searches</h4>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <motion.a
                      key={result.id}
                      href={result.url}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                        selectedIndex === index ? "bg-primary-50 border-r-2 border-primary-500" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getResultIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultTypeColor(result.type)}`}
                            >
                              {result.type}
                            </span>
                            {result.similarity && (
                              <span className="text-xs text-gray-500">
                                {Math.round(result.similarity * 100)}% match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{result.content}</p>
                          {result.metadata && (
                            <div className="mt-1 text-xs text-gray-500">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}

              {query && !isLoading && results.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or switching search types
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
