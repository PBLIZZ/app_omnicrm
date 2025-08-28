"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Lightbulb, 
  Clock, 
  TrendingUp, 
  Heart, 
  Users, 
  Calendar,
  Sparkles,
  ArrowRight,
  Target
} from "lucide-react";
import { useTaskEnhancements } from "@/hooks/use-task-enhancements";

interface AIInsightsPanelProps {
  currentSchedule?: {
    nextEvent?: string;
    timeUntilNext?: number; // minutes
    availability?: "busy" | "free" | "limited";
  };
  taskContext?: {
    completedToday: number;
    pendingCount: number;
    overdueCount: number;
  };
  energyLevel?: number;
  size?: "compact" | "default";
}

interface ContextualSuggestion {
  type: "task" | "break" | "focus" | "wellness";
  title: string;
  description: string;
  timeEstimate?: number;
  priority: "low" | "medium" | "high";
  icon: React.ReactNode;
  action?: () => void;
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case "task": return <Clock className="h-4 w-4" />;
    case "break": return <Heart className="h-4 w-4" />;
    case "focus": return <Target className="h-4 w-4" />;
    case "wellness": return <Sparkles className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
}

function generateContextualSuggestions(
  schedule: AIInsightsPanelProps["currentSchedule"],
  taskContext: AIInsightsPanelProps["taskContext"],
  energyLevel: number
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  
  // Time-based suggestions
  if (schedule?.timeUntilNext) {
    const minutes = schedule.timeUntilNext;
    
    if (minutes >= 45) {
      suggestions.push({
        type: "task",
        title: "Deep Work Session",
        description: `You have ${minutes} minutes before your next commitment. Perfect for focused work on a high-priority task.`,
        timeEstimate: 45,
        priority: "high",
        icon: <Clock className="h-4 w-4" />,
      });
    } else if (minutes >= 15) {
      suggestions.push({
        type: "task", 
        title: "Quick Task Sprint",
        description: `${minutes} minutes is ideal for knocking out a quick administrative task or client follow-up.`,
        timeEstimate: minutes,
        priority: "medium",
        icon: <TrendingUp className="h-4 w-4" />,
      });
    } else if (minutes >= 5) {
      suggestions.push({
        type: "break",
        title: "Mindful Transition",
        description: "Take a few minutes to center yourself before your next appointment.",
        timeEstimate: minutes,
        priority: "medium",
        icon: <Heart className="h-4 w-4" />,
      });
    }
  }

  // Energy-based suggestions
  if (energyLevel <= 2) {
    suggestions.push({
      type: "wellness",
      title: "Energy Boost Break",
      description: "Your energy seems low. Consider a 5-minute walk or some gentle stretching.",
      timeEstimate: 5,
      priority: "high", 
      icon: <Heart className="h-4 w-4" />,
    });
  } else if (energyLevel >= 4) {
    suggestions.push({
      type: "focus",
      title: "Tackle Challenging Task",
      description: "Your energy is high! This is the perfect time for your most demanding work.",
      priority: "high",
      icon: <Sparkles className="h-4 w-4" />,
    });
  }

  // Task context suggestions
  if (taskContext?.overdueCount && taskContext.overdueCount > 0) {
    suggestions.push({
      type: "task",
      title: "Address Overdue Items",
      description: `You have ${taskContext.overdueCount} overdue task${taskContext.overdueCount > 1 ? 's' : ''}. Consider tackling the smallest one first.`,
      priority: "high",
      icon: <Clock className="h-4 w-4" />,
    });
  }

  // General wellness suggestions
  const hour = new Date().getHours();
  if (hour >= 14 && hour <= 16) {
    suggestions.push({
      type: "wellness",
      title: "Afternoon Renewal",
      description: "Mid-afternoon is perfect for a hydration break or brief meditation to maintain focus.",
      timeEstimate: 3,
      priority: "low",
      icon: <Heart className="h-4 w-4" />,
    });
  }

  return suggestions.slice(0, 3); // Limit to top 3 suggestions
}

function SuggestionCard({ suggestion }: { suggestion: ContextualSuggestion }) {
  const priorityColors = {
    low: "border-gray-200 bg-gray-50",
    medium: "border-blue-200 bg-blue-50",
    high: "border-orange-200 bg-orange-50",
  };

  return (
    <div className={`p-3 rounded-lg border ${priorityColors[suggestion.priority]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
            {suggestion.description}
          </p>
          <div className="flex items-center justify-between">
            {suggestion.timeEstimate && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-2 w-2 mr-1" />
                {suggestion.timeEstimate}m
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={suggestion.action}
            >
              Try it <ArrowRight className="h-2 w-2 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIInsightsPanel({
  currentSchedule,
  taskContext = { completedToday: 0, pendingCount: 0, overdueCount: 0 },
  energyLevel = 3,
  size = "default",
}: AIInsightsPanelProps) {
  const { contextSuggestions, isLoadingSuggestions } = useTaskEnhancements();
  
  const suggestions = generateContextualSuggestions(currentSchedule, taskContext, energyLevel);
  
  const isCompact = size === "compact";

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className={`${isCompact ? "pb-3" : "pb-4"}`}>
        <CardTitle className={`${isCompact ? "text-base" : "text-lg"} flex items-center gap-2`}>
          <Lightbulb className="h-5 w-5 text-purple-600" />
          AI Insights
          {isLoadingSuggestions && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-2 w-2 mr-1 animate-pulse" />
              Updating...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Context */}
        {(currentSchedule?.nextEvent || taskContext.pendingCount > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Current Context</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {currentSchedule?.nextEvent && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Next: {currentSchedule.nextEvent}</span>
                  {currentSchedule.timeUntilNext && (
                    <Badge variant="outline" className="text-xs">
                      in {currentSchedule.timeUntilNext}m
                    </Badge>
                  )}
                </div>
              )}
              
              {taskContext.pendingCount > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{taskContext.pendingCount} pending tasks</span>
                  {taskContext.overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {taskContext.overdueCount} overdue
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {suggestions.length > 0 && <Separator />}

        {/* AI Suggestions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Smart Suggestions
          </h4>
          
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        </div>

        {/* Fallback for no suggestions */}
        {suggestions.length === 0 && !isLoadingSuggestions && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm text-muted-foreground">
              You're doing great! Keep up the mindful focus on your priorities.
            </p>
          </div>
        )}

        {/* Wellness reminder */}
        {!isCompact && (
          <>
            <Separator />
            <div className="text-xs text-center text-purple-600 bg-white/50 p-2 rounded">
              💡 Remember: Progress over perfection. You're creating positive change! ✨
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}