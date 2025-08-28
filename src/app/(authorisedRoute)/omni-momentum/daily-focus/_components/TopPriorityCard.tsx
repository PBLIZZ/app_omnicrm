"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Users, Edit, MoreHorizontal, Sparkles } from "lucide-react";
import { TaskActions, PriorityBadge, UrgencyIndicator, StatusBadge } from "@/components/shared/tasks";
import type { Task } from "@/server/db/schema";

interface TopPriorityCardProps {
  task: Task & { 
    urgency?: "overdue" | "due_today" | "due_soon" | "future";
    taggedContactsData?: Array<{ id: string; displayName: string; }>;
  };
  rank: number; // 1, 2, or 3
  onComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  showRank?: boolean;
  isLoading?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  const getRankStyle = () => {
    switch (rank) {
      case 1: return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white";
      case 2: return "bg-gradient-to-r from-gray-300 to-gray-400 text-white";
      case 3: return "bg-gradient-to-r from-amber-600 to-amber-700 text-white";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getRankLabel = () => {
    switch (rank) {
      case 1: return "🥇 Top Priority";
      case 2: return "🥈 Second Priority";
      case 3: return "🥉 Third Priority";
      default: return `#${rank}`;
    }
  };

  return (
    <Badge className={`${getRankStyle()} font-medium text-xs`}>
      {getRankLabel()}
    </Badge>
  );
}

function TimeEstimate({ estimatedMinutes, actualMinutes }: { 
  estimatedMinutes?: number | null; 
  actualMinutes?: number | null;
}) {
  if (!estimatedMinutes && !actualMinutes) return null;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const timeToShow = actualMinutes || estimatedMinutes!;

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{formatTime(timeToShow)}</span>
      {actualMinutes && estimatedMinutes && actualMinutes !== estimatedMinutes && (
        <span className="text-xs opacity-75">(est. {formatTime(estimatedMinutes)})</span>
      )}
    </div>
  );
}

function ContactIndicator({ contacts }: { 
  contacts?: Array<{ id: string; displayName: string; }> 
}) {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Users className="h-3 w-3" />
      <span>
        {contacts.length === 1 
          ? contacts[0].displayName 
          : `${contacts.length} contacts`
        }
      </span>
    </div>
  );
}

export function TopPriorityCard({
  task,
  rank,
  onComplete,
  onEdit,
  onDelete,
  showRank = true,
  isLoading = false,
}: TopPriorityCardProps) {
  const isCompleted = task.status === "done";
  const isOverdue = task.urgency === "overdue";
  const isDueToday = task.urgency === "due_today";
  const isAIGenerated = task.source === "ai_generated";

  const handleComplete = () => {
    if (onComplete && !isCompleted) {
      onComplete(task.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) onEdit(task);
  };

  const cardClass = `
    relative transition-all duration-200 hover:shadow-lg
    ${isCompleted ? "opacity-75 bg-green-50/50" : ""}
    ${isOverdue ? "border-l-4 border-l-red-500" : ""}
    ${isDueToday ? "border-l-4 border-l-orange-500" : ""}
    ${rank === 1 ? "ring-2 ring-yellow-200 shadow-md" : ""}
  `;

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {showRank && <RankBadge rank={rank} />}
            {isAIGenerated && (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                <Sparkles className="h-2 w-2 mr-1" />
                AI
              </Badge>
            )}
          </div>
          
          <TaskActions
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            variant="dropdown"
            size="sm"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Task Title and Description */}
        <div className="space-y-2">
          <h3 className={`font-medium text-lg leading-tight ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Status and Priority Row */}
        <div className="flex items-center gap-3">
          <StatusBadge status={task.status} size="sm" />
          <PriorityBadge priority={task.priority} size="sm" />
          {task.urgency && (
            <UrgencyIndicator urgency={task.urgency} size="sm" />
          )}
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TimeEstimate 
              estimatedMinutes={task.estimatedMinutes} 
              actualMinutes={task.actualMinutes} 
            />
            <ContactIndicator contacts={task.taggedContactsData} />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Completed
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEdit}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Motivational note for #1 priority */}
        {rank === 1 && !isCompleted && (
          <div className="text-xs text-center text-muted-foreground bg-yellow-50 p-2 rounded">
            Your most important task today! 🌟
          </div>
        )}
      </CardContent>
    </Card>
  );
}