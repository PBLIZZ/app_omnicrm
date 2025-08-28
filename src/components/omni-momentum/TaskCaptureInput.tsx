"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sparkles, Zap } from "lucide-react";
import { useTaskEnhancements } from "@/hooks/use-task-enhancements";

interface TaskCaptureInputProps {
  onTaskCreate: (taskData: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    estimatedMinutes?: number;
    suggestedTags?: string[];
  }) => void;
  placeholder?: string;
  showEnhancement?: boolean;
  autoFocus?: boolean;
  size?: "sm" | "default" | "lg";
}

export function TaskCaptureInput({
  onTaskCreate,
  placeholder = "What needs to get done?",
  showEnhancement = true,
  autoFocus = false,
  size = "default",
}: TaskCaptureInputProps) {
  const [input, setInput] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const { 
    suggestCategory, 
    enhanceTask, 
    shouldUseAIEnhancement,
    isCategorizing 
  } = useTaskEnhancements();

  const isLarge = size === "lg";
  const isSmall = size === "sm";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    const taskTitle = input.trim();
    setIsEnhancing(true);

    try {
      if (showEnhancement && shouldUseAIEnhancement(taskTitle)) {
        // Use full AI enhancement for complex tasks
        const enhancement = await enhanceTask({
          title: taskTitle,
          userContext: {
            existingTags: [], // Could be populated from context
            businessPriorities: ["client-care", "wellness", "growth"],
          }
        });

        onTaskCreate({
          title: enhancement.enhancedTitle,
          description: enhancement.description,
          category: enhancement.category,
          priority: enhancement.priority,
          estimatedMinutes: enhancement.estimatedMinutes,
          suggestedTags: enhancement.suggestedTags,
        });
      } else {
        // Quick categorization for simple tasks
        const categoryData = await suggestCategory(taskTitle);
        
        onTaskCreate({
          title: taskTitle,
          category: categoryData.category,
          priority: "medium",
          estimatedMinutes: 30,
          suggestedTags: [],
        });
      }

      setInput("");
    } catch (error) {
      // Fallback to basic task creation
      onTaskCreate({
        title: taskTitle,
        priority: "medium",
        estimatedMinutes: 30,
      });
      setInput("");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleQuickAdd = () => {
    if (!input.trim()) return;
    
    onTaskCreate({
      title: input.trim(),
      priority: "medium",
      estimatedMinutes: 30,
    });
    setInput("");
  };

  const isLoading = isEnhancing || isCategorizing;

  return (
    <Card className={`${isSmall ? "" : "shadow-sm border-2"} ${isLarge ? "border-primary/20" : ""}`}>
      {isLarge && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            Quick Capture
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={`${isLarge ? "" : "p-4"}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              disabled={isLoading}
              className={`
                flex-1 
                ${isLarge ? "h-12 text-lg" : isSmall ? "h-8 text-sm" : "h-10"}
                ${isLoading ? "opacity-50" : ""}
              `}
            />
            
            {showEnhancement ? (
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`${isSmall ? "px-3" : "px-4"} ${isLarge ? "h-12" : isSmall ? "h-8" : "h-10"}`}
              >
                {isLoading ? (
                  <Loader2 className={`${isSmall ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
                ) : (
                  <>
                    <Sparkles className={`${isSmall ? "h-3 w-3" : "h-4 w-4"} ${isSmall ? "" : "mr-2"}`} />
                    {!isSmall && "Enhance"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleQuickAdd}
                disabled={!input.trim()}
                className={`${isSmall ? "px-3" : "px-4"} ${isLarge ? "h-12" : isSmall ? "h-8" : "h-10"}`}
              >
                <Plus className={`${isSmall ? "h-3 w-3" : "h-4 w-4"} ${isSmall ? "" : "mr-2"}`} />
                {!isSmall && "Add"}
              </Button>
            )}
          </div>

          {showEnhancement && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>AI will enhance and categorize your task</span>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-2 w-2 mr-1" />
                Smart
              </Badge>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}