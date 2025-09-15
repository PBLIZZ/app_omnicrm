"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { GmailEmailPreview } from "./GmailEmailPreview";
import { useOmniConnect } from "@/hooks/use-omni-connect";

export function DashboardOverview(): JSX.Element {
  const { emails } = useOmniConnect();

  // Mock activity data - replace with real data later
  const recentActivity = [
    {
      type: "email",
      text: "New inquiry from Sarah Johnson about yoga classes",
      time: "2 hours ago",
    },
    { type: "contact", text: "Mike Chen attended Beginner Yoga session", time: "4 hours ago" },
    { type: "automation", text: "Welcome sequence sent to 3 new subscribers", time: "6 hours ago" },
    { type: "calendar", text: "5 new bookings for this weekend's workshop", time: "1 day ago" },
  ];

  const getActivityIcon = (type: string): JSX.Element => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "contact":
        return <Users className="h-4 w-4 text-green-500" />;
      case "automation":
        return <Zap className="h-4 w-4 text-purple-500" />;
      case "calendar":
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today&apos;s Emails</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Contacts</p>
                <p className="text-2xl font-bold">247</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8 new this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold">9</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3 mr-1" />
              Next in 2 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automations</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/activity">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0"
                >
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Email Preview */}
        <div className="lg:col-span-2">
          <GmailEmailPreview
            emails={emails.emails}
            isLoading={emails.isLoading}
            previewRange={emails.previewRange}
            error={emails.error}
          />
        </div>
      </div>
    </div>
  );
}
