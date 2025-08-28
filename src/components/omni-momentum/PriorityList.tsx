"use client";

import { TopPriorityCard } from "./TopPriorityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle, Clock } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface PriorityListProps {
  tasks: Array<Task & { 
    urgency?: "overdue" | "due_today" | "due_soon" | "future";
    taggedContactsData?: Array<{ id: string; displayName: string; }>;
  }>;
  onTaskComplete?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  isLoading?: boolean;
  maxTasks?: number;
  showEmptyState?: boolean;
}

function EmptyState() {
  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <Target className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          No priority tasks yet
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Create your first task to get started with today's focus. 
          Let AI help you prioritize and organize your wellness practice.
        </p>
      </CardContent>
    </Card>
  );
}

function AllCompleteState() {
  return (
    <Card className="border-2 border-green-200 bg-green-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-green-100 p-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-green-700 mb-2">
          🎉 All priorities complete!
        </h3>
        <p className="text-sm text-green-600 text-center max-w-sm">
          Wonderful! You've completed all your priority tasks for today. 
          Take a moment to celebrate and perhaps add some self-care time.
        </p>
      </CardContent>
    </Card>
  );
}

function PriorityStats({ tasks }: { tasks: Array<{ status: string; urgency?: string }> }) {
  const completed = tasks.filter(t => t.status === "done").length;
  const total = tasks.length;
  const overdue = tasks.filter(t => t.urgency === "overdue").length;
  const dueToday = tasks.filter(t => t.urgency === "due_today").length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>{completed}/{total} complete</span>
      </div>
      
      {overdue > 0 && (
        <Badge variant="destructive" className="text-xs">
          <Clock className="h-2 w-2 mr-1" />
          {overdue} overdue
        </Badge>
      )}
      
      {dueToday > 0 && (
        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
          <Clock className="h-2 w-2 mr-1" />
          {dueToday} due today
        </Badge>
      )}
    </div>
  );
}

export function PriorityList({
  tasks,
  onTaskComplete,
  onTaskEdit,
  onTaskDelete,
  isLoading = false,
  maxTasks = 3,
  showEmptyState = true,
}: PriorityListProps) {
  const displayTasks = tasks.slice(0, maxTasks);
  const hasActiveTasks = displayTasks.some(task => task.status !== "done");
  const allCompleted = displayTasks.length > 0 && displayTasks.every(task => task.status === "done");

  if (displayTasks.length === 0 && showEmptyState) {
    return <EmptyState />;
  }

  if (allCompleted) {
    return <AllCompleteState />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Today's Top {maxTasks}
          </h2>
          <p className="text-sm text-muted-foreground">
            Focus on these {maxTasks} priorities to make today meaningful
          </p>
        </div>
      </div>

      {/* Stats */}
      {displayTasks.length > 0 && (
        <PriorityStats tasks={displayTasks} />
      )}

      {/* Priority Cards */}
      <div className="grid gap-4 md:gap-6">
        {displayTasks.map((task, index) => (
          <TopPriorityCard
            key={task.id}
            task={task}
            rank={index + 1}
            onComplete={onTaskComplete}
            onEdit={onTaskEdit}
            onDelete={onTaskDelete}
            showRank={true}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Wellness Tip */}
      {hasActiveTasks && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="font-medium text-sm mb-1">Wellness Tip</h4>
                <p className="text-xs text-muted-foreground">
                  Take mindful breaks between tasks. Even 2 minutes of deep breathing 
                  can refresh your energy and improve focus for the next priority.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}