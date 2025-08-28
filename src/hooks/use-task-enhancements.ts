// Task AI enhancement hook - handles all AI processing for tasks
// Connects to openai.ts and task-enhancement.ts services
// Max 250 lines as per architecture rules

import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { categorizeTask, type CategorySuggestion } from "@/lib/openai";
import { enhanceTaskWithAI, type TaskEnhancementRequest, type TaskEnhancementResponse } from "@/server/ai/task-enhancement";
import { apiRequest } from "@/lib/queryClient";

interface AITaskSuggestion {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes: number;
  suggestedTags: string[];
}

// Hook for AI-powered task enhancements
export function useTaskEnhancements() {
  const { toast } = useToast();

  // Categorize task using OpenAI
  const categorizeMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      return categorizeTask(title, description);
    },
    onError: (error: any) => {
      console.error("Task categorization failed:", error);
      // Don't show toast for categorization failures - fail silently
    },
  });

  // Enhance task with full AI processing
  const enhanceMutation = useMutation({
    mutationFn: async (request: TaskEnhancementRequest) => {
      return enhanceTaskWithAI(request);
    },
    onError: (error: any) => {
      toast({
        title: "AI Enhancement Failed",
        description: "Falling back to basic task creation.",
        variant: "destructive",
      });
      console.error("Task enhancement failed:", error);
    },
  });

  // Get AI suggestions for context-aware recommendations
  const { data: contextSuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ["/api/omni-momentum/ai-suggestions"],
    queryFn: async () => {
      try {
        return apiRequest("/api/omni-momentum/ai-suggestions");
      } catch (error) {
        // Fail silently for suggestions
        return { suggestions: [] };
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });

  // Helper function to get quick category suggestion
  const suggestCategory = async (title: string, description?: string): Promise<CategorySuggestion> => {
    try {
      return await categorizeMutation.mutateAsync({ title, description });
    } catch (error) {
      // Return fallback category on error
      return { category: "personal-wellness", confidence: 0.1 };
    }
  };

  // Helper function to get full AI enhancement
  const enhanceTask = async (request: TaskEnhancementRequest): Promise<TaskEnhancementResponse> => {
    try {
      return await enhanceMutation.mutateAsync(request);
    } catch (error) {
      // Return minimal enhancement on error
      return {
        enhancedTitle: request.title,
        description: `Task: ${request.title}`,
        category: "personal-wellness",
        priority: "medium",
        suggestedTags: [],
        estimatedMinutes: 60,
        aiInsights: {
          reasoning: "AI enhancement unavailable, using defaults",
          businessAlignment: "Standard task",
          urgencyFactors: [],
          suggestions: ["Review and refine task details manually"],
        },
        confidenceLevel: 50,
      };
    }
  };

  // Helper to get wellness-focused AI suggestions based on time/context
  const getContextualSuggestions = (): AITaskSuggestion[] => {
    const suggestions = contextSuggestions?.suggestions || [];
    
    // Add fallback suggestions if API fails
    const fallbackSuggestions: AITaskSuggestion[] = [
      {
        title: "Review today's client sessions",
        description: "Prepare notes and follow-up actions for today's client appointments",
        category: "client-care",
        priority: "high",
        estimatedMinutes: 30,
        suggestedTags: ["client-care", "preparation"],
      },
      {
        title: "Update social media content",
        description: "Create and schedule wellness tips for social media channels",
        category: "content-creation", 
        priority: "medium",
        estimatedMinutes: 45,
        suggestedTags: ["social-media", "content"],
      },
    ];

    return suggestions.length > 0 ? suggestions : fallbackSuggestions;
  };

  // Helper to determine if AI enhancement should be used
  const shouldUseAIEnhancement = (title: string): boolean => {
    // Use AI for vague or short titles that could benefit from enhancement
    return title.length < 50 || 
           !title.includes(" - ") || // No clear structure
           title.split(" ").length < 4; // Very short tasks
  };

  // Helper to extract wellness zone from category
  const mapCategoryToZone = (category: string): string => {
    const zoneMap: Record<string, string> = {
      "client-care": "client-relationships",
      "business-development": "business-growth",
      "administrative": "admin-finance",
      "content-creation": "social-media-marketing",
      "personal-wellness": "personal-selfcare",
    };
    
    return zoneMap[category] || "personal-selfcare";
  };

  // Helper to get priority color for UI
  const getPriorityInsight = (priority: string) => {
    const insights = {
      urgent: { color: "red", message: "Requires immediate attention" },
      high: { color: "orange", message: "Important for business goals" },
      medium: { color: "blue", message: "Standard priority task" },
      low: { color: "green", message: "Complete when time allows" },
    };
    
    return insights[priority as keyof typeof insights] || insights.medium;
  };

  return {
    // Core AI functions
    suggestCategory,
    enhanceTask,
    getContextualSuggestions,
    
    // Helpers
    shouldUseAIEnhancement,
    mapCategoryToZone,
    getPriorityInsight,
    
    // Loading states
    isCategorizing: categorizeMutation.isPending,
    isEnhancing: enhanceMutation.isPending,
    isLoadingSuggestions,
    
    // Data
    contextSuggestions: contextSuggestions?.suggestions || [],
    
    // Mutation objects for advanced usage
    categorizeMutation,
    enhanceMutation,
  };
}