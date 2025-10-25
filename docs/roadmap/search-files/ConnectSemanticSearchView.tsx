"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Brain, Calendar, User, Mail, Sparkles, Filter, FileText } from "lucide-react";
import { useGmailAI } from "@/hooks/use-gmail-ai";

// Enhanced interfaces for semantic search results
interface SemanticSearchResult {
  from: string;
  isImportant?: boolean;
  date: string;
  subject: string;
  preview: string;
}

// Type guards for runtime validation
function isSemanticSearchResult(obj: unknown): obj is SemanticSearchResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as SemanticSearchResult).from === "string" &&
    typeof (obj as SemanticSearchResult).date === "string" &&
    typeof (obj as SemanticSearchResult).subject === "string" &&
    typeof (obj as SemanticSearchResult).preview === "string"
  );
}

export function SemanticSearchView(): JSX.Element {
  const [searchMode, setSearchMode] = useState<"simple" | "advanced">("simple");
  const [filters, setFilters] = useState({
    dateRange: "30d",
    contactType: "all",
    contentType: "all",
  });

  const { searchQuery, setSearchQuery, searchResults, isSearching, searchGmail, insights } =
    useGmailAI();

  // Mock advanced search suggestions
  const searchSuggestions = [
    "Find emails about yoga class bookings this month",
    "Show conversations with clients who mentioned stress relief",
    "Search for follow-up emails after workshop sessions",
    "Find emails from new clients asking about pricing",
    "Show messages containing schedule changes or cancellations",
  ];

  const handleAdvancedSearch = (): void => {
    // Implementation for advanced search with filters
    searchGmail();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Semantic Email Search
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={searchMode === "simple" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchMode("simple")}
              >
                Simple
              </Button>
              <Button
                variant={searchMode === "advanced" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchMode("advanced")}
              >
                Advanced
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchMode === "simple" ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search emails naturally... e.g. 'clients who want stress relief classes'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && searchGmail()}
                  />
                </div>
                <Button onClick={searchGmail} disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Try these example searches:</p>
                <div className="flex flex-wrap gap-2">
                  {searchSuggestions.slice(0, 3).map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        searchGmail();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="Describe what you're looking for in detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Time Range</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 3 months</option>
                    <option value="1y">Last year</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Contact Type</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.contactType}
                    onChange={(e) => setFilters({ ...filters, contactType: e.target.value })}
                  >
                    <option value="all">All contacts</option>
                    <option value="new">New clients</option>
                    <option value="existing">Existing clients</option>
                    <option value="prospects">Prospects</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={filters.contentType}
                    onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
                  >
                    <option value="all">All content</option>
                    <option value="bookings">Bookings</option>
                    <option value="inquiries">Inquiries</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleAdvancedSearch} disabled={isSearching} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Search with Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults
                .map((rawResult, idx: number) => {
                  // Type guard to ensure safe access
                  if (!isSemanticSearchResult(rawResult)) {
                    console.warn("Invalid search result format:", rawResult);
                    return null;
                  }

                  const result = rawResult as SemanticSearchResult;

                  return (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{result.from}</span>
                          {result.isImportant && (
                            <Badge variant="secondary" className="text-xs">
                              Important
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(result.date)}
                        </div>
                      </div>

                      <h4 className="font-medium mb-2">{result.subject}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {result.preview}
                      </p>

                      {result.tags && Array.isArray(result.tags) && result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.tags.map((tag, tagIdx) => (
                            <Badge key={tagIdx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights && typeof insights === "object" && "patterns" in insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Insights from Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.patterns &&
                Array.isArray(insights.patterns) &&
                insights.patterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <FileText className="h-4 w-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm">{pattern}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading States */}
      {isSearching && !searchResults && (
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="h-8 w-8 text-purple-600 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              AI is analyzing your emails and finding relevant matches...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
