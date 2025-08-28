"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/shared/tasks/TaskCard";
import { Plus, ArrowUpRight, Clock, AlertTriangle } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface EisenhowerQuadrantProps {
  quadrant: "urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important";
  title: string;
  description: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask?: (quadrant: string) => void;
  isLoading?: boolean;
  maxTasks?: number;
}

const quadrantStyles = {
  "urgent-important": {
    border: "border-red-200",
    bg: "bg-red-50",
    header: "bg-red-100",
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    badge: "bg-red-600"
  },
  "important-not-urgent": {
    border: "border-blue-200", 
    bg: "bg-blue-50",
    header: "bg-blue-100",
    icon: <ArrowUpRight className="h-4 w-4 text-blue-600" />,
    badge: "bg-blue-600"
  },
  "urgent-not-important": {
    border: "border-orange-200",
    bg: "bg-orange-50", 
    header: "bg-orange-100",
    icon: <Clock className="h-4 w-4 text-orange-600" />,
    badge: "bg-orange-600"
  },
  "not-urgent-not-important": {
    border: "border-gray-200",
    bg: "bg-gray-50",
    header: "bg-gray-100", 
    icon: <Plus className="h-4 w-4 text-gray-600" />,
    badge: "bg-gray-600"
  }
};

export function EisenhowerQuadrant({
  quadrant,
  title,
  description,
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  isLoading = false,
  maxTasks = 6,
}: EisenhowerQuadrantProps) {
  const style = quadrantStyles[quadrant];
  const displayTasks = tasks.slice(0, maxTasks);
  const hasMoreTasks = tasks.length > maxTasks;

  return (
    <Card className={`${style.border} ${style.bg} h-full min-h-[400px] flex flex-col`}>
      <CardHeader className={`${style.header} pb-3`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {style.icon}
            {title}
            <Badge className={`${style.badge} text-white text-xs px-2`}>
              {tasks.length}
            </Badge>
          </CardTitle>
          
          {onAddTask && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask(quadrant)}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 pt-0 pb-4">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white/50 rounded animate-pulse" />
              ))}
            </div>
          ) : displayTasks.length > 0 ? (
            <>
              {displayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  variant="compact"
                  onTaskClick={onTaskClick}
                  onComplete={onTaskComplete}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                  showQuadrant={false}
                  showTimer={false}
                  className="hover:shadow-sm transition-shadow"
                />
              ))}
              
              {hasMoreTasks && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    +{tasks.length - maxTasks} more tasks
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-2">🌱</div>
              <p className="text-sm text-muted-foreground mb-3">
                No tasks in this quadrant
              </p>
              {onAddTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddTask(quadrant)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add task
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}