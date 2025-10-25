"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Target, ChevronDown, ChevronUp, Plus } from "lucide-react";

interface NextStepsGoalsCardProps {
  contactId: string;
}

interface NextStep {
  id: string;
  title: string;
  description: string;
  dueDate?: Date;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  targetDate?: Date;
  status: "active" | "completed" | "paused";
}

// Mock data for now - in production this would come from an API
const mockNextSteps: NextStep[] = [
  {
    id: "1",
    title: "Follow up on breathing exercises",
    description: "Check in on client's progress with the breathing techniques discussed",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    priority: "high",
    completed: false,
  },
  {
    id: "2",
    title: "Schedule next massage session",
    description: "Book 90-minute deep tissue massage for next week",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    priority: "medium",
    completed: false,
  },
  {
    id: "3",
    title: "Review client's pain journal",
    description: "Analyze the pain tracking data client has been keeping",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    priority: "low",
    completed: true,
  },
];

const mockGoals: Goal[] = [
  {
    id: "1",
    title: "Reduce chronic back pain",
    description: "Help client achieve 50% reduction in lower back pain intensity",
    progress: 65,
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: "active",
  },
  {
    id: "2",
    title: "Improve sleep quality",
    description: "Establish better sleep hygiene and relaxation techniques",
    progress: 40,
    targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    status: "active",
  },
  {
    id: "3",
    title: "Stress management",
    description: "Develop effective stress management strategies",
    progress: 100,
    status: "completed",
  },
];

const getPriorityColor = (priority: NextStep["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: Goal["status"]) => {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "paused":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

/**
 * Next Steps & Goals Card Component
 * Collapsible sections for next steps and goals
 */
export function NextStepsGoalsCard({ contactId }: NextStepsGoalsCardProps): JSX.Element {
  const [nextStepsExpanded, setNextStepsExpanded] = useState(true);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  // In production, this would fetch from an API endpoint
  const { data: nextSteps, isLoading: nextStepsLoading } = useQuery({
    queryKey: [`/api/contacts/${contactId}/next-steps`],
    queryFn: async (): Promise<NextStep[]> => {
      // TODO: Implement actual API call
      return mockNextSteps;
    },
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: [`/api/contacts/${contactId}/goals`],
    queryFn: async (): Promise<Goal[]> => {
      // TODO: Implement actual API call
      return mockGoals;
    },
  });

  const activeGoals = goals?.filter((goal) => goal.status === "active") || [];
  const completedGoals = goals?.filter((goal) => goal.status === "completed") || [];

  return (
    <div className="space-y-4">
      {/* Next Steps Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Next Steps ({nextSteps?.length || 0})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNextStepsExpanded(!nextStepsExpanded)}
              className="h-6 w-6 p-0"
            >
              {nextStepsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {nextStepsExpanded && (
          <CardContent className="pt-0">
            {nextStepsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : nextSteps && nextSteps.length > 0 ? (
              <div className="space-y-3">
                {nextSteps.map((step) => (
                  <div key={step.id} className="flex items-start space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 mt-0.5"
                      onClick={() => {
                        // TODO: Toggle completion status
                      }}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-medium ${step.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {step.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(step.priority)}`}
                        >
                          {step.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      {step.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {step.dueDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No next steps yet</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Goals ({goals?.length || 0})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGoalsExpanded(!goalsExpanded)}
              className="h-6 w-6 p-0"
            >
              {goalsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {goalsExpanded && (
          <CardContent className="pt-0">
            {goalsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-muted rounded animate-pulse w-full" />
                  </div>
                ))}
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="space-y-4">
                {/* Active Goals */}
                {activeGoals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Active Goals</h4>
                    <div className="space-y-3">
                      {activeGoals.map((goal) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{goal.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(goal.status)}`}
                            >
                              {goal.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{goal.description}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>
                          {goal.targetDate && (
                            <p className="text-xs text-muted-foreground">
                              Target: {goal.targetDate.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Goals */}
                {completedGoals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Completed Goals</h4>
                    <div className="space-y-2">
                      {completedGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-muted-foreground line-through">
                            {goal.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No goals set yet</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
