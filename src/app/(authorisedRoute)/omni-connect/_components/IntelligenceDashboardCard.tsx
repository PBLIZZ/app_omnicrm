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
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  HoverCard, 
  HoverCardTrigger, 
  HoverCardContent 
} from "@/components/ui/hover-card";
import { 
  Brain, 
  FileText, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Lightbulb,
  ArrowRight 
} from "lucide-react";
import type { WeeklyDigest, MarketingWikiItem } from "./types";


interface IntelligenceDashboardCardProps {
  weeklyDigests?: WeeklyDigest[];
  marketingWikiCount?: number;
  onDigestOpen?: (digest: WeeklyDigest) => void;
  onWikiOpen?: () => void;
  onViewAllDigests?: () => void;
  onGenerateNewDigest?: () => void;
}

// Mock data for demonstration
const mockDigests: WeeklyDigest[] = [
  {
    id: "digest-2025-01-20",
    title: "Week of January 20th - New Client Momentum",
    date: "2025-01-20",
    summary: "Strong week with 15% increase in new client inquiries. Notable uptick in yoga class bookings and wellness consultation requests.",
    keyInsights: [
      "Evening yoga classes showing 40% higher attendance",
      "Client referrals increased by 25% this week",
      "Weekend workshops gaining traction with working professionals"
    ],
    actionItems: [
      "Follow up with 8 new prospects from this week",
      "Schedule additional evening yoga sessions",
      "Create referral appreciation campaign"
    ],
    topContacts: ["Sarah Johnson", "Mike Chen", "Lisa Rodriguez"],
    emailVolume: 127
  },
  {
    id: "digest-2025-01-13", 
    title: "Week of January 13th - Client Retention Focus",
    date: "2025-01-13",
    summary: "Focused on re-engaging dormant clients. Successful email campaign resulted in 12 session bookings from previously inactive clients.",
    keyInsights: [
      "Personalized wellness check-ins have 65% open rates",
      "Clients respond well to seasonal wellness challenges",
      "Morning meditation sessions need promotion boost"
    ],
    actionItems: [
      "Design February wellness challenge",
      "Create morning meditation promotion campaign",
      "Schedule quarterly check-ins for VIP clients"
    ],
    topContacts: ["David Park", "Emma Thompson", "Carlos Martinez"],
    emailVolume: 89
  },
  {
    id: "digest-2025-01-06",
    title: "Week of January 6th - New Year Energy",
    date: "2025-01-06", 
    summary: "New Year brought surge in wellness goal inquiries. 23 new prospects, mostly interested in stress management and flexibility programs.",
    keyInsights: [
      "Stress management keywords trending in inquiries",
      "Corporate wellness partnerships showing potential",
      "Flexibility programs more popular than strength training"
    ],
    actionItems: [
      "Develop corporate wellness package",
      "Create stress management workshop series",
      "Launch flexibility challenge for February"
    ],
    topContacts: ["Jennifer Kim", "Robert Wilson", "Maria Garcia"],
    emailVolume: 156
  }
];

const mockWikiItems: MarketingWikiItem[] = [
  {
    id: "wiki-client-journey",
    title: "Wellness Client Journey Mapping",
    category: "strategy",
    summary: "Complete framework for mapping client touchpoints from first inquiry to VIP status",
    tags: ["client-journey", "touchpoints", "conversion"],
    dateAdded: "2025-01-18"
  },
  {
    id: "wiki-seasonal-campaigns",
    title: "Seasonal Wellness Campaign Ideas",
    category: "content",
    summary: "12 months of wellness-focused campaign themes with email templates and social media content",
    tags: ["seasonal", "campaigns", "content-calendar"],
    dateAdded: "2025-01-15"
  },
  {
    id: "wiki-retention-sequences",
    title: "Client Retention Email Sequences",
    category: "automation", 
    summary: "Proven email sequences for different client lifecycle stages to improve retention rates",
    tags: ["retention", "email-sequences", "automation"],
    dateAdded: "2025-01-12"
  }
];

export function IntelligenceDashboardCard({
  weeklyDigests = mockDigests,
  marketingWikiCount = mockWikiItems.length,
  onDigestOpen,
  onWikiOpen,
  onViewAllDigests,
  onGenerateNewDigest
}: IntelligenceDashboardCardProps): JSX.Element {
  const [selectedDigest, setSelectedDigest] = useState<WeeklyDigest | null>(null);
  const [isDigestSheetOpen, setIsDigestSheetOpen] = useState(false);

  const handleDigestClick = (digest: WeeklyDigest) => {
    setSelectedDigest(digest);
    setIsDigestSheetOpen(true);
    onDigestOpen?.(digest);
  };


  const getCategoryColor = (category: MarketingWikiItem["category"]) => {
    switch (category) {
      case "strategy": return "bg-blue-100 text-blue-800";
      case "content": return "bg-green-100 text-green-800";
      case "automation": return "bg-purple-100 text-purple-800";
      case "analytics": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: MarketingWikiItem["category"]) => {
    switch (category) {
      case "strategy": return "🎯";
      case "content": return "✍️"; 
      case "automation": return "⚡";
      case "analytics": return "📊";
      default: return "📝";
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
            <div className="space-y-2">
              {weeklyDigests.slice(0, 3).map((digest) => (
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
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {digest.summary}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Marketing Wiki Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Marketing Wiki
              </h3>
              <Badge variant="outline" className="text-xs">
                {marketingWikiCount} insights
              </Badge>
            </div>
            <div className="space-y-2">
              {mockWikiItems.slice(0, 2).map((item) => (
                <HoverCard key={item.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-lg">
                          {getCategoryIcon(item.category)}
                        </span>
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
                          <p className="text-xs text-gray-600 line-clamp-1">
                            {item.summary}
                          </p>
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={onViewAllDigests}
            >
              <FileText className="h-4 w-4 mr-1" />
              View All Digests
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onWikiOpen}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Browse Wiki
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Digest Detail Sheet */}
      <Sheet open={isDigestSheetOpen} onOpenChange={(open) => {
        setIsDigestSheetOpen(open);
        if (!open) {
          setSelectedDigest(null);
        }
      }}>
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