"use client";

import { useMemo } from "react";
import { EisenhowerQuadrant } from "./EisenhowerQuadrant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Lightbulb, TrendingUp, BarChart3 } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface EisenhowerMatrixProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onAddTask?: (quadrant: string) => void;
  isLoading?: boolean;
  showInsights?: boolean;
  className?: string;
}

interface MatrixInsight {
  type: "warning" | "success" | "info";
  message: string;
  action?: string;
}

function generateMatrixInsights(
  urgentImportant: Task[],
  importantNotUrgent: Task[], 
  urgentNotImportant: Task[],
  notUrgentNotImportant: Task[]
): MatrixInsight[] {
  const insights: MatrixInsight[] = [];
  
  // Crisis management insight
  if (urgentImportant.length > 5) {
    insights.push({
      type: "warning",
      message: `You have ${urgentImportant.length} crisis tasks. Consider delegating or rescheduling some items.`,
      action: "Review priorities"
    });
  }
  
  // Strategic planning insight
  if (importantNotUrgent.length < 3) {
    insights.push({
      type: "info", 
      message: "Consider adding more strategic, long-term tasks to prevent future crises.",
      action: "Plan ahead"
    });
  }
  
  // Delegation opportunity
  if (urgentNotImportant.length > 3) {
    insights.push({
      type: "warning",
      message: `${urgentNotImportant.length} tasks could potentially be delegated or automated.`,
      action: "Delegate"
    });
  }
  
  // Elimination candidate
  if (notUrgentNotImportant.length > 5) {
    insights.push({
      type: "info",
      message: `${notUrgentNotImportant.length} tasks might be candidates for elimination.`,
      action: "Review necessity"
    });
  }
  
  // Balanced matrix
  const total = urgentImportant.length + importantNotUrgent.length + urgentNotImportant.length + notUrgentNotImportant.length;
  if (total > 0 && importantNotUrgent.length > urgentImportant.length) {
    insights.push({
      type: "success",
      message: "Great balance! You're focusing on important, strategic work.",
      action: "Keep it up"
    });
  }
  
  return insights.slice(0, 3); // Limit to 3 insights
}

export function EisenhowerMatrix({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  isLoading = false,
  showInsights = true,
  className = "",
}: EisenhowerMatrixProps) {
  
  const { quadrants, insights } = useMemo(() => {
    // Categorize tasks into quadrants based on priority and due date
    const urgentImportant: Task[] = [];
    const importantNotUrgent: Task[] = [];
    const urgentNotImportant: Task[] = [];
    const notUrgentNotImportant: Task[] = [];
    
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    tasks
      .filter(task => task.status !== "done" && task.status !== "cancelled")
      .forEach(task => {
        const isImportant = task.priority === "high" || task.priority === "urgent";
        const isUrgent = task.dueDate ? new Date(task.dueDate) <= twoDaysFromNow : false;
        
        if (isUrgent && isImportant) {
          urgentImportant.push(task);
        } else if (isImportant && !isUrgent) {
          importantNotUrgent.push(task);
        } else if (isUrgent && !isImportant) {
          urgentNotImportant.push(task);
        } else {
          notUrgentNotImportant.push(task);
        }
      });
    
    const matrixInsights = generateMatrixInsights(
      urgentImportant,
      importantNotUrgent,
      urgentNotImportant,
      notUrgentNotImportant
    );
    
    return {
      quadrants: {
        urgentImportant,
        importantNotUrgent,
        urgentNotImportant,
        notUrgentNotImportant,
      },
      insights: matrixInsights
    };
  }, [tasks]);
  
  const totalTasks = Object.values(quadrants).reduce((sum, tasks) => sum + tasks.length, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Matrix Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Eisenhower Matrix
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize tasks by urgency and importance for strategic focus
          </p>
        </div>
        
        <Badge variant="secondary" className="px-3">
          <BarChart3 className="h-3 w-3 mr-1" />
          {totalTasks} tasks
        </Badge>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EisenhowerQuadrant
          quadrant="urgent-important"
          title="Do First (Urgent + Important)"
          description="Crisis tasks requiring immediate attention. Minimize these through better planning."
          tasks={quadrants.urgentImportant}
          onTaskClick={onTaskClick}
          onTaskComplete={onTaskComplete}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onAddTask={onAddTask}
          isLoading={isLoading}
        />
        
        <EisenhowerQuadrant
          quadrant="important-not-urgent"
          title="Schedule (Important + Not Urgent)"
          description="Strategic activities that prevent crises. Focus most of your energy here."
          tasks={quadrants.importantNotUrgent}
          onTaskClick={onTaskClick}
          onTaskComplete={onTaskComplete}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onAddTask={onAddTask}
          isLoading={isLoading}
        />
        
        <EisenhowerQuadrant
          quadrant="urgent-not-important"
          title="Delegate (Urgent + Not Important)"  
          description="Interruptions and distractions. Delegate, automate, or minimize these tasks."
          tasks={quadrants.urgentNotImportant}
          onTaskClick={onTaskClick}
          onTaskComplete={onTaskComplete}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onAddTask={onAddTask}
          isLoading={isLoading}
        />
        
        <EisenhowerQuadrant
          quadrant="not-urgent-not-important"
          title="Eliminate (Neither Urgent nor Important)"
          description="Time wasters and distractions. Consider eliminating or doing in spare time."
          tasks={quadrants.notUrgentNotImportant}
          onTaskClick={onTaskClick}
          onTaskComplete={onTaskComplete}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onAddTask={onAddTask}
          isLoading={isLoading}
        />
      </div>

      {/* Matrix Insights */}
      {showInsights && insights.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Matrix Insights
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1">
                  {insight.type === "warning" && <TrendingUp className="h-4 w-4 text-orange-500" />}
                  {insight.type === "success" && <Target className="h-4 w-4 text-green-500" />}
                  {insight.type === "info" && <Lightbulb className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{insight.message}</p>
                  {insight.action && (
                    <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs">
                      {insight.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}