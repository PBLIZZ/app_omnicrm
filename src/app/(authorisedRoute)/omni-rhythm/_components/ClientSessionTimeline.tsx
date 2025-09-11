"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import { format, isAfter, differenceInDays } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  nextSessionDate?: string;
  status: "active" | "inactive" | "prospect";
  satisfaction: number; // 1-5 stars
}

interface SessionMilestone {
  id: string;
  clientId: string;
  sessionNumber: number;
  date: string;
  type: "completed" | "scheduled" | "cancelled" | "no-show";
  duration: number;
  revenue: number;
  notes?: string;
  feedback?: string;
}

interface ClientSessionTimelineProps {
  clients: Client[];
  milestones: SessionMilestone[];
  isLoading?: boolean;
}

export function ClientSessionTimeline({
  clients,
  milestones,
  isLoading = false,
}: ClientSessionTimelineProps): JSX.Element {
  // Sort clients by last session date (most recent first)
  const sortedClients = [...clients].sort(
    (a, b) => new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime(),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Session Timeline
          </CardTitle>
          <CardDescription>Loading client journeys...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Client Session Timeline
        </CardTitle>
        <CardDescription>
          Track client journeys and milestone progress ({clients.length} active clients)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No client data yet</p>
            <p className="text-sm mt-1">Client timelines will appear as you schedule sessions</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedClients.slice(0, 5).map((client) => (
              <ClientTimelineCard
                key={client.id}
                client={client}
                milestones={milestones.filter((m) => m.clientId === client.id)}
              />
            ))}

            {/* Summary Stats */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {clients.filter((c) => c.status === "active").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Clients</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {clients.reduce((sum, c) => sum + c.totalSessions, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Sessions</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-600">
                    ${clients.reduce((sum, c) => sum + c.totalSpent, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(
                      (clients.reduce((sum, c) => sum + c.satisfaction, 0) / clients.length) * 10,
                    ) / 10}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientTimelineCard({
  client,
  milestones,
}: {
  client: Client;
  milestones: SessionMilestone[];
}): JSX.Element {
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const nextSession = client.nextSessionDate ? new Date(client.nextSessionDate) : null;
  const daysUntilNext = nextSession ? differenceInDays(nextSession, new Date()) : null;
  const lastSession = new Date(client.lastSessionDate);
  // const daysSinceLast = differenceInDays(new Date(), lastSession);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Client Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {client.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium">{client.name}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{client.totalSessions} sessions</span>
              <span>•</span>
              <span>${client.totalSpent}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < client.satisfaction ? "text-yellow-400 fill-current" : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <Badge variant={client.status === "active" ? "default" : "secondary"}>
            {client.status}
          </Badge>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Last: {format(lastSession, "MMM d")}</span>
          {nextSession && (
            <span
              className={
                daysUntilNext !== null && daysUntilNext <= 1 ? "text-orange-600 font-medium" : ""
              }
            >
              Next: {format(nextSession, "MMM d")}
              {daysUntilNext !== null && daysUntilNext <= 7 && ` (${daysUntilNext}d)`}
            </span>
          )}
        </div>

        {/* Timeline Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
            style={{
              width: `${Math.min(100, (client.totalSessions / 10) * 100)}%`,
            }}
          />
          {nextSession && isAfter(nextSession, new Date()) && (
            <div
              className="absolute top-0 w-1 h-full bg-orange-500 rounded-full"
              style={{
                left: `${Math.min(
                  95,
                  ((Date.now() - lastSession.getTime()) /
                    (nextSession.getTime() - lastSession.getTime())) *
                    100,
                )}%`,
              }}
            />
          )}
        </div>

        {/* Session Dots */}
        <div className="flex justify-between mt-1">
          {sortedMilestones.slice(0, 5).map((milestone) => (
            <div
              key={milestone.id}
              className={`w-2 h-2 rounded-full ${
                milestone.type === "completed"
                  ? "bg-green-500"
                  : milestone.type === "scheduled"
                    ? "bg-blue-500"
                    : milestone.type === "cancelled"
                      ? "bg-red-500"
                      : "bg-gray-500"
              }`}
              title={`${format(new Date(milestone.date), "MMM d")} - ${milestone.type}`}
            />
          ))}
          {milestones.length > 5 && (
            <div className="text-xs text-muted-foreground ml-1">+{milestones.length - 5}</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {sortedMilestones.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">Recent Activity</h5>
          <div className="space-y-1">
            {sortedMilestones.slice(0, 2).map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {milestone.type === "completed" ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : milestone.type === "scheduled" ? (
                    <Calendar className="h-3 w-3 text-blue-500" />
                  ) : milestone.type === "cancelled" ? (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-500" />
                  )}
                  <span>Session #{milestone.sessionNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{format(new Date(milestone.date), "MMM d")}</span>
                  <span>${milestone.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          <Calendar className="h-3 w-3 mr-1" />
          Schedule
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <MessageSquare className="h-3 w-3 mr-1" />
          Message
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          <TrendingUp className="h-3 w-3 mr-1" />
          Details
        </Button>
      </div>
    </div>
  );
}
