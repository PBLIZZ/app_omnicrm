import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Brain } from "lucide-react";
import { format } from "date-fns";
import { SearchResult, GmailInsights, ContactData } from "./types";

interface GmailAIFeaturesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  insights: GmailInsights | null;
  isSearching: boolean;
  isLoadingInsights: boolean;
  onSearch: () => void;
  onLoadInsights: () => void;
}

export function GmailAIFeatures({
  searchQuery,
  setSearchQuery,
  searchResults,
  insights,
  isSearching,
  isLoadingInsights,
  onSearch,
  onLoadInsights,
}: GmailAIFeaturesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Semantic Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Semantic Gmail Search
          </CardTitle>
          <CardDescription>
            Search your emails using natural language (e.g., "project updates from John", "meeting
            notes")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search your emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && onSearch()}
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
                    <Badge variant="secondary">
                      {Math.round(result.similarity * 100)}% match
                    </Badge>
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

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Gmail Insights
          </CardTitle>
          <CardDescription>
            Intelligent analysis of your email patterns and communication trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={onLoadInsights} disabled={isLoadingInsights} variant="outline">
              <Brain className={`h-4 w-4 mr-2 ${isLoadingInsights ? "animate-spin" : ""}`} />
              {isLoadingInsights ? "Loading..." : "Load Insights"}
            </Button>

            {insights && (
              <div className="grid grid-cols-1 gap-4">
                {insights.patterns?.length && (
                  <div>
                    <h4 className="font-medium mb-2">📊 Patterns</h4>
                    <ul className="space-y-1 text-sm">
                      {insights.patterns.slice(0, 3).map((pattern: string, index: number) => (
                        <li key={index} className="text-muted-foreground">
                          • {pattern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.emailVolume && (
                  <div>
                    <h4 className="font-medium mb-2">📈 Email Volume</h4>
                    <div className="text-sm text-muted-foreground">
                      <div>Total: {insights.emailVolume.total} emails</div>
                      <div>This week: {insights.emailVolume.thisWeek} emails</div>
                      <div
                        className={`font-medium ${
                          insights.emailVolume.trend === "up"
                            ? "text-green-600"
                            : insights.emailVolume.trend === "down"
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        Trend:{" "}
                        {insights.emailVolume.trend === "up"
                          ? "↗️"
                          : insights.emailVolume.trend === "down"
                            ? "↘️"
                            : "➡️"}{" "}
                        {insights.emailVolume.trend}
                      </div>
                    </div>
                  </div>
                )}

                {insights.topContacts?.length && (
                  <div>
                    <h4 className="font-medium mb-2">👥 Top Contacts</h4>
                    <ul className="space-y-1 text-sm">
                      {insights.topContacts
                        .slice(0, 3)
                        .map((contact: ContactData, index: number) => (
                          <li key={index} className="text-muted-foreground">
                            • {contact.displayName ?? contact.email} ({contact.emailCount} emails)
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
