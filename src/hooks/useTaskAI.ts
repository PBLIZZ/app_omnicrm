import { useMutation } from "@tanstack/react-query";
import { categorizeTask } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

export interface AICategorization {
  category: string;
  confidence: number;
}

export function useTaskAI() {
  const { toast } = useToast();

  const categorizeMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      return await categorizeTask(title, description);
    },
    onError: () => {
      toast({
        title: "AI Categorization Failed",
        description: "Unable to get AI suggestion. You can still manually select a category.",
        variant: "destructive",
      });
    },
  });

  return {
    categorizeTask: categorizeMutation.mutate,
    isAnalyzing: categorizeMutation.isPending,
    categorization: categorizeMutation.data,
    error: categorizeMutation.error,
    reset: categorizeMutation.reset,
  };
}
