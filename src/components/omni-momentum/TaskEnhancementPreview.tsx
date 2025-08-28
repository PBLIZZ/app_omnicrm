"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Clock, 
  Target, 
  Lightbulb, 
  CheckCircle,
  AlertCircle,
  Edit3
} from "lucide-react";
import { PriorityBadge } from "@/components/shared/tasks";
import type { TaskEnhancementResponse } from "@/server/ai/task-enhancement";

interface TaskEnhancementPreviewProps {
  enhancement: TaskEnhancementResponse;
  originalTitle: string;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getConfidenceColor = () => {
    if (confidence >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (confidence >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getConfidenceIcon = () => {
    if (confidence >= 80) return <CheckCircle className="h-3 w-3" />;
    if (confidence >= 60) return <AlertCircle className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  return (
    <Badge variant="outline" className={`text-xs ${getConfidenceColor()}`}>
      {getConfidenceIcon()}
      <span className="ml-1">{confidence}% confident</span>
    </Badge>
  );
}

export function TaskEnhancementPreview({
  enhancement,
  originalTitle,
  onAccept,
  onEdit,
  onReject,
  isLoading = false,
}: TaskEnhancementPreviewProps) {
  const hasChanges = enhancement.enhancedTitle !== originalTitle;
  const hasSubtasks = enhancement.subtasks && enhancement.subtasks.length > 0;
  
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Enhancement Preview
          </CardTitle>
          <ConfidenceBadge confidence={enhancement.confidenceLevel} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Enhanced Title */}
        {hasChanges && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Enhanced Title</h4>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-sm">{enhancement.enhancedTitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Original: <em>{originalTitle}</em>
            </p>
          </div>
        )}

        {/* Description */}
        {enhancement.description && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Description</h4>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-sm text-gray-700">{enhancement.description}</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <PriorityBadge priority={enhancement.priority} size="sm" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Estimated Time</p>
              <p className="text-sm font-medium">
                {enhancement.estimatedMinutes < 60 
                  ? `${enhancement.estimatedMinutes}m`
                  : `${Math.floor(enhancement.estimatedMinutes / 60)}h ${enhancement.estimatedMinutes % 60}m`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {enhancement.category.replace("-", " ")}
            </Badge>
          </div>
        </div>

        {/* Tags */}
        {enhancement.suggestedTags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Suggested Tags</h4>
            <div className="flex flex-wrap gap-1">
              {enhancement.suggestedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks */}
        {hasSubtasks && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Suggested Subtasks</h4>
            <div className="space-y-1">
              {enhancement.subtasks!.map((subtask, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm">{subtask.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {subtask.estimatedMinutes}m
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* AI Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </h4>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Reasoning: </span>
              {enhancement.aiInsights.reasoning}
            </div>
            
            {enhancement.aiInsights.businessAlignment && (
              <div>
                <span className="font-medium">Business Alignment: </span>
                {enhancement.aiInsights.businessAlignment}
              </div>
            )}
            
            {enhancement.aiInsights.urgencyFactors.length > 0 && (
              <div>
                <span className="font-medium">Urgency Factors: </span>
                {enhancement.aiInsights.urgencyFactors.join(", ")}
              </div>
            )}

            {enhancement.aiInsights.suggestions.length > 0 && (
              <div>
                <span className="font-medium">Suggestions: </span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {enhancement.aiInsights.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-xs">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={onReject}
            disabled={isLoading}
            size="sm"
          >
            Use Original
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onEdit}
            disabled={isLoading}
            size="sm"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Button 
            onClick={onAccept}
            disabled={isLoading}
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Enhancement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}