"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  Brain,
  FileText,
  BookOpen,
  Calendar,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useGmailAI } from "@/hooks/use-gmail-ai";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { WeeklyDigest, MarketingWikiItem } from "./types";

interface IntelligenceDashboardCardProps {
  weeklyDigests?: WeeklyDigest[];
  marketingWikiCount?: number;
  onDigestOpen?: (digest: WeeklyDigest) => void;
  onWikiOpen?: () => void;
  onViewAllDigests?: () => void;
  onGenerateNewDigest?: () => void;
}

// TODO: Replace with real data from AI insights processing
// These should come from actual LLM analysis of email data
const mockDigests: WeeklyDigest[] = [];
const mockWikiItems: MarketingWikiItem[] = [];

export function IntelligenceDashboardCard({
  weeklyDigests = mockDigests,
  marketingWikiCount = mockWikiItems.length,
  onDigestOpen,
  onWikiOpen,
  onViewAllDigests,
  onGenerateNewDigest,
}: IntelligenceDashboardCardProps): JSX.Element {
  const [selectedDigest, setSelectedDigest] = useState<WeeklyDigest | null>(null);
  const [isDigestSheetOpen, setIsDigestSheetOpen] = useState(false);

  // TODO: Get real data from useOmniConnect hook when insights are available

  // Get semantic search functionality
  const { searchQuery, setSearchQuery, searchGmail, isSearching, searchResults } = useGmailAI();

  // Use real data if available, fallback to mock data
  const realDigests = weeklyDigests; // TODO: Hook up to real insights data when available

  const handleDigestClick = (digest: WeeklyDigest): void => {
    setSelectedDigest(digest);
    setIsDigestSheetOpen(true);
    onDigestOpen?.(digest);
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchGmail();
    }
  };

  const getCategoryColor = (category: MarketingWikiItem["category"]): string => {
    switch (category) {
      case "strategy":
        return "bg-blue-100 text-blue-800";
      case "content":
        return "bg-green-100 text-green-800";
      case "automation":
        return "bg-purple-100 text-purple-800";
      case "analytics":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: MarketingWikiItem["category"]): string => {
    switch (category) {
      case "strategy":
        return "🎯";
      case "content":
        return "✍️";
      case "automation":
        return "⚡";
      case "analytics":
        return "📊";
      default:
        return "📝";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            Email Intelligence Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyDigests.length === 0 && mockWikiItems.length === 0 ? (
            // Empty state when no AI insights are available
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">AI Intelligence Not Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Email intelligence requires LLM processing of your Gmail data. Start by syncing
                emails to generate insights.
              </p>
              <Button variant="outline" size="sm" onClick={onGenerateNewDigest}>
                <Sparkles className="h-4 w-4 mr-2" />
                Process Emails for Insights
              </Button>
            </div>
          ) : (
            <>
              {/* Semantic Search Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Semantic Search
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (window.location.href = "/omni-connect?view=semantic-search")}
                    className="text-xs"
                  >
                    Advanced
                  </Button>
                </div>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search emails naturally..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                      disabled={isSearching}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? <Sparkles className="h-4 w-4 animate-pulse" /> : "Search"}
                  </Button>
                </form>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">
                      Found {searchResults.length} results
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => (window.location.href = "/omni-connect?view=semantic-search")}
                    >
                      View All Results
                    </Button>
                  </div>
                )}
              </div>

              {/* Weekly Digest Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Weekly Digests
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onGenerateNewDigest}
                    className="text-xs"
                  >
                    Generate New
                  </Button>
                </div>
                {realDigests.length > 0 ? (
                  <div className="space-y-2">
                    {realDigests.slice(0, 3).map((digest) => (
                      <div
                        key={digest.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleDigestClick(digest)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg">📊</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {digest.title}
                              </span>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {digest.date}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{digest.summary}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">
                      No weekly digests generated yet
                    </div>
                  </div>
                )}
              </div>

              {/* Marketing Wiki Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Marketing Insights
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {marketingWikiCount} insights
                  </Badge>
                </div>
                {mockWikiItems.length > 0 ? (
                  <div className="space-y-2">
                    {mockWikiItems.slice(0, 2).map((item) => (
                      <HoverCard key={item.id}>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-lg">{getCategoryIcon(item.category)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {item.title}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${getCategoryColor(item.category)}`}
                                  >
                                    {item.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-1">{item.summary}</p>
                              </div>
                            </div>
                            <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 ml-2" />
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-semibold">{item.title}</h4>
                            <p className="text-sm text-gray-600">{item.summary}</p>
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">
                              Added {new Date(item.dateAdded).toLocaleDateString()}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">
                      No marketing insights available yet
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={onViewAllDigests}
                  disabled={weeklyDigests.length === 0}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  View All Digests
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onWikiOpen}
                  disabled={mockWikiItems.length === 0}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Browse Insights
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Weekly Digest Detail Sheet */}
      <Sheet
        open={isDigestSheetOpen}
        onOpenChange={(open) => {
          setIsDigestSheetOpen(open);
          if (!open) {
            setSelectedDigest(null);
          }
        }}
      >
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              {selectedDigest?.title}
            </SheetTitle>
            <SheetDescription>
              Weekly intelligence digest for {selectedDigest?.date}
            </SheetDescription>
          </SheetHeader>

          {selectedDigest && (
            <div className="space-y-6 mt-6">
              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </h4>
                <p className="text-sm text-gray-600">{selectedDigest.summary}</p>
              </div>

              {/* Key Insights */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Key Insights
                </h4>
                <ul className="space-y-1">
                  {selectedDigest.keyInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Action Items
                </h4>
                <ul className="space-y-1">
                  {selectedDigest.actionItems.map((action, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Top Contacts */}
              <div>
                <h4 className="font-semibold mb-2">Top Contacts This Week</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDigest.topContacts.map((contact, index) => (
                    <Badge key={index} variant="secondary">
                      {contact}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email Volume</span>
                  <Badge variant="outline">{selectedDigest.emailVolume} emails</Badge>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
