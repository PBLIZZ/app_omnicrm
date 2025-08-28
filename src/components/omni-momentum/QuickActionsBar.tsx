"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Calendar, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Zap,
  Clock,
  Target,
  Sparkles
} from "lucide-react";

interface QuickActionsBarProps {
  onCreateTask?: () => void;
  onViewCalendar?: () => void;
  onViewContacts?: () => void;
  onOpenChat?: () => void;
  onViewAnalytics?: () => void;
  onQuickCapture?: () => void;
  pendingTasks?: number;
  todayEvents?: number;
  variant?: "horizontal" | "vertical" | "compact";
  showLabels?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: number;
  description?: string;
  primary?: boolean;
}

export function QuickActionsBar({
  onCreateTask,
  onViewCalendar,
  onViewContacts,
  onOpenChat,
  onViewAnalytics,
  onQuickCapture,
  pendingTasks,
  todayEvents,
  variant = "horizontal",
  showLabels = true,
}: QuickActionsBarProps) {
  
  const actions: QuickAction[] = [
    {
      id: "quick-capture",
      label: "Quick Capture",
      icon: <Zap className="h-4 w-4" />,
      onClick: onQuickCapture || onCreateTask,
      description: "Rapidly capture a new task with AI enhancement",
      primary: true,
    },
    {
      id: "create-task",
      label: "New Task",
      icon: <Plus className="h-4 w-4" />,
      onClick: onCreateTask,
      description: "Create a detailed task",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="h-4 w-4" />,
      onClick: onViewCalendar,
      badge: todayEvents,
      description: "View today's schedule",
    },
    {
      id: "contacts",
      label: "Contacts",
      icon: <Users className="h-4 w-4" />,
      onClick: onViewContacts,
      description: "Manage client relationships",
    },
    {
      id: "chat",
      label: "AI Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: onOpenChat,
      description: "Get AI assistance with your tasks",
    },
    {
      id: "analytics",
      label: "Insights",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: onViewAnalytics,
      description: "View productivity insights",
    },
  ];

  // Filter out actions without handlers
  const availableActions = actions.filter(action => action.onClick);

  const ActionButton = ({ action }: { action: QuickAction }) => {
    const buttonSize = variant === "compact" ? "sm" : "default";
    const buttonVariant = action.primary ? "default" : "outline";
    
    return (
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={action.onClick}
        className={`
          relative
          ${variant === "compact" ? "p-2" : ""}
          ${action.primary ? "bg-primary hover:bg-primary/90" : ""}
        `}
        title={action.description}
      >
        <div className="flex items-center gap-2">
          {action.icon}
          {showLabels && variant !== "compact" && (
            <span className="text-sm">{action.label}</span>
          )}
        </div>
        
        {action.badge && action.badge > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {action.badge > 99 ? "99+" : action.badge}
          </Badge>
        )}
      </Button>
    );
  };

  if (variant === "vertical") {
    return (
      <Card className="w-fit">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            {availableActions.map((action, index) => (
              <div key={action.id}>
                <ActionButton action={action} />
                {index < availableActions.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {availableActions.slice(0, 4).map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
        {availableActions.length > 4 && (
          <Button variant="outline" size="sm" className="p-2">
            <span className="text-xs">+{availableActions.length - 4}</span>
          </Button>
        )}
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Quick Actions
            </h3>
            
            {pendingTasks && pendingTasks > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-2 w-2 mr-1" />
                {pendingTasks} pending
              </Badge>
            )}
          </div>

          {/* Primary Actions Row */}
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>

          {/* Wellness Tip */}
          <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Productivity Tip:</strong> Use Quick Capture for spontaneous ideas, 
                then review and organize them during your weekly planning session.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}