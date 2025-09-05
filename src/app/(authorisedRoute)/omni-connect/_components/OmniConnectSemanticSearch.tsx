"use client";

import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface SearchResult {
  subject: string;
  similarity: number;
  date: string;
  snippet: string;
  contactInfo?: {
    displayName?: string;
  };
}

interface OmniConnectSemanticSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  onSearch: () => void;
}

export function OmniConnectSemanticSearch({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearch,
}: OmniConnectSemanticSearchProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Semantic Gmail Search
        </CardTitle>
        <CardDescription>
          Search your emails using natural language (e.g., &quot;project updates from John&quot;,
          &quot;meeting notes&quot;)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search your emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <Button onClick={onSearch} disabled={!searchQuery.trim() || isSearching}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Search Results:</h4>
            {searchResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium">{result.subject}</h5>
                  <Badge variant="secondary">{Math.round(result.similarity * 100)}% match</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(result.date), "MMM d, yyyy")}
                  {result.contactInfo?.displayName && ` • ${result.contactInfo.displayName}`}
                </div>
                <div className="text-sm bg-gray-50 p-2 rounded">{result.snippet}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
