import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Users, Calendar, Brain, MessageSquare, FileText } from "lucide-react";
import { QuickActionsProps } from "./types";

export function QuickActions({
  onNewSession,
  onScheduleFollowup,
  onGenerateInsights,
  onSendMessage,
  onViewHistory,
}: QuickActionsProps): JSX.Element {
  const actions = [
    {
      icon: Users,
      label: "New Client Session",
      description: "Schedule a new appointment",
      action: onNewSession,
      variant: "default" as const,
    },
    {
      icon: Calendar,
      label: "Schedule Follow-up",
      description: "Book a follow-up session",
      action: onScheduleFollowup,
      variant: "outline" as const,
    },
    {
      icon: Brain,
      label: "Generate Insights",
      description: "AI-powered recommendations",
      action: onGenerateInsights,
      variant: "outline" as const,
    },
    {
      icon: MessageSquare,
      label: "Send Message",
      description: "Contact a client",
      action: onSendMessage,
      variant: "outline" as const,
    },
    {
      icon: FileText,
      label: "View History",
      description: "Client session history",
      action: onViewHistory,
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              className="w-full justify-start h-auto p-3"
              variant={action.variant}
              onClick={action.action}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
